import type { NextApiRequest } from "next";

/**
 * Best-effort in-memory sliding-window rate limiter.
 *
 * IMPORTANT: on a serverless platform this state lives per instance, so it caps the burst
 * a single instance will serve rather than enforcing a global limit across the fleet. That
 * is still worth having — it blunts credential brute-forcing and caps runaway third-party
 * API spend — but a durable limiter (Vercel Firewall rules, or a Redis/Upstash counter) is
 * the real fix if this endpoint ever becomes a genuine target.
 */

const buckets = new Map<string, number[]>();

/** Stop the map growing without bound on a long-lived instance. */
const MAX_TRACKED_KEYS = 5000;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

export const rateLimit = (key: string, limit: number, windowMs: number): RateLimitResult => {
  const now = Date.now();
  const windowStart = now - windowMs;

  const timestamps = (buckets.get(key) ?? []).filter((t) => t > windowStart);

  if (timestamps.length >= limit) {
    const oldest = timestamps[0];
    return {
      allowed: false,
      retryAfterSeconds: Math.max(1, Math.ceil((oldest + windowMs - now) / 1000)),
    };
  }

  timestamps.push(now);

  if (!buckets.has(key) && buckets.size >= MAX_TRACKED_KEYS) {
    // Map iteration is insertion-ordered, so this evicts the earliest-seen key.
    const oldestKey = buckets.keys().next().value;
    if (oldestKey !== undefined) buckets.delete(oldestKey);
  }
  buckets.set(key, timestamps);

  return { allowed: true, retryAfterSeconds: 0 };
};

/** Identifies the caller for rate-limiting purposes. */
export const getClientKey = (req: NextApiRequest): string => {
  const forwarded = req.headers["x-forwarded-for"];
  const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
  // x-forwarded-for is a comma-separated chain; the client is the first entry.
  return raw?.split(",")[0].trim() || req.socket.remoteAddress || "unknown";
};
