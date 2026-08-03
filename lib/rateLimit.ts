import type { NextApiRequest } from "next";

/**
 * Best-effort in-memory sliding-window rate limiter.
 *
 * IMPORTANT: on a serverless platform this state lives per instance, so it caps the burst
 * a single instance will serve rather than enforcing a global limit across the fleet. That
 * is still worth having: it blunts credential brute-forcing and caps runaway third-party
 * API spend, but a durable limiter (Vercel Firewall rules, or a Redis/Upstash counter) is
 * the real fix if this endpoint ever becomes a genuine target.
 */

const buckets = new Map<string, number[]>();

/** Stop the map growing without bound on a long-lived instance. */
const MAX_TRACKED_KEYS = 5000;

/**
 * A bucket stops constraining anything `windowMs` after its last hit, so past that point it
 * is pure memory. This bound must comfortably exceed the largest window any caller passes
 * (both are 60s today); a sweep that ran early would hand a still-limited caller a fresh
 * budget.
 */
const MAX_WINDOW_MS = 5 * 60_000;

/** How often the expiry sweep is allowed to run. */
const SWEEP_INTERVAL_MS = 60_000;

let lastSweptAt = 0;

export interface RateLimitResult {
  allowed: boolean;
  retryAfterSeconds: number;
}

/** Most recent hit recorded against a bucket; 0 for an empty one. */
const lastHit = (timestamps: number[]): number => timestamps[timestamps.length - 1] ?? 0;

/**
 * Reclaims buckets nobody has touched in a while.
 *
 * Without this the map only ever shrank under eviction pressure, so a long-lived instance
 * held a bucket for every IP it had ever seen, including the overwhelming majority that
 * made one request and left.
 */
const sweepExpired = (now: number) => {
  if (now - lastSweptAt < SWEEP_INTERVAL_MS) return;
  lastSweptAt = now;

  for (const [key, timestamps] of buckets) {
    if (now - lastHit(timestamps) > MAX_WINDOW_MS) buckets.delete(key);
  }
};

/**
 * Drops the bucket that has gone longest without a request.
 *
 * The previous version evicted the earliest-*inserted* key instead. `Map.set` on an
 * existing key does not change its position in iteration order, so that key was typically
 * the longest-lived (and therefore the most active) caller in the map: precisely the one
 * whose budget must not be reset. Evicting by staleness targets the callers that have
 * actually gone quiet.
 */
const evictLeastRecentlyActive = () => {
  let stalestKey: string | undefined;
  let stalestHit = Infinity;

  for (const [key, timestamps] of buckets) {
    const hit = lastHit(timestamps);
    if (hit < stalestHit) {
      stalestHit = hit;
      stalestKey = key;
    }
  }

  if (stalestKey !== undefined) buckets.delete(stalestKey);
};

export const rateLimit = (key: string, limit: number, windowMs: number): RateLimitResult => {
  const now = Date.now();
  sweepExpired(now);

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
    evictLeastRecentlyActive();
  }
  buckets.set(key, timestamps);

  return { allowed: true, retryAfterSeconds: 0 };
};

const firstHeaderValue = (value: string | string[] | undefined): string | undefined => {
  const raw = Array.isArray(value) ? value[0] : value;
  return raw?.trim() || undefined;
};

/**
 * Identifies the caller for rate-limiting purposes.
 *
 * Deliberately does NOT read the first entry of `x-forwarded-for`. That entry is whatever
 * the client sent: any hop that appends rather than replaces the header leaves it fully
 * attacker-controlled, so keying on it lets a caller rotate a spoofed value and bypass the
 * limiter entirely, including the pre-auth budget that is the only thing making
 * `SYNC_SECRET` expensive to brute-force.
 *
 * Preference order, most trustworthy first:
 *  1. `x-vercel-forwarded-for` / `x-real-ip`: set by the platform edge, which overwrites
 *     any client-supplied value.
 *  2. The LAST entry of `x-forwarded-for`: appended by the closest trusted proxy. A client
 *     can prepend entries but cannot append past the proxy that adds its own.
 *  3. The socket address, for local development where no proxy is involved.
 *
 * NOTE the deployment assumption: (1) is only trustworthy because Vercel's edge rewrites
 * those headers. If this app is ever served directly to the internet without such a proxy,
 * every header here becomes client-controlled again and only `req.socket.remoteAddress` is
 * meaningful, and this function would need to drop straight to it.
 */
export const getClientKey = (req: NextApiRequest): string => {
  const platformIp =
    firstHeaderValue(req.headers["x-vercel-forwarded-for"]) ??
    firstHeaderValue(req.headers["x-real-ip"]);
  if (platformIp) return platformIp;

  const forwarded = firstHeaderValue(req.headers["x-forwarded-for"]);
  const chain = forwarded?.split(",").map((entry) => entry.trim()).filter(Boolean) ?? [];
  const nearestHop = chain[chain.length - 1];

  return nearestHop || req.socket.remoteAddress || "unknown";
};
