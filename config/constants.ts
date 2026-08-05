export const PAGE_SIZE = 10;

/** How often to silently re-check the user's position while the tab is visible. */
export const LOCATION_REFRESH_MS = 60_000;

/**
 * Ignore GPS jitter below this distance (~25 m). A stationary device reports slightly
 * different coordinates on every fix; publishing those would invalidate downstream
 * callbacks and throw away the user's accumulated feed.
 */
export const LOCATION_MOVEMENT_THRESHOLD_KM = 0.025;

/** Stop the silent refresh loop after this many consecutive failures. */
export const LOCATION_MAX_SILENT_FAILURES = 3;

/**
 * Canonical public origin, and the last fallback in `getSiteUrl()`.
 *
 * Resolution order lives in `lib/seo.ts`: `NEXT_PUBLIC_SITE_URL` first, then `HOST` for
 * compatibility with existing deployments, then this. Prefer `NEXT_PUBLIC_SITE_URL` when
 * configuring an environment — `HOST` is the bind address on many Node hosts, so a
 * platform setting `HOST=0.0.0.0` would silently rewrite every canonical URL on the site.
 *
 * Deliberately a plain string so it is also safe in client bundles.
 */
export const SITE_URL = "https://foodloversdatabase.com";

/** Full brand name. Used in titles, JSON-LD and `og:site_name`. */
export const SITE_NAME = "Food Lovers Database";

/** Short brand name, used as the title suffix so titles stay under the SERP width. */
export const SITE_SHORT_NAME = "FLDb";

/**
 * Default meta description, used for pages that do not supply their own.
 * Kept under ~160 characters so search engines show it whole rather than truncating.
 */
export const SITE_DESCRIPTION =
  "Discover restaurants featured by India's best food vloggers. Search hundreds of reviewed " +
  "places, sort by what's nearest to you, and get directions in one tap.";

export const SITE_LOCALE = "en_IN";

/** How many nearby places to cross-link from a place page. */
export const NEARBY_PLACES_COUNT = 6;
