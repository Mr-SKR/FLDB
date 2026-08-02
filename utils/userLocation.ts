import { logger } from "../lib/logger";

/**
 * Fast profile: accepts a recent cached fix and does not power up GPS.
 *
 * Ranking restaurants by distance does not need metre-level precision, and forcing a
 * fresh high-accuracy fix (maximumAge: 0) costs several seconds on every page load —
 * during which the feed can only show the default, non-local ordering.
 */
const geoSettingsFast: PositionOptions = {
  enableHighAccuracy: false,
  timeout: 8000,
  maximumAge: 300000, // a fix from the last 5 minutes is plenty for distance sorting
};

/** Precise profile: forces a fresh, high-accuracy fix. Used when the user explicitly asks. */
const geoSettingsPrecise: PositionOptions = {
  enableHighAccuracy: true,
  timeout: 10000,
  maximumAge: 0,
};

const getPosition = (options: PositionOptions): Promise<GeolocationPosition> =>
  new Promise((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, options)
  );

/**
 * Resolves the user's position, preferring speed over precision by default.
 *
 * @param precise When true, force a fresh high-accuracy fix. Reserve this for
 *   user-initiated refreshes; background and first-load acquisition should stay fast.
 */
const getAccurateLocation = async (precise = false): Promise<GeolocationPosition> => {
  const [primary, fallback] = precise
    ? [geoSettingsPrecise, geoSettingsFast]
    : [geoSettingsFast, geoSettingsPrecise];

  try {
    return await getPosition(primary);
  } catch (err) {
    logger.warn(
      `Geolocation failed (${(err as GeolocationPositionError).message}); retrying with fallback settings...`,
      "userLocation"
    );
    return getPosition(fallback);
  }
};

export { getAccurateLocation };
