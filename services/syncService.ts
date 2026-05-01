import { google, youtube_v3 } from "googleapis";
import dbConnect from "../lib/dbConnect";
import Video from "../models/Video";
import Place from "../models/Place";
import { syncConfig } from "../config/syncConfig";
import { fetchLocationDetails } from "../lib/locationDetails";
import { slugify } from "../utils/slugify";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import { VideoInterface } from "../types/types";

const youtube: youtube_v3.Youtube = google.youtube("v3");

/**
 * Cleans video description by removing URLs and extra noise for search indexing.
 */
const cleanDescription = (text: string) => {
  return text
    .replace(/https?:\/\/[^\s]+/g, "") // Remove URLs
    .replace(/[^\w\s\u00C0-\u017F]/g, " ") // Remove special chars but keep accented ones
    .replace(/\s+/g, " ") // Normalize spaces
    .trim();
};

/**
 * Rebuilds the searchContent for a place by aggregating info from its videos.
 */
const updatePlaceSearchContent = async (placeId: string) => {
  const place = await Place.findOne({ place_id: placeId });
  if (!place) return;

  const videos = await Video.find({ videoId: { $in: place.videoIds } });
  const videoTexts = videos.map(v => `${v.videoTitle} ${cleanDescription(v.videoDescription || "")}`).join(" ");
  
  place.searchContent = `${place.name} ${place.formatted_address || ""} ${videoTexts}`.substring(0, 10000); // Cap size
  
  // Update hasVeg based on videos
  place.hasVeg = videos.some(v => v.hasVeg);
  
  await place.save();
};

export const getPlaylistVideos = async (playlistId?: string, pageToken?: string) => {
  logger.info(`Starting to fetch playlist videos from YouTube${playlistId ? ` for playlist ${playlistId}` : ""}`, "syncService");
  const youtubeKey = env.YOUTUBE_API_KEY;

  let videosInPlayLists: youtube_v3.Schema$PlaylistItem[] = [];
  let nextPageToken: string | undefined = undefined;

  // Determine which playlists to fetch
  const playlistsToFetch = playlistId 
    ? [{ id: playlistId, isVeg: false }] // If specific playlist, we don't know if it's veg unless we check config
    : syncConfig.sources.flatMap(s => s.playlists);

  // If we are fetching multiple playlists, we need a way to identify which ones are veg
  const vegPlaylistIds = syncConfig.sources.flatMap(s => s.playlists.filter(p => p.isVeg).map(p => p.id));

  try {
    // If a specific playlistId is provided, we only fetch that one
    const targetPlaylistIds = playlistId ? [playlistId] : syncConfig.sources.flatMap(s => s.playlists.map(p => p.id));

    for (const id of targetPlaylistIds) {
      logger.debug(`Fetching items for playlist: ${id}`, "syncService");
      const response = (await youtube.playlistItems.list({
        key: youtubeKey,
        part: ["snippet"],
        playlistId: id,
        maxResults: 50,
        pageToken: pageToken,
      })) as unknown as { data: youtube_v3.Schema$PlaylistItemListResponse };

      videosInPlayLists = videosInPlayLists.concat(response.data.items || []);
      nextPageToken = response.data.nextPageToken || undefined;
      
      // If we are paginating and got a nextPageToken, we stop here for this playlist to return to user
      if (nextPageToken && targetPlaylistIds.length > 1) {
        break; 
      }
    }
  } catch (err) {
    logger.error("Error fetching playlists", "syncService", err);
  }

  await dbConnect();
  const existingVideoIds = await Video.find({}, "videoId").lean().then(docs => docs.map(d => d.videoId));

  interface MappedVideo {
    videoId: string;
    title?: string | null;
    thumbnail?: string | null;
    isVeg: boolean;
    isSynced: boolean;
    channelTitle?: string | null;
    channelId?: string | null;
  }

  // Deduplicate and prioritize isVeg
  const videoMap = new Map<string, MappedVideo>();

  for (const item of videosInPlayLists) {
    const vId = item.snippet?.resourceId?.videoId;
    if (!vId) continue;

    const isVeg = vegPlaylistIds.includes(item.snippet?.playlistId || "");
    
    const existing = videoMap.get(vId);
    if (existing) {
      if (isVeg) existing.isVeg = true;
    } else {
      videoMap.set(vId, {
        videoId: vId,
        title: item.snippet?.title,
        thumbnail: item.snippet?.thumbnails?.default?.url,
        isVeg: isVeg,
        isSynced: existingVideoIds.includes(vId),
        channelTitle: item.snippet?.channelTitle,
        channelId: item.snippet?.channelId,
      });
    }
  }

  const mappedVideos = Array.from(videoMap.values());

  return {
    videos: mappedVideos,
    nextPageToken
  };
};

