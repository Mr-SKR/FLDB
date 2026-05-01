import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { PlaceInterface } from "../types/types";
import { getDisplacementFromLatLonInKm } from "../utils/getGeoDisplacement";
import { UserLocation } from "./useGeolocation";
import { logger } from "../lib/logger";

const PAGE_SIZE = 10;

export const usePlaceFilters = (initialData: PlaceInterface[], userLocation: UserLocation | null) => {
  const [searchValue, setSearchValue] = useState("");
  const [hasVeg, setHasVeg] = useState(false);
  const [places, setPlaces] = useState<PlaceInterface[]>(initialData);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const isFirstRender = useRef(true);

  // Initialize from sessionStorage on mount
  useEffect(() => {
    const savedSearch = sessionStorage.getItem("searchValue") || "";
    const savedVeg = sessionStorage.getItem("vegToggleOn");
    const hasVegVal = savedVeg ? JSON.parse(savedVeg) : false;

    queueMicrotask(() => {
      if (savedSearch) setSearchValue(savedSearch);
      if (hasVegVal) setHasVeg(hasVegVal);
      setIsHydrated(true);
    });
  }, []);

  // Sync filters to sessionStorage
  useEffect(() => {
    if (isHydrated) {
      sessionStorage.setItem("searchValue", searchValue);
    }
  }, [searchValue, isHydrated]);

  useEffect(() => {
    if (isHydrated) {
      sessionStorage.setItem("vegToggleOn", JSON.stringify(hasVeg));
    }
  }, [hasVeg, isHydrated]);

  const fetchPlaces = useCallback(async (pageNum: number, search: string, veg: boolean, append: boolean = false) => {
    // Determine loading state
    if (pageNum === 1) {
      if (isFirstRender.current) setIsInitialLoading(true);
      else setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      const res = await fetch(
        `/api/search?q=${encodeURIComponent(search)}&veg=${veg}&page=${pageNum}&limit=${PAGE_SIZE}`
      );
      if (res.ok) {
        const data = await res.json();
        if (append) {
          setPlaces(prev => [...prev, ...data]);
        } else {
          setPlaces(data);
        }
        setHasMore(data.length === PAGE_SIZE);
      }
    } catch (err) {
      logger.error("Fetch failed", "usePlaceFilters", err);
    } finally {
      setIsInitialLoading(false);
      setIsSearching(false);
      setIsLoadingMore(false);
      isFirstRender.current = false;
    }
  }, []);

  // Debounced search/filter trigger
  useEffect(() => {
    if (!isHydrated) return;

    if (isFirstRender.current) {
      if (!searchValue && !hasVeg) {
        isFirstRender.current = false;
        return;
      }
      
      // If we HAVE filters on hydration, fetch immediately
      queueMicrotask(() => {
        fetchPlaces(1, searchValue, hasVeg, false);
      });
      return;
    }

    const delayDebounceFn = setTimeout(() => {
      setPage(1);
      fetchPlaces(1, searchValue, hasVeg, false);
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchValue, hasVeg, fetchPlaces, isHydrated]);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isSearching || isInitialLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    fetchPlaces(nextPage, searchValue, hasVeg, true);
  }, [hasMore, isLoadingMore, isSearching, isInitialLoading, page, searchValue, hasVeg, fetchPlaces]);

  const filteredPlaces = useMemo(() => {
    let result = [...places];

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

      if (!searchValue) {
        result.sort((a, b) => (a.displacement ?? Infinity) - (b.displacement ?? Infinity));
      }
    }

    return result;
  }, [places, searchValue, userLocation]);

  return {
    searchValue,
    setSearchValue,
    hasVeg,
    setHasVeg,
    filteredPlaces,
    isSearching,
    isLoadingMore,
    isInitialLoading,
    hasMore,
    loadMore,
  };
};
