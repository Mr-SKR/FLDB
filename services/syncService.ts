import { google, youtube_v3 } from "googleapis";
import dbConnect from "../lib/dbConnect";
import Video from "../models/Video";
import SearchIndex from "../models/SearchIndex";
import { syncConfig } from "../config/syncConfig";
import { fetchLocationDetails } from "../lib/locationDetails";

const youtube = google.youtube("v3");

export const syncDatabase = async () => {
  console.log("Database sync started...");
  const youtubeKey = process.env.YOUTUBE_API_KEY;
  if (!youtubeKey) {
    throw new Error("YOUTUBE_API_KEY is not defined");
  }

  await dbConnect();

  try {
    let videosInPlayLists: youtube_v3.Schema$PlaylistItem[] = [];
    let videosInVegPlaylists: youtube_v3.Schema$PlaylistItem[] = [];
    let vegPlaylistVideoIds: string[] = [];
    let results: any[] = [];

    // 1. Fetch Veg Playlists
    console.log("Fetching vegetarian playlist data...");
    for (const playlistId of syncConfig.vegPlaylistIds) {
      let playlistResponse = await youtube.playlistItems.list({
        key: youtubeKey,
        part: ["snippet"],
        playlistId: playlistId,
        maxResults: 50,
      });
      videosInVegPlaylists = videosInVegPlaylists.concat(playlistResponse.data.items || []);
      
      while (playlistResponse.data.nextPageToken) {
        playlistResponse = await youtube.playlistItems.list({
          key: youtubeKey,
          part: ["snippet"],
          playlistId: playlistId,
          pageToken: playlistResponse.data.nextPageToken,
          maxResults: 50,
        });
        videosInVegPlaylists = videosInVegPlaylists.concat(playlistResponse.data.items || []);
      }
    }

    vegPlaylistVideoIds = videosInVegPlaylists.map(v => v.snippet?.resourceId?.videoId).filter((id): id is string => !!id);
    console.log(`Found ${vegPlaylistVideoIds.length} vegetarian videos.`);

    // 2. Fetch Main Playlists
    console.log("Fetching main playlist data...");
    for (const playlistId of syncConfig.playlistIds) {
      let playlistResponse = await youtube.playlistItems.list({
        key: youtubeKey,
        part: ["snippet"],
        playlistId: playlistId,
        maxResults: 50,
      });
      videosInPlayLists = videosInPlayLists.concat(playlistResponse.data.items || []);
      
      while (playlistResponse.data.nextPageToken) {
        playlistResponse = await youtube.playlistItems.list({
          key: youtubeKey,
          part: ["snippet"],
          playlistId: playlistId,
          pageToken: playlistResponse.data.nextPageToken,
          maxResults: 50,
        });
        videosInPlayLists = videosInPlayLists.concat(playlistResponse.data.items || []);
      }
    }
    console.log(`Total videos found in playlists: ${videosInPlayLists.length}`);

    // 3. Fetch detailed video data and sync
    console.log("Processing videos for synchronization...");
    for (const item of videosInPlayLists) {
      const videoId = item.snippet?.resourceId?.videoId;
      if (!videoId) continue;

      const existingVideo = await SearchIndex.findOne({ videoId });
      if (!existingVideo) {
        console.log(`Syncing new video: ${videoId} - ${item.snippet?.title}`);
        const videoDetailsResponse = await youtube.videos.list({
          key: youtubeKey,
          part: ["snippet"],
          id: [videoId],
        });

        const video = videoDetailsResponse.data.items?.[0];
        if (video?.snippet?.description && video?.snippet?.title) {
          const geodetails = await fetchLocationDetails(video.snippet.description);
          
          const syncResult = {
            videoId: video.id,
            videoTitle: video.snippet.title,
            videoDescription: video.snippet.description,
            hasVeg: vegPlaylistVideoIds.includes(videoId),
            thumbnail: {
              small: video.snippet.thumbnails?.medium?.url,
              large: video.snippet.thumbnails?.maxres?.url || video.snippet.thumbnails?.high?.url,
            },
            name: geodetails.name || video.snippet.title, // Fallback to video title
            ...geodetails,
          };

          try {
            // Save to both collections
            await new Video(syncResult).save();
            await new SearchIndex({
              videoId: syncResult.videoId,
              videoTitle: syncResult.videoTitle,
              title: syncResult.name || syncResult.videoTitle
            }).save();
            
            results.push(syncResult);
            console.log(`Successfully synced: ${videoId}`);
          } catch (saveError) {
            console.error(`Error saving video ${videoId}:`, saveError);
          }
        }
      }
    }

    console.log(`Sync complete! Added ${results.length} new videos.`);
    return {
      success: true,
      added: results.length,
    };
  } catch (err) {
    console.error("Critical sync error:", err);
    throw err;
  }
};
