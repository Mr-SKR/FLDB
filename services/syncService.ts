import { google, youtube_v3 } from "googleapis";
import { Client } from "@googlemaps/google-maps-services-js";
import sharp from "sharp";
import dbConnect from "../lib/dbConnect";
import Video from "../models/Video";
import Place from "../models/Place";
import { syncConfig } from "../config/syncConfig";
import { fetchLocationDetails } from "../lib/locationDetails";
import { slugify } from "../utils/slugify";
import { env } from "../lib/env";
import { logger } from "../lib/logger";
import { PlaceInterface, VideoInterface } from "../types/types";
import { sleep } from "../utils/sleep";

const youtube: youtube_v3.Youtube = google.youtube("v3");
const googleMapsClient = new Client({});

/**
 * Downloads a photo from Google Maps and encodes it to a Base64 data URL.
 * Resizes to max 480px to save database space.
 */
const fetchAndEncodePlacePhoto = async (photoReference: string): Promise<string | undefined> => {
  if (!photoReference) return undefined;
  
  const apiKey = env.GOOGLE_MAPS_API_KEY;
  
  try {
    const response = await googleMapsClient.placePhoto({
      params: {
        photoreference: photoReference,
        maxwidth: 480,
        key: apiKey,
      },
      responseType: "arraybuffer",
    });

    if (response.status !== 200) {
      throw new Error(`Failed to fetch photo: ${response.statusText}`);
    }
    
    // Process with sharp to ensure standard sizing and compression
    const resizedBuffer = await sharp(response.data as ArrayBuffer)
      .resize(480, 480, { fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 80 })
      .toBuffer();

    const base64 = resizedBuffer.toString("base64");
    
    return `data:image/jpeg;base64,${base64}`;
  } catch (err) {
    logger.error("Error fetching and encoding place photo", "syncService", err);
    return undefined;
  }
};

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
 * Rebuilds the searchContent and allThumbnails for a place by aggregating info from its videos.
 * Mutates the passed place document in place.
 */
const updatePlaceSearchContent = async (place: PlaceInterface) => {
  if (!place) return;

  const videos = await Video.find({ videoId: { $in: place.videoIds } });
  const videoTexts = videos.map(v => `${v.videoTitle} ${cleanDescription(v.videoDescription || "")}`).join(" ");
  
  place.searchContent = `${place.name} ${place.formatted_address || ""} ${videoTexts}`.substring(0, 10000); // Cap size
  
  // Update hasVeg based on videos
  place.hasVeg = videos.some(v => v.hasVeg);

  // Update allThumbnails
  const allThumbnails: { small?: string; large?: string; source?: "place" | "youtube" }[] = [];

  // 1. Add Place Photo if available (Stored as Base64)
  if (place.placePhotoBase64 && place.placePhotoBase64 !== "none") {
    allThumbnails.push({
      small: place.placePhotoBase64,
      large: place.placePhotoBase64,
      source: "place"
    });
  }

  // 2. Add YouTube thumbnails
  const videoThumbs = videos
    .map(v => v.thumbnail)
    .filter((t): t is { small: string; large: string } => !!t && (!!t.small || !!t.large))
    .map(t => ({ ...t, source: "youtube" as const }));
  
  allThumbnails.push(...videoThumbs);

  place.allThumbnails = allThumbnails;
  
  // Set main thumbnail to the first available one
  if (allThumbnails.length > 0) {
    place.thumbnail = {
      small: allThumbnails[0].small,
      large: allThumbnails[0].large
    };
  }
};

