import crypto from "crypto";
import type { NextApiRequest, NextApiResponse } from "next";
import {
  getPlaylistVideos,
  syncSingleVideo,
  backfillPlacePhotos,
  cleanupPlacePhotoBlobs,
} from "../../services/syncService";
import { syncConfig } from "../../config/syncConfig";
import { logger } from "../../lib/logger";
import { rateLimit, getClientKey } from "../../lib/rateLimit";

/** Tight budget applied before authentication; guards against brute-forcing the secret. */
const PRE_AUTH_LIMIT = 10;
const PRE_AUTH_WINDOW_MS = 60_000;

/** Looser budget applied after authentication; caps third-party API spend if the secret leaks. */
const POST_AUTH_LIMIT = 30;
const POST_AUTH_WINDOW_MS = 60_000;

/** Read-only actions may be fetched with GET; anything that mutates state requires POST. */
const READ_ONLY_ACTIONS = new Set(["list", "get-sources"]);

/**
 * Minimum secret length accepted in production.
 *
 * A short secret is tolerated in development so local syncing is not disrupted, but a
 * deployment must never expose this endpoint behind a brute-forceable value.
 */
const MIN_PRODUCTION_SECRET_LENGTH = 16;

/**
 * Resolves the sync secret, or null when sync is disabled for this deployment.
 *
 * By design `SYNC_SECRET` is NOT set on the production deployment, because syncing is run locally
 * against the production database. That makes this endpoint inert once deployed: it can
 * neither spend Google API quota nor write to the database or blob store.
 *
 * This check reads process.env directly and explicitly, rather than relying on the side
 * effect of `env.SYNC_SECRET` throwing, so the fail-closed behaviour survives any future
 * refactor of lib/env.ts. If you ever automate syncing (a Vercel Cron, say) and therefore
 * have to set the secret in the deployment, generate a long random one:
 *   openssl rand -base64 32
 */
const resolveSyncSecret = (): { secret: string } | { disabled: true; reason: string } => {
  const secret = process.env.SYNC_SECRET;

  if (!secret) {
    return { disabled: true, reason: "SYNC_SECRET is not set, so sync is disabled here" };
  }

  if (process.env.NODE_ENV === "production" && secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
    return {
      disabled: true,
      reason:
        `SYNC_SECRET is only ${secret.length} characters; production requires at least ` +
        `${MIN_PRODUCTION_SECRET_LENGTH}. Generate one with: openssl rand -base64 32`,
    };
  }

  if (secret.length < MIN_PRODUCTION_SECRET_LENGTH) {
    logger.warn(
      `SYNC_SECRET is only ${secret.length} characters. Tolerated in development, but this ` +
      `endpoint would refuse to run in production.`,
      "syncAPI"
    );
  }

  return { secret };
};

/**
 * Compares two secrets without leaking their contents through timing.
 * Length is compared without an early return so mismatched lengths cost the same.
 */
const secretsMatch = (provided: string, expected: string): boolean => {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    crypto.timingSafeEqual(a, a);
    return false;
  }
  return crypto.timingSafeEqual(a, b);
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const method = req.method;
  if (method !== "POST" && method !== "GET") {
    logger.warn(`Method ${method} not allowed on sync API`, "syncAPI");
    return res.status(405).json({ message: "Method not allowed" });
  }

  const clientKey = getClientKey(req);

  const preAuth = rateLimit(`sync:pre:${clientKey}`, PRE_AUTH_LIMIT, PRE_AUTH_WINDOW_MS);
  if (!preAuth.allowed) {
    logger.warn("Rate limit exceeded on sync API (pre-auth)", "syncAPI", { ip: clientKey });
    res.setHeader("Retry-After", String(preAuth.retryAfterSeconds));
    return res.status(429).json({ message: "Too many requests" });
  }

  const resolved = resolveSyncSecret();
  if ("disabled" in resolved) {
    logger.warn(`Sync request rejected: ${resolved.reason}`, "syncAPI", { ip: clientKey });
    return res.status(503).json({ message: "Sync is not configured on this deployment" });
  }
  const syncSecret = resolved.secret;

  const authHeader = req.headers.authorization ?? "";
  const bearerPrefix = "Bearer ";
  const providedSecret = authHeader.startsWith(bearerPrefix)
    ? authHeader.slice(bearerPrefix.length)
    : "";

  if (!secretsMatch(providedSecret, syncSecret)) {
    logger.warn("Unauthorized sync attempt", "syncAPI", { ip: clientKey });
    return res.status(401).json({ message: "Unauthorized" });
  }

  const postAuth = rateLimit(`sync:post:${clientKey}`, POST_AUTH_LIMIT, POST_AUTH_WINDOW_MS);
  if (!postAuth.allowed) {
    logger.warn("Rate limit exceeded on sync API (post-auth)", "syncAPI", { ip: clientKey });
    res.setHeader("Retry-After", String(postAuth.retryAfterSeconds));
    return res.status(429).json({ message: "Too many requests" });
  }

  const action = req.query.action as string; // 'list', 'sync', or 'get-sources'

  if (!READ_ONLY_ACTIONS.has(action) && method !== "POST") {
    logger.warn(`Action '${action}' requires POST but was called with ${method}`, "syncAPI");
    return res.status(405).json({ message: `Action '${action}' must be called with POST` });
  }

  try {
    if (action === "get-sources") {
      logger.info("Executing get-sources action", "syncAPI");
      return res.status(200).json(syncConfig.sources);
    }

    if (action === "list") {
      const pageToken = req.query.pageToken as string | undefined;
      const playlistId = req.query.playlistId as string | undefined;

      // Required, not optional. Omitting it used to mean "every configured playlist",
      // which walked all of them to exhaustion in a single request: dozens of YouTube
      // quota units spent on a response the paginated UI cannot use.
      if (!playlistId) {
        logger.warn("List action requested without playlistId", "syncAPI");
        return res.status(400).json({ message: "playlistId is required for list action" });
      }

      logger.info(`Executing list action for playlist ${playlistId}`, "syncAPI");
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

    if (action === "backfill-photos") {
      const limit = Math.min(parseInt(req.query.limit as string) || 25, 50);
      const cursor = req.query.cursor as string | undefined;

      logger.info(`Executing photo backfill (limit ${limit})`, "syncAPI", { cursor });
      const result = await backfillPlacePhotos(limit, cursor);
      return res.status(200).json(result);
    }

    if (action === "cleanup-photo-blobs") {
      logger.info("Executing photo blob cleanup", "syncAPI");
      const result = await cleanupPlacePhotoBlobs();
      return res.status(200).json(result);
    }

    logger.warn(`Invalid action requested: ${action}`, "syncAPI");
    return res.status(400).json({
      message:
        "Invalid action. Use 'list', 'sync', 'get-sources', 'backfill-photos', or 'cleanup-photo-blobs'.",
    });
  } catch (error) {
    // Log the detail; never return driver/internal messages to the caller.
    logger.error(`Sync API operation failed: ${action}`, "syncAPI", error);
    return res.status(500).json({ message: "Operation failed" });
  }
}
