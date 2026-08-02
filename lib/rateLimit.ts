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
 * limiter entirely — including the pre-auth budget that is the only thing making
 * `SYNC_SECRET` expensive to brute-force.
 *
 * Preference order, most trustworthy first:
 *  1. `x-vercel-forwarded-for` / `x-real-ip` — set by the platform edge, which overwrites
 *     any client-supplied value.
 *  2. The LAST entry of `x-forwarded-for` — appended by the closest trusted proxy. A client
 *     can prepend entries but cannot append past the proxy that adds its own.
 *  3. The socket address, for local development where no proxy is involved.
 *
 * NOTE the deployment assumption: (1) is only trustworthy because Vercel's edge rewrites
 * those headers. If this app is ever served directly to the internet without such a proxy,
 * every header here becomes client-controlled again and only `req.socket.remoteAddress` is
 * meaningful — this function would need to drop straight to it.
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