export const getPlaylistVideos = async (playlistId?: string, pageToken?: string) => {
  logger.info(`Starting to fetch playlist videos from YouTube${playlistId ? ` for playlist ${playlistId}` : ""}`, "syncService");
  const youtubeKey = env.YOUTUBE_API_KEY;

  let videosInPlayLists: youtube_v3.Schema$PlaylistItem[] = [];
  let nextPageToken: string | undefined = undefined;
  let prevPageToken: string | undefined = undefined;

  // Determine which playlists to fetch
  const targetPlaylistIds = playlistId ? [playlistId] : syncConfig.sources.flatMap(s => s.playlists.map(p => p.id));
  const vegPlaylistIds = syncConfig.sources.flatMap(s => s.playlists.filter(p => p.isVeg).map(p => p.id));

  try {
    for (const id of targetPlaylistIds) {
      let currentToken: string | undefined = playlistId ? pageToken : undefined;
      
      do {
        logger.debug(`Fetching items for playlist: ${id}`, "syncService");
        const response = await youtube.playlistItems.list({
          key: youtubeKey,
          part: ["snippet"],
          playlistId: id,
          maxResults: 50,
          pageToken: currentToken,
        });

        videosInPlayLists = videosInPlayLists.concat(response.data.items || []);
        currentToken = response.data.nextPageToken || undefined;
        
        // If a specific playlist was requested, we handle pagination manually by returning the token
        if (playlistId) {
          nextPageToken = currentToken;
          prevPageToken = response.data.prevPageToken || undefined;
          break; 
        }
      } while (currentToken);
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
    nextPageToken,
    prevPageToken
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

    logger.debug(`Extracting location details from description for: ${videoId}`, "syncService");
    const locations = await fetchLocationDetails(video.snippet.description);
    logger.info(`Locations found for ${videoId}: ${locations.length}`, "syncService");

    if (locations.length === 0) {
      logger.info(`SKIPPED: No locations found for video ${videoId}`, "syncService");
      return { status: "skipped", message: "No locations found" };
    }

    await Video.findOneAndUpdate({ videoId: video.id }, videoData, { upsert: true });

    for (const loc of locations) {
      if (!loc.place_id) {
        logger.warn(`Skipping location with no place_id: ${loc.name}`, "syncService");
        continue;
      }

      if (loc.business_status === "CLOSED_PERMANENTLY") {
        logger.info(`SKIPPING: ${loc.name} is CLOSED_PERMANENTLY.`, "syncService");
        continue;
      }

      if (loc.rating === undefined || loc.rating === null) {
        logger.info(`SKIPPING: No rating/reviews found for ${loc.name} (${loc.place_id}).`, "syncService");
        continue;
      }

      logger.debug(`Processing location: ${loc.name} (${loc.place_id})`, "syncService");
      const slug = slugify(loc.name || "");
      const photoRef = loc.photos?.[0]?.photo_reference;

      try {
        let placeDoc = await Place.findOne({ place_id: loc.place_id });
        let placePhotoBase64 = undefined;

        // Optimization: Only fetch photo if we don't already have it, OR if it's a hard sync
        if (photoRef && (!placeDoc || !placeDoc.placePhotoBase64 || mode === "hard")) {
          logger.info(`Fetching photo for ${loc.name}${mode === "hard" ? " (Hard Sync)" : ""}`, "syncService");
          placePhotoBase64 = await fetchAndEncodePlacePhoto(photoRef);
          if (placePhotoBase64) {
            await sleep(500); // Throttling
          }
        }

        const placeData: Partial<PlaceInterface> = {
          place_id: loc.place_id,
          name: loc.name,
          formatted_address: loc.formatted_address,
          geometry: loc.geometry as PlaceInterface["geometry"],
          international_phone_number: loc.international_phone_number,
          rating: loc.rating,
          url: loc.url,
          opening_hours: loc.opening_hours as PlaceInterface["opening_hours"],
          business_status: loc.business_status,
          slug: slug,
          thumbnail: videoData.thumbnail,
          hasVeg: finalHasVeg, // Ensure place gets the hasVeg status
          placePhotoReference: photoRef,
        };

        if (placePhotoBase64) {
          placeData.placePhotoBase64 = placePhotoBase64;
        } else if (photoRef === undefined && (!placeDoc || !placeDoc.placePhotoBase64)) {
          // Explicitly mark as checked if no photo ref available
          placeData.placePhotoBase64 = "none";
        }

        if (placeDoc) {
          if (mode === "hard") {
            logger.info(`Updating existing Place data for: ${loc.name}`, "syncService");
            Object.assign(placeDoc, placeData);
          } else {
            // Even in soft sync, ensure hasVeg is updated if it's now true
            if (finalHasVeg) placeDoc.hasVeg = true;
            // Also update photo if missing
            if (placePhotoBase64 && !placeDoc.placePhotoBase64) {
              placeDoc.placePhotoBase64 = placePhotoBase64;
              placeDoc.placePhotoReference = photoRef;
            }
          }
          
          if (!placeDoc.videoIds.includes(videoId)) {
            placeDoc.videoIds.push(videoId);
          }
        } else {
          logger.info(`Creating NEW Place entry for: ${loc.name}`, "syncService");
          placeDoc = new Place({ ...placeData, videoIds: [videoId] });
        }

        await updatePlaceSearchContent(placeDoc);
        await placeDoc.save();

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
