import { useState, useEffect, useCallback, useRef } from "react";
import { getAccurateLocation } from "../utils/userLocation";

export interface UserLocation {
  lat: number;
  long: number;
  lastUpdated: number;
}

export const useGeolocation = () => {
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const refreshLocation = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const location = await getAccurateLocation();
      const newLocation = {
        lat: location.coords.latitude,
        long: location.coords.longitude,
        lastUpdated: location.timestamp,
      };
      setUserLocation(newLocation);
      sessionStorage.setItem("userLocation", JSON.stringify(newLocation));
      return true;
    } catch (err) {
      if (!silent) setError((err as Error).message);
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setError(null);
    sessionStorage.removeItem("userLocation");
    sessionStorage.setItem("skipLocationPrompt", "true");
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Initial load
  useEffect(() => {
    const savedLocation = sessionStorage.getItem("userLocation");
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        if (parsed.lat && parsed.long) {
          queueMicrotask(() => {
            setUserLocation(parsed);
          });
        }
      } catch (e) {
        console.error("Failed to parse saved location", e);
      }
    }
  }, []);

  // Setup auto-update interval
  useEffect(() => {
    // Only set interval if we have permission (checked by success of refresh)
    // or if we already have a location
    const startInterval = () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
      
      intervalRef.current = setInterval(() => {
        // Use silent update for interval to not show loading spinners every minute
        refreshLocation(true);
      }, 60000); // 1 minute
    };

    if (userLocation) {
      startInterval();
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [userLocation, refreshLocation]);

  return { userLocation, loading, error, refreshLocation, clearLocation };
};
