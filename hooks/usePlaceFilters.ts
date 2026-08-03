import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { PlaceInterface } from "../types/types";
import { getDisplacementFromLatLonInKm } from "../utils/getGeoDisplacement";
import { UserLocation } from "./useGeolocation";
import { logger } from "../lib/logger";
import { PAGE_SIZE } from "../config/constants";

export const usePlaceFilters = (initialData: PlaceInterface[], userLocation: UserLocation | null) => {
  const [searchValue, setSearchValue] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [hasVeg, setHasVeg] = useState(false);
  const [places, setPlaces] = useState<PlaceInterface[]>(initialData);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  const isFirstRender = useRef(true);
  /**
   * Monotonic id of the most recently issued fetch. Responses that are not the latest are
   * discarded: the debounce makes overlapping requests unlikely but not impossible, and a
   * slow early response landing after a fast later one would otherwise paint stale results.
   */
  const requestIdRef = useRef(0);

  // Depend on the coordinates themselves rather than the location object. A new object
  // identity with unchanged coordinates must never trigger a refetch, because that would
  // replace the accumulated feed with page 1 and lose the user's scroll progress.
  const lat = userLocation?.lat;
  const lng = userLocation?.long;

  // Initialize from sessionStorage on mount.
  useEffect(() => {
    const savedSearch = sessionStorage.getItem("searchValue") || "";
    const savedVeg = sessionStorage.getItem("vegToggleOn");

    let hasVegVal = false;
    try {
      hasVegVal = savedVeg ? JSON.parse(savedVeg) : false;
    } catch {
      hasVegVal = false;
    }

    // Deliberately applied after hydration: this is client-only state that the server
    // could not have rendered, so setting it during render would mismatch.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (savedSearch) {
      // Seed both so a restored search does not pay the 500ms typing debounce.
      setSearchValue(savedSearch);
      setDebouncedSearch(savedSearch);
    }
    if (hasVegVal) setHasVeg(hasVegVal);
    setIsHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
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
    const requestId = ++requestIdRef.current;

    // Determine loading state
    if (pageNum === 1) {
      if (isFirstRender.current) setIsInitialLoading(true);
      else setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }

    try {
      let url = `/api/search?q=${encodeURIComponent(search)}&veg=${veg}&page=${pageNum}&limit=${PAGE_SIZE}`;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        url += `&lat=${lat}&lng=${lng}`;
      }

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        // A newer request has been issued since this one started; its results are the
        // ones the user is waiting for, so drop these rather than overwrite them.
        if (requestId !== requestIdRef.current) return;
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
      // Only the newest request owns the loading flags; a superseded one clearing them
      // would hide the spinner while its replacement is still in flight.
      if (requestId === requestIdRef.current) {
        setIsInitialLoading(false);
        setIsSearching(false);
        setIsLoadingMore(false);
      }
      isFirstRender.current = false;
    }
  }, [lat, lng]);

  // Debounce only the search text. Typing needs a settle delay; a location arriving or a
  // filter toggling does not, and making them wait 500ms was adding avoidable latency to
  // the first render of nearby results.
  useEffect(() => {
    if (!isHydrated) return;
    if (searchValue === debouncedSearch) return;

    const timer = setTimeout(() => setDebouncedSearch(searchValue), 500);
    return () => clearTimeout(timer);
  }, [searchValue, debouncedSearch, isHydrated]);

  // Fetch whenever the settled query, the veg filter, or the position changes.
  useEffect(() => {
    if (!isHydrated) return;

    if (isFirstRender.current) {
      // Nothing to fetch beyond the server-rendered first page.
      if (!debouncedSearch && !hasVeg && !Number.isFinite(lat)) {
        isFirstRender.current = false;
        return;
      }
    }

    setPage(1);
    fetchPlaces(1, debouncedSearch, hasVeg, false);
  }, [debouncedSearch, hasVeg, lat, lng, fetchPlaces, isHydrated]);

  /**
   * Clears every active filter.
   *
   * `debouncedSearch` is reset alongside `searchValue` so the refetch fires immediately
   * rather than after the 500ms typing debounce. The sessionStorage sync effects above
   * pick these up, which is what makes the reset survive. The empty state previously
   * called `window.location.reload()`, and the reloaded page simply restored the same
   * filters from sessionStorage and landed the user right back on the empty state.
   */
  const resetFilters = useCallback(() => {
    setSearchValue("");
    setDebouncedSearch("");
    setHasVeg(false);
  }, []);

  const loadMore = useCallback(() => {
    if (!hasMore || isLoadingMore || isSearching || isInitialLoading) return;
    const nextPage = page + 1;
    setPage(nextPage);
    // Must be the settled query, not the raw input: page 1 was fetched with
    // `debouncedSearch`, so paging with `searchValue` would append results for a
    // different query to the list already on screen whenever the user scrolls
    // within the 500ms debounce window.
    fetchPlaces(nextPage, debouncedSearch, hasVeg, true);
  }, [hasMore, isLoadingMore, isSearching, isInitialLoading, page, debouncedSearch, hasVeg, fetchPlaces]);

  const filteredPlaces = useMemo(() => {
    let result = [...places];

    if (userLocation) {
      result = result.map((place) => {
        const placeLat = place.geometry?.location?.lat;
        const placeLng = place.geometry?.location?.lng;

        if (placeLat != null && placeLng != null) {
          const displacement = Math.ceil(
            getDisplacementFromLatLonInKm(
              userLocation.lat,
              userLocation.long,
              placeLat,
              placeLng
            )
          );
          return { ...place, displacement };
        }
        return { ...place, displacement: Infinity };
      });

      // If we are browsing (no search), sort by distance.
      // Note: the server already sorts, but re-sorting here keeps the order correct
      // when the location shifts without triggering a refetch. Keyed on the settled
      // query so the ordering matches the results actually on screen.
      if (!debouncedSearch) {
        result.sort((a, b) => (a.displacement ?? Infinity) - (b.displacement ?? Infinity));
      }
    }

    return result;
  }, [places, debouncedSearch, userLocation]);

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
    resetFilters,
  };
};
