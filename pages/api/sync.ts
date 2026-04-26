import type { NextApiRequest, NextApiResponse } from "next";
import { syncDatabase } from "../../services/syncService";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST" && req.method !== "GET") {
    return res.status(405).json({ message: "Method not allowed" });
  }

  // Basic security: require a SYNC_SECRET in headers or query
  const authHeader = req.headers.authorization;
  const syncSecret = process.env.SYNC_SECRET;

  if (!syncSecret) {
    console.warn("SYNC_SECRET is not defined. Sync endpoint is unprotected. Hence, stopping sync...");
    return res.status(500).json({ message: "SYNC_SECRET is not defined" });
  } else if (authHeader !== `Bearer ${syncSecret}` && req.query.secret !== syncSecret) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const result = await syncDatabase();
    return res.status(200).json(result);
  } catch (error) {
    console.error("Sync handler error:", error);
    return res.status(500).json({ 
      message: "Sync failed", 
      error: (error as Error).message 
    });
  }
}
