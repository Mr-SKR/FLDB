import type { NextApiRequest, NextApiResponse } from "next";
import { getPlaylistVideos, syncSingleVideo } from "../../services/syncService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  const authHeader = req.headers.authorization;
  const syncSecret = process.env.SYNC_SECRET;

  if (!syncSecret) {
    return res.status(500).json({ message: "SYNC_SECRET is not defined" });
  } else if (authHeader !== `Bearer ${syncSecret}` && req.query.secret !== syncSecret) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const action = req.query.action as string; // 'list' or 'sync'

  try {
    if (action === "list") {
      const pageToken = req.query.pageToken as string | undefined;
      const result = await getPlaylistVideos(pageToken);
      return res.status(200).json(result);
    } 
    
    if (action === "sync") {
      const videoId = req.query.videoId as string;
      const mode = (req.query.mode as "soft" | "hard") || "soft";
      const isVeg = req.query.isVeg === "true";
      
      if (!videoId) {
        return res.status(400).json({ message: "videoId is required for sync action" });
      }

      const result = await syncSingleVideo(videoId, mode, isVeg);
      return res.status(200).json(result);
    }

    return res.status(400).json({ message: "Invalid action. Use 'list' or 'sync'." });
  } catch (error) {
    console.error("Sync API error:", error);
    return res.status(500).json({ 
      message: "Operation failed", 
      error: (error as Error).message 
    });
  }
}
