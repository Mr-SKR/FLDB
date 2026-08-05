import { useState, useEffect, useCallback, useRef } from "react";
import { getAccurateLocation } from "../utils/userLocation";
import { getDisplacementFromLatLonInKm } from "../utils/getGeoDisplacement";
import { logger } from "../lib/logger";
import {
  LOCATION_REFRESH_MS,
  LOCATION_MOVEMENT_THRESHOLD_KM,
  LOCATION_MAX_SILENT_FAILURES,
} from "../config/constants";

export interface UserLocation {
  lat: number;
  long: number;
  lastUpdated: number;
}

export type LocationPermission = "granted" | "denied" | "prompt" | "unsupported";

export const useGeolocation = () => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [permissionState, setPermissionState] = useState<LocationPermission | null>(null);
  /**
   * True only while we know a position is on its way (permission already granted) but it
   * has not arrived yet. Starts false so the server-rendered feed is what gets painted;
   * flipping it to true on the client is what suppresses the misleading default ordering.
   */
  const [locationPending, setLocationPending] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRefreshingRef = useRef(false);
  const silentFailuresRef = useRef(0);
  const lastFixRef = useRef<UserLocation | null>(null);

  const refreshLocation = useCallback(async (silent = false) => {
    // getAccurateLocation chains a 10s high-accuracy attempt into a 10s low-accuracy
    // fallback, so one call can stay pending for ~20s while the interval keeps firing.
    // Never let two run concurrently.
    if (isRefreshingRef.current) return false;
    isRefreshingRef.current = true;

    if (!silent) setLoading(true);
    setError(null);
    try {
      // A user-initiated refresh justifies a slow, precise fix; background and
      // first-load acquisition use the fast profile so the feed can sort immediately.
      const location = await getAccurateLocation(!silent);
      const newLocation = {
        lat: location.coords.latitude,
        long: location.coords.longitude,
        lastUpdated: location.timestamp,
      };
      silentFailuresRef.current = 0;

      const previous = lastFixRef.current;
      const moved =
        !previous ||
        getDisplacementFromLatLonInKm(
          previous.lat,
          previous.long,
          newLocation.lat,
          newLocation.long
        ) >= LOCATION_MOVEMENT_THRESHOLD_KM;

      lastFixRef.current = newLocation;
      sessionStorage.setItem("userLocation", JSON.stringify(newLocation));

      // Only publish a new object when the user actually moved. Emitting a fresh
      // identity on every tick invalidates the fetch callback in usePlaceFilters,
      // which re-fetches page 1 and discards everything the user has scrolled through.
      if (moved) setUserLocation(newLocation);

      return true;
    } catch (err) {
      if (silent) {
        silentFailuresRef.current += 1;
        if (silentFailuresRef.current >= LOCATION_MAX_SILENT_FAILURES) {
          logger.warn(
            `Silent location refresh failed ${silentFailuresRef.current} times; stopping auto-refresh.`,
            "useGeolocation"
          );
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } else {
        const error = err as GeolocationPositionError;
        let message = "Could not get your location.";
        if (error.code === 1) {
          message = "Location permission denied. Please enable it in your browser settings.";
        } else if (error.code === 2 || error.message?.includes("kCLErrorLocationUnknown")) {
          message = "Location unavailable. Please check your GPS signal or try again later.";
        } else if (error.code === 3) {
          message = "Location request timed out. Please try again.";
        }
        setError(message);
      }
      return false;
    } finally {
      isRefreshingRef.current = false;
      if (!silent) setLoading(false);
    }
  }, []);

  /**
   * The user asking, explicitly, for their position.
   *
   * Takes no arguments, and that is the whole point. `refreshLocation` is only exposed
   * through this wrapper because the silent flag is its first parameter, and every caller
   * out here is an `onClick`: binding the handler directly passed a MouseEvent as `silent`,
   * and passing a `true` meant to read as "force" did the same thing explicitly. Either way
   * a deliberate request went down the silent path, where a denial or a GPS timeout is
   * counted towards the auto-refresh failure budget and then discarded. The user tapped a
   * button, nothing happened, and no error was ever shown.
   *
   * An arity-0 wrapper makes that unrepresentable rather than merely documented.
   */
  const requestLocation = useCallback(() => refreshLocation(false), [refreshLocation]);

  /**
   * Dismisses the current error.
   *
   * Needed because the only other thing that clears `error` is the start of a refresh, and
   * a denied permission produces no location, so the auto-refresh interval never starts
   * and nothing would ever clear it. The error banner stayed on screen for the rest of the
   * session.
   */
  const clearError = useCallback(() => setError(null), []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setError(null);
    lastFixRef.current = null;
    silentFailuresRef.current = 0;
    sessionStorage.removeItem("userLocation");
    sessionStorage.setItem("skipLocationPrompt", "true");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  /**
   * Resolves the starting position on mount.
   *
   * Order matters for perceived speed: reuse this session's fix if we have one, and
   * otherwise find out whether permission is already granted. When it is, we know a
   * position is coming, so `locationPending` stays true and the caller can suppress the
   * default (non-local) ordering instead of showing it as though it were the answer.
   */
  useEffect(() => {
    let cancelled = false;

    const resolveInitialLocation = async () => {
      const savedLocation = sessionStorage.getItem("userLocation");
      if (savedLocation) {
        try {
          const parsed = JSON.parse(savedLocation);
          if (Number.isFinite(parsed?.lat) && Number.isFinite(parsed?.long)) {
            lastFixRef.current = parsed;
            if (!cancelled) {
              setUserLocation(parsed);
              setPermissionState("granted");
            }
            return;
          }
        } catch (e) {
          logger.error("Failed to parse saved location", "useGeolocation", e);
        }
      }

      if (!navigator.permissions?.query) {
        if (!cancelled) setPermissionState("unsupported");
        return;
      }

      try {
        const result = await navigator.permissions.query({ name: "geolocation" });
        if (cancelled) return;
        setPermissionState(result.state as LocationPermission);

        if (result.state !== "granted") return;

        // Permission is already granted, so a fix is definitely inbound. Hold the
        // pending flag across the acquisition rather than rendering stale ordering.
        setLocationPending(true);
        try {
          await refreshLocation(true);
        } finally {
          if (!cancelled) setLocationPending(false);
        }
      } catch (e) {
        logger.error("Error checking location permissions", "useGeolocation", e);
        if (!cancelled) {
          setPermissionState("unsupported");
          setLocationPending(false);
        }
      }
    };

    resolveInitialLocation();
    return () => {
      cancelled = true;
    };
  }, [refreshLocation]);

  // Auto-refresh while we have a location and the tab is visible.
  const hasLocation = userLocation !== null;
  useEffect(() => {
    if (!hasLocation) return;

    const tick = () => {
      // Don't burn battery (or hold GPS) for a tab nobody is looking at.
      if (typeof document !== "undefined" && document.visibilityState === "hidden") return;
      refreshLocation(true);
    };

    intervalRef.current = setInterval(tick, LOCATION_REFRESH_MS);

    // Catch up once when the user comes back to a tab that skipped ticks.
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") refreshLocation(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [hasLocation, refreshLocation]);

  return {
    userLocation,
    loading,
    error,
    permissionState,
    locationPending,
    // Deliberately not exporting `refreshLocation` itself. Its `silent` parameter is only
    // meaningful to the background refresh loop inside this hook; see `requestLocation`.
    requestLocation,
    clearError,
    clearLocation,
  };
};
