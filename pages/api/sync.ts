import type { NextApiRequest, NextApiResponse } from "next";
import { getPlaylistVideos, syncSingleVideo } from "../../services/syncService";
import { syncConfig } from "../../config/syncConfig";
import { env } from "../../lib/env";
import { logger } from "../../lib/logger";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const method = req.method;
  if (method !== "POST" && method !== "GET") {
    logger.warn(`Method ${method} not allowed on sync API`, "syncAPI");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  const syncSecret = env.SYNC_SECRET;

  if (authHeader !== `Bearer ${syncSecret}` && req.query.secret !== syncSecret) {
    logger.warn("Unauthorized sync attempt", "syncAPI", { 
      ip: req.headers['x-forwarded-for'] || req.socket.remoteAddress 
    });
    return res.status(401).json({ message: "Unauthorized" });
  }

  const action = req.query.action as string; // 'list', 'sync', or 'get-sources'

  try {
    if (action === "get-sources") {
      logger.info("Executing get-sources action", "syncAPI");
      return res.status(200).json(syncConfig.sources);
    }

    if (action === "list") {
      logger.info("Executing list action", "syncAPI");
      const pageToken = req.query.pageToken as string | undefined;
      const playlistId = req.query.playlistId as string | undefined;
      const result = await getPlaylistVideos(playlistId, pageToken);
      return res.status(200).json(result);
    } 
    
    if (action === "sync") {
      const videoId = req.query.videoId as string;
      const mode = (req.query.mode as "soft" | "hard") || "soft";
      const isVeg = req.query.isVeg === "true";
      
      if (!videoId) {
        logger.warn("Sync action requested without videoId", "syncAPI");
        return res.status(400).json({ message: "videoId is required for sync action" });
      }

      logger.info(`Executing sync action for video: ${videoId}`, "syncAPI", { mode, isVeg });
      const result = await syncSingleVideo(videoId, mode, isVeg);
      return res.status(200).json(result);
    }

    logger.warn(`Invalid action requested: ${action}`, "syncAPI");
    return res.status(400).json({ message: "Invalid action. Use 'list', 'sync', or 'get-sources'." });
  } catch (error) {
    logger.error(`Sync API operation failed: ${action}`, "syncAPI", error);
    return res.status(500).json({ 
      message: "Operation failed", 
      error: (error as Error).message 
    });
  }
}
