import { google, youtube_v3 } from "googleapis";
import dbConnect from "../lib/dbConnect";
import Video from "../models/Video";
import Place from "../models/Place";
import { syncConfig } from "../config/syncConfig";
import { fetchLocationDetails } from "../lib/locationDetails";
import { slugify } from "../utils/slugify";

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

export const getPlaylistVideos = async (pageToken?: string) => {
  console.log(">>> [Sync] Starting to fetch playlist videos from YouTube...");
  const youtubeKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeKey) {
    console.error("!!! [Sync] YOUTUBE_API_KEY is missing from environment variables.");
    throw new Error("YOUTUBE_API_KEY is not defined");
  }

  let videosInVegPlaylists: youtube_v3.Schema$PlaylistItem[] = [];
  let videosInPlayLists: youtube_v3.Schema$PlaylistItem[] = [];
  let nextPageToken: string | undefined = undefined;

  try {
    // Fetch Veg Playlist IDs for tagging (fetch all to ensure correct tagging across pages)
    for (const playlistId of syncConfig.vegPlaylistIds) {
      console.log(`--- [Sync] Fetching items for veg playlist: ${playlistId}`);
      let vPageToken: string | undefined = undefined;
      do {
        const vegPlaylistResponse = (await youtube.playlistItems.list({
          key: youtubeKey,
          part: ["snippet"],
          playlistId: playlistId,
          maxResults: 50,
          pageToken: vPageToken,
        })) as unknown as { data: youtube_v3.Schema$PlaylistItemListResponse };
        
        videosInVegPlaylists = videosInVegPlaylists.concat(vegPlaylistResponse.data.items || []);
        vPageToken = vegPlaylistResponse.data.nextPageToken || undefined;
      } while (vPageToken);
    }
  } catch (err) {
    console.error("!!! [Sync] Error fetching vegetarian playlists:", err);
  }

  const vegPlaylistVideoIds = videosInVegPlaylists.map(v => v.snippet?.resourceId?.videoId).filter((id): id is string => !!id);

  try {
    // Fetch Main Playlists - Paginated (assuming 1 main playlist for simplicity of pagination)
    for (const playlistId of syncConfig.playlistIds) {
      console.log(`--- [Sync] Fetching items for main playlist: ${playlistId}`);
      const mainPlaylistResponse = (await youtube.playlistItems.list({
        key: youtubeKey,
        part: ["snippet"],
        playlistId: playlistId,
        maxResults: 50,
        pageToken: pageToken,
      })) as unknown as { data: youtube_v3.Schema$PlaylistItemListResponse };

      videosInPlayLists = videosInPlayLists.concat(mainPlaylistResponse.data.items || []);
      nextPageToken = mainPlaylistResponse.data.nextPageToken || undefined;
      console.log(`+++ [Sync] Retrieved ${mainPlaylistResponse.data.items?.length || 0} items. Next Token: ${nextPageToken}`);
    }
  } catch (err) {
    console.error("!!! [Sync] Error fetching main playlists:", err);
  }

  console.log(`>>> [Sync] Connecting to database to check sync status...`);
  await dbConnect();
  const existingVideoIds = await Video.find({}, "videoId").lean().then(docs => docs.map(d => d.videoId));

  const mappedVideos = videosInPlayLists.map(item => ({
    videoId: item.snippet?.resourceId?.videoId,
    title: item.snippet?.title,
    thumbnail: item.snippet?.thumbnails?.default?.url,
    isVeg: vegPlaylistVideoIds.includes(item.snippet?.resourceId?.videoId || ""),
    isSynced: existingVideoIds.includes(item.snippet?.resourceId?.videoId || ""),
  }));

  return {
    videos: mappedVideos,
    nextPageToken
  };
};

export const syncSingleVideo = async (videoId: string, mode: "soft" | "hard" = "soft", isVeg = false) => {
  console.log(`\n[${videoId}] Starting sync operation. Mode: ${mode.toUpperCase()} (Veg: ${isVeg})`);
  const youtubeKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeKey) throw new Error("YOUTUBE_API_KEY is not defined");

  await dbConnect();

  const existingVideo = await Video.findOne({ videoId });
  if (mode === "soft" && existingVideo) {
    console.log(`[${videoId}] SKIPPED: Already exists in database (Soft Sync).`);
    return { status: "skipped", message: "Video already exists" };
  }

  try {
    console.log(`[${videoId}] Fetching video details from YouTube API...`);
    const videoDetailsResponse = await youtube.videos.list({
      key: youtubeKey,
      part: ["snippet"],
      id: [videoId],
    });

    const video = videoDetailsResponse.data.items?.[0];
    if (!video?.snippet?.description || !video?.snippet?.title || !video?.id) {
      console.error(`[${videoId}] FAILED: YouTube details incomplete.`);
      throw new Error("Video details not found or incomplete");
    }

    console.log(`[${videoId}] Successfully fetched: "${video.snippet.title}"`);

    const videoData = {
      videoId: video.id,
      videoTitle: video.snippet.title,
      videoDescription: video.snippet.description,
      thumbnail: {
        small: video.snippet.thumbnails?.medium?.url,
        large: video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url,
      },
      hasVeg: isVeg,
    };

    console.log(`[${videoId}] Updating Video model in MongoDB...`);
    await Video.findOneAndUpdate({ videoId: video.id }, videoData, { upsert: true });
    console.log(`[${videoId}] Video model updated.`);

    console.log(`[${videoId}] Extracting location details from description...`);
    const locations = await fetchLocationDetails(video.snippet.description);
    console.log(`[${videoId}] Locations found: ${locations.length}`);
    
    for (const loc of locations) {
      if (!loc.place_id) {
        console.warn(`[${videoId}] Skipping location with no place_id: ${loc.name}`);
        continue;
      }

      console.log(`[${videoId}] Processing location: ${loc.name} (${loc.place_id})`);
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
      };

      try {
        const existingPlace = await Place.findOne({ place_id: loc.place_id });
        if (existingPlace) {
          if (mode === "hard") {
            console.log(`[${videoId}] Updating existing Place data for: ${loc.name}`);
            Object.assign(existingPlace, placeData);
          }
          if (!existingPlace.videoIds.includes(videoId)) {
            existingPlace.videoIds.push(videoId);
          }
          await existingPlace.save();
        } else {
          console.log(`[${videoId}] Creating NEW Place entry for: ${loc.name}`);
          await new Place({ ...placeData, videoIds: [videoId] }).save();
        }

        // Rebuild search content for the place by aggregating all linked video descriptions
        await updatePlaceSearchContent(loc.place_id);
      } catch (placeErr) {
        console.error(`[${videoId}] Error saving place ${loc.name}:`, placeErr);
      }
    }

    console.log(`[${videoId}] SYNC COMPLETE. Success.`);
    return { status: "success", locationsFound: locations.length };
  } catch (error: unknown) {
    console.error(`[${videoId}] SYNC FAILED:`, error instanceof Error ? error.message : error);
    throw error;
  }
};

export const syncDatabase = async (mode: "soft" | "hard" = "soft") => {
    console.log(`>>> [Sync] Starting full database sync (${mode} mode)...`);
    const { videos } = await getPlaylistVideos();
    let count = 0;
    for (const v of videos) {
        if (v.videoId) {
          await syncSingleVideo(v.videoId, mode, v.isVeg);
          count++;
        }
    }
    console.log(`>>> [Sync] Full sync complete. Processed ${count} videos.`);
    return { success: true };
};