export const syncSingleVideo = async (videoId: string, mode: "soft" | "hard" = "soft", isVeg = false) => {
  logger.info(`Starting sync operation for video: ${videoId}`, "syncService", { mode, isVeg });
  const youtubeKey = env.YOUTUBE_API_KEY;

  await dbConnect();

  const existingVideo = await Video.findOne({ videoId });
  
  // If soft sync and video exists, check if we need to upgrade to hasVeg
  if (mode === "soft" && existingVideo) {
    if (isVeg && !existingVideo.hasVeg) {
      logger.info(`UPGRADING: Video ${videoId} exists but now identified as Veg. Updating hasVeg to true.`, "syncService");
      existingVideo.hasVeg = true;
      await existingVideo.save();
      
      // Update all associated places' hasVeg status
      await Place.updateMany({ videoIds: videoId }, { hasVeg: true });
      return { status: "updated", message: "Video upgraded to Veg status" };
    }
    
    logger.info(`SKIPPED: Video ${videoId} already exists in database (Soft Sync)`, "syncService");
    return { status: "skipped", message: "Video already exists" };
  }

  try {
    logger.debug(`Fetching video details from YouTube API for: ${videoId}`, "syncService");
    const videoDetailsResponse = await youtube.videos.list({
      key: youtubeKey,
      part: ["snippet"],
      id: [videoId],
    });

    const video = videoDetailsResponse.data.items?.[0];
    if (!video?.snippet?.description || !video?.snippet?.title || !video?.id) {
      logger.error(`FAILED: YouTube details incomplete for ${videoId}`, "syncService");
      throw new Error(`Video details not found or incomplete for ${videoId}`);
    }

    logger.info(`Successfully fetched: "${video.snippet.title}" from channel: "${video.snippet.channelTitle}"`, "syncService");

    const finalHasVeg = isVeg || (existingVideo?.hasVeg ?? false);

    const videoData: Partial<VideoInterface> = {
      videoId: video.id,
      videoTitle: video.snippet.title || "",
      videoDescription: video.snippet.description || undefined,
      channelId: video.snippet.channelId || undefined,
      channelTitle: video.snippet.channelTitle || undefined,
      thumbnail: {
        small: video.snippet.thumbnails?.medium?.url || undefined,
        large: video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url || undefined,
      },
      hasVeg: finalHasVeg,
    };

    await Video.findOneAndUpdate({ videoId: video.id }, videoData, { upsert: true });

    logger.debug(`Extracting location details from description for: ${videoId}`, "syncService");
    const locations = await fetchLocationDetails(video.snippet.description);
    logger.info(`Locations found for ${videoId}: ${locations.length}`, "syncService");
    
    for (const loc of locations) {
      if (!loc.place_id) {
        logger.warn(`Skipping location with no place_id: ${loc.name}`, "syncService");
        continue;
      }

      logger.debug(`Processing location: ${loc.name} (${loc.place_id})`, "syncService");
      const slug = slugify(loc.name || "");
      const placeData = {
        place_id: loc.place_id,
        name: loc.name,
        formatted_address: loc.formatted_address,
        geometry: loc.geometry,
        international_phone_number: loc.international_phone_number,
        rating: loc.rating,
        url: loc.url,
        opening_hours: loc.opening_hours,
        business_status: loc.business_status,
        slug: slug,
        thumbnail: videoData.thumbnail,
        hasVeg: finalHasVeg, // Ensure place gets the hasVeg status
      };

      try {
        const existingPlace = await Place.findOne({ place_id: loc.place_id });
        if (existingPlace) {
          if (mode === "hard") {
            logger.info(`Updating existing Place data for: ${loc.name}`, "syncService");
            Object.assign(existingPlace, placeData);
          } else {
            // Even in soft sync, ensure hasVeg is updated if it's now true
            if (finalHasVeg) existingPlace.hasVeg = true;
          }
          
          if (!existingPlace.videoIds.includes(videoId)) {
            existingPlace.videoIds.push(videoId);
          }
          await existingPlace.save();
        } else {
          logger.info(`Creating NEW Place entry for: ${loc.name}`, "syncService");
          await new Place({ ...placeData, videoIds: [videoId] }).save();
        }

        await updatePlaceSearchContent(loc.place_id);
      } catch (placeErr) {
        logger.error(`Error saving place ${loc.name} for video ${videoId}`, "syncService", placeErr);
      }
    }

    logger.info(`SYNC COMPLETE for video: ${videoId}`, "syncService");
    return { status: "success", locationsFound: locations.length };
  } catch (error: unknown) {
    logger.error(`SYNC FAILED for video: ${videoId}`, "syncService", error);
    throw error;
  }
};

export const syncDatabase = async (mode: "soft" | "hard" = "soft") => {
    logger.info(`Starting full database sync in ${mode} mode`, "syncService");
    const { videos } = await getPlaylistVideos();
    let count = 0;
    for (const v of videos) {
        if (v.videoId) {
          try {
            await syncSingleVideo(v.videoId, mode, v.isVeg);
            count++;
          } catch (err) {
            logger.error(`Failed to sync video during full sync: ${v.videoId}`, "syncService", err);
          }
        }
    }
    logger.info(`Full sync complete. Processed ${count} videos`, "syncService");
    return { success: true, processedCount: count };
};
