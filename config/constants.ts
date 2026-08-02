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
 * Canonical public origin. Server-side code should prefer `process.env.HOST` and fall
 * back to this; it is deliberately a plain string so it is also safe in client bundles.
 */
export const SITE_URL = "https://foodloversdatabase.com";
