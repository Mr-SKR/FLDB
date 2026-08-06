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
 * configuring an environment: `HOST` is the bind address on many Node hosts, so a
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

/**
 * Orderings the feed offers, shared by the API and the client.
 *
 * Defined here rather than in either of them because both must agree exactly: the client
 * puts these strings in the query string and the API validates against the same list,
 * silently falling back to `nearest` for anything it does not recognise. Two copies of the
 * list would let a renamed mode fail as a no-op rather than as an error, and `config/` is
 * already the module both sides import (it must stay free of Node-only dependencies).
 */
export const SORT_MODES = ["nearest", "rating", "name"] as const;

export type SortMode = (typeof SORT_MODES)[number];

/** Narrows an untrusted value (query string, sessionStorage) to a known ordering. */
export const isSortMode = (value: unknown): value is SortMode =>
  SORT_MODES.includes(value as SortMode);

/** The ordering used when none is chosen or the given one is not recognised. */
export const DEFAULT_SORT_MODE: SortMode = "nearest";

/**
 * The time zone every catalogued place sits in.
 *
 * Used to decide whether a restaurant is open right now. The visitor's own zone is the
 * wrong clock to read: someone planning a Karnataka trip from another country would be
 * told a place is shut when it is mid-service. A single constant is honest about the
 * assumption; if the catalogue ever spans zones this has to become per-place data.
 */
export const PLACES_TIME_ZONE = "Asia/Kolkata";
