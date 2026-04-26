import { useState, useMemo, useEffect } from "react";
import { VideoInterface } from "../types/types";
import { getDisplacementFromLatLonInKm } from "../utils/getGeoDisplacement";
import { UserLocation } from "./useGeolocation";

export const useVideoFilters = (initialData: VideoInterface[], userLocation: UserLocation | null) => {
  const [searchValue, setSearchValue] = useState("");
  const [hasVeg, setHasVeg] = useState(false);

  useEffect(() => {
    const savedVeg = sessionStorage.getItem("vegToggleOn");
    if (savedVeg) {
      setHasVeg(JSON.parse(savedVeg));
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("vegToggleOn", JSON.stringify(hasVeg));
  }, [hasVeg]);

  const filteredVideos = useMemo(() => {
    let result = [...initialData];

    if (searchValue) {
      const lowerSearch = searchValue.toLowerCase();
      result = result.filter(
        (video) =>
          video.videoTitle.toLowerCase().includes(lowerSearch) ||
          (video.name && video.name.toLowerCase().includes(lowerSearch))
      );
    }

    if (hasVeg) {
      result = result.filter((video) => video.hasVeg);
    }

    if (userLocation) {
      result = result.map((video) => {
        if (video.geometry?.location?.lat && video.geometry?.location?.lng) {
          const displacement = Math.ceil(
            getDisplacementFromLatLonInKm(
              userLocation.lat,
              userLocation.long,
              video.geometry.location.lat,
              video.geometry.location.lng
            )
          );
          return { ...video, displacement };
        }
        return { ...video, displacement: Infinity };
      });

      result.sort((a, b) => (a.displacement ?? Infinity) - (b.displacement ?? Infinity));
    } else {
      result.sort((a, b) => {
        if (!a.name && !b.name) return 0;
        if (!a.name) return 1; // Push missing names to end
        if (!b.name) return -1;
        return a.name.localeCompare(b.name);
      });
    }

    return result;
  }, [initialData, searchValue, hasVeg, userLocation]);

  return {
    searchValue,
    setSearchValue,
    hasVeg,
    setHasVeg,
    filteredVideos,
  };
};
