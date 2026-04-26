import { useState, useEffect, useCallback } from "react";
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

  useEffect(() => {
    const savedLocation = sessionStorage.getItem("userLocation");
    if (savedLocation) {
      try {
        const parsed = JSON.parse(savedLocation);
        if (parsed.lat && parsed.long) {
          setUserLocation(parsed);
        }
      } catch (e) {
        console.error("Failed to parse saved location", e);
      }
    }
  }, []);

  const refreshLocation = useCallback(async () => {
    setLoading(true);
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
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    sessionStorage.removeItem("userLocation");
  }, []);

  return { userLocation, loading, error, refreshLocation, clearLocation };
};
