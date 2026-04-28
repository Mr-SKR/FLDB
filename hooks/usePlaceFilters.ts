import { useState, useMemo, useEffect } from "react";
import { PlaceInterface } from "../types/types";
import { getDisplacementFromLatLonInKm } from "../utils/getGeoDisplacement";
import { UserLocation } from "./useGeolocation";

export const usePlaceFilters = (initialData: PlaceInterface[], userLocation: UserLocation | null) => {
  const [searchValue, setSearchValue] = useState("");
  const [hasVeg, setHasVeg] = useState(false);
  const [searchResults, setSearchResults] = useState<PlaceInterface[] | null>(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    const savedVeg = sessionStorage.getItem("vegToggleOn");
    if (savedVeg) {
      setHasVeg(JSON.parse(savedVeg));
    }
  }, []);

  useEffect(() => {
    sessionStorage.setItem("vegToggleOn", JSON.stringify(hasVeg));
  }, [hasVeg]);

  // Debounced Search API call
  useEffect(() => {
    if (!searchValue.trim()) {
      setSearchResults(null);
      return;
    }

    const delayDebounceFn = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(
          `/api/search?q=${encodeURIComponent(searchValue)}&veg=${hasVeg}`
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setIsSearching(false);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchValue, hasVeg]);

  const filteredPlaces = useMemo(() => {
    // If search results exist from API, use them, otherwise use initial data
    let result = searchResults !== null ? [...searchResults] : [...initialData];

    // Local client-side search fallback if API results are not yet available or empty
    if (searchValue && searchResults === null) {
      const lowerSearch = searchValue.toLowerCase();
      result = result.filter(
        (place) =>
          place.name.toLowerCase().includes(lowerSearch) ||
          (place.formatted_address && place.formatted_address.toLowerCase().includes(lowerSearch))
      );
    }

    if (hasVeg) {
      result = result.filter((place) => place.hasVeg);
    }

    if (userLocation) {
      result = result.map((place) => {
        if (place.geometry?.location?.lat && place.geometry?.location?.lng) {
          const displacement = Math.ceil(
            getDisplacementFromLatLonInKm(
              userLocation.lat,
              userLocation.long,
              place.geometry.location.lat,
              place.geometry.location.lng
            )
          );
          return { ...place, displacement };
        }
        return { ...place, displacement: Infinity };
      });

      // Only sort by displacement if NOT performing a search (search has its own relevance)
      if (!searchValue) {
        result.sort((a, b) => (a.displacement ?? Infinity) - (b.displacement ?? Infinity));
      }
    } else if (!searchValue) {
      result.sort((a, b) => {
        if (!a.name && !b.name) return 0;
        if (!a.name) return 1;
        if (!b.name) return -1;
        return a.name.localeCompare(b.name);
      });
    }

    return result;
  }, [initialData, searchResults, searchValue, hasVeg, userLocation]);

  return {
    searchValue,
    setSearchValue,
    hasVeg,
    setHasVeg,
    filteredPlaces,
    isSearching,
  };
};
