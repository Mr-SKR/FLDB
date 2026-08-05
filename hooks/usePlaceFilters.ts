import { useState, useMemo, useEffect, useLayoutEffect, useCallback, useRef } from "react";
import { useRouter } from "next/router";
import { PlaceInterface } from "../types/types";
import { getDisplacementFromLatLonInKm, roundDistanceKm } from "../utils/getGeoDisplacement";
import { UserLocation } from "./useGeolocation";
import { logger } from "../lib/logger";
import { PAGE_SIZE } from "../config/constants";

/**
 * The feed as it stood when the reader last navigated away from it.
 *
 * Module scope rather than sessionStorage on purpose. This only has to survive a
 * client-side route change, during which the module stays loaded, so nothing needs
 * serialising. A hard reload clears it, which is the right outcome: a genuinely fresh
 * page load should show fresh data rather than a resurrected list of unknown age.
 *
 * The query it was captured under is stored alongside it, because restoring the wrong
 * list is far worse than restoring none.
 */
interface FeedSnapshot {
  places: PlaceInterface[];
  page: number;
  hasMore: boolean;
  search: string;
  veg: boolean;
  lat?: number;
  lng?: number;
  scrollTop: number;
  /** Slug of the card at the top of the viewport. Survives a resize; scrollTop does not. */
  anchorSlug?: string;
}

let feedSnapshot: FeedSnapshot | null = null;

/**
 * `useLayoutEffect` on the client, `useEffect` on the server.
 *
 * The scroll restore has to run before paint, or the reader sees a frame at the top of the
 * feed before it jumps to where they were. `useLayoutEffect` alone warns during SSR, where
 * it cannot run at all.
 */
const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

/** Discards the snapshot. Exported so a deliberate "back to the top" can opt out. */
export const clearFeedSnapshot = () => {
  feedSnapshot = null;
};

export const usePlaceFilters = (
  initialData: PlaceInterface[],
  userLocation: UserLocation | null,
  containerRef?: React.RefObject<HTMLDivElement | null>
) => {
  const router = useRouter();
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
  /**
   * Which kind of request last failed, or null when the feed is healthy.
   *
   * A failed fetch used to be completely silent: the handler only acted `if (res.ok)`, and
   * the `catch` covers a rejected `fetch` but not a 4xx/5xx response, so the most likely
   * failure of all (this endpoint's own 429) left the reader looking at a spinner that
   * simply stopped. Distinguishing the two cases lets the retry re-issue the right request.
   */
  const [feedError, setFeedError] = useState<null | "initial" | "more">(null);
  /**
   * True when this mount put a saved feed back on screen.
   *
   * Exposed because the caller has a "jump to the top when a position arrives" behaviour
   * that would otherwise undo the restore: coming back from a place page replays the
   * stored location, which looks to that effect exactly like location being granted for
   * the first time.
   */
  const [restoredFeed, setRestoredFeed] = useState(false);

  const isFirstRender = useRef(true);
  /**
   * True while the feed is showing a restored snapshot that still matches the live query.
   *
   * The fetch effect below runs on mount and would immediately replace the restored list
   * with a fresh page one, undoing the restore. This holds it off for exactly as long as
   * the query is unchanged; the moment a filter or the position genuinely differs, it
   * clears and the normal refetch takes over.
   */
  const holdingSnapshot = useRef(false);
  /** Pending scroll offset to reapply once the restored cards have been laid out. */
  const pendingScroll = useRef<{ scrollTop: number; anchorSlug?: string } | null>(null);
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

    /*
      Put the feed back the way the reader left it.

      Returning from a place page previously dropped them at the top of a ten-item list,
      however far they had scrolled, because the component remounts and `places` resets to
      the server-rendered first page. Restoring the scroll offset alone would not help:
      there would be nothing below item ten to scroll to. The list and the position have
      to come back together.

      Only restored when the saved query matches the one being hydrated. A snapshot taken
      under a different search or veg filter belongs to a different list.
    */
    const snapshot = feedSnapshot;
    if (snapshot && snapshot.search === savedSearch && snapshot.veg === hasVegVal) {
      setPlaces(snapshot.places);
      setPage(snapshot.page);
      setHasMore(snapshot.hasMore);
      holdingSnapshot.current = true;
      setRestoredFeed(true);
      pendingScroll.current = {
        scrollTop: snapshot.scrollTop,
        anchorSlug: snapshot.anchorSlug,
      };
      // There is a full feed on screen already, so the mount-time fetch has nothing to do.
      isFirstRender.current = false;
    }

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

  /**
   * Issues one page request.
   *
   * Returns whether this request actually delivered results, which is what lets `loadMore`
   * decide if the page counter may advance. A superseded request reports false too: the
   * newer request owns that decision.
   */
  const fetchPlaces = useCallback(async (pageNum: number, search: string, veg: boolean, append: boolean = false): Promise<boolean> => {
    const requestId = ++requestIdRef.current;

    // Determine loading state
    if (pageNum === 1) {
      if (isFirstRender.current) setIsInitialLoading(true);
      else setIsSearching(true);
    } else {
      setIsLoadingMore(true);
    }
    setFeedError(null);

    try {
      let url = `/api/search?q=${encodeURIComponent(search)}&veg=${veg}&page=${pageNum}&limit=${PAGE_SIZE}`;
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        url += `&lat=${lat}&lng=${lng}`;
      }

      const res = await fetch(url);
      // A non-ok response is a failure, not a no-op. Treating it as one meant a rate-limited
      // or erroring request left `places` untouched and `hasMore` still true, with nothing
      // on screen to say so.
      if (!res.ok) {
        throw new Error(`Search request failed (HTTP ${res.status})`);
      }

      const data = await res.json();
      // A newer request has been issued since this one started; its results are the
      // ones the user is waiting for, so drop these rather than overwrite them.
      if (requestId !== requestIdRef.current) return false;
      if (append) {
        setPlaces(prev => [...prev, ...data]);
      } else {
        setPlaces(data);
      }
      setHasMore(data.length === PAGE_SIZE);
      return true;
    } catch (err) {
      logger.error("Fetch failed", "usePlaceFilters", err);
      // Only the newest request may report an error, for the same reason it alone owns the
      // loading flags: a superseded failure would show a retry for a request nobody wants.
      if (requestId === requestIdRef.current) {
        setFeedError(append ? "more" : "initial");
      }
      return false;
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

    /*
      A restored feed is left alone while it still answers the current query.

      This effect also runs on mount, so without the hold it would fire a fresh page one
      and throw the restored list away before the reader saw it. The position is part of
      the comparison because the feed is distance-sorted: coming back after moving far
      enough for `useGeolocation` to publish a new fix should genuinely re-sort.
    */
    if (holdingSnapshot.current) {
      const snapshot = feedSnapshot;
      const stillMatches =
        snapshot &&
        snapshot.search === debouncedSearch &&
        snapshot.veg === hasVeg &&
        snapshot.lat === lat &&
        snapshot.lng === lng;

      if (stillMatches) return;
      holdingSnapshot.current = false;
      pendingScroll.current = null;
    }

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
   * Reapplies the saved scroll offset once the restored cards exist in the DOM.
   *
   * Runs on every change to `places` and holds the request until it can actually be
   * satisfied, rather than firing once and hoping. On the commit where the restore is
   * requested the DOM still contains the ten server-rendered cards, so the anchor is not
   * there yet and scrolling would clamp to the bottom of a much shorter list. Only once
   * the restored cards render does the anchor resolve, and only then is the request
   * cleared. An earlier version consumed the request immediately and scheduled a
   * `requestAnimationFrame`, which StrictMode's simulated unmount then cancelled, leaving
   * nothing to retry with.
   *
   * The anchor is preferred over the raw offset because a pixel offset is only meaningful
   * at the viewport width it was captured at, and this feed switches between a single
   * column and a grid.
   */
  useIsomorphicLayoutEffect(() => {
    const pending = pendingScroll.current;
    const container = containerRef?.current;
    if (!pending || !container) return;

    const anchor = pending.anchorSlug
      ? container.querySelector<HTMLElement>(`[id="${CSS.escape(pending.anchorSlug)}"]`)
      : null;

    // Restored cards have not rendered yet. Leave the request in place for the next commit.
    if (pending.anchorSlug && !anchor) return;

    // `scrollTo` rather than assigning `scrollTop`: the same effect, but an imperative DOM
    // call rather than a property write the lint rules read as mutating a hook argument.
    container.scrollTo({ top: anchor ? anchor.offsetTop : pending.scrollTop });
    pendingScroll.current = null;
  }, [places, containerRef]);

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
    // Clearing the filters is an explicit request for a different list, so the snapshot
    // that belonged to the old one must not survive to be restored over it.
    clearFeedSnapshot();
  }, []);

  /*
    Latest values, mirrored into a ref so the unmount handler can read them.

    The capture has to run in an effect cleanup with an empty dependency list, since it
    must fire exactly once, when the page is actually being left. Such a cleanup closes
    over the values from first render, so it cannot read this state directly.
  */
  const latest = useRef({ places, page, hasMore, debouncedSearch, hasVeg, lat, lng });

  // Deliberately has no dependency array: it mirrors after every commit. Assigning during
  // render instead would be a write to a ref mid-render, which is not safe under
  // concurrent rendering.
  useEffect(() => {
    latest.current = { places, page, hasMore, debouncedSearch, hasVeg, lat, lng };
  });

  /**
   * Capture the feed on the way out.
   *
   * Hooked to the router's `routeChangeStart` rather than to unmount. Unmount looks like
   * the right moment but fires in situations that are not a navigation at all: React's
   * StrictMode deliberately mounts, unmounts and remounts every component in development,
   * and that simulated unmount would overwrite a good snapshot with the initial ten-item
   * state microseconds before the remount tried to read it. A route change happens only
   * when the reader actually leaves.
   *
   * Nothing is written on a full page unload, which is deliberate: a reload starts clean.
   */
  useEffect(() => {
    const capture = () => {
      const container = containerRef?.current;
      const state = latest.current;
      if (state.places.length === 0) return;

      const scrollTop = container?.scrollTop ?? 0;

      // Which card is at the top right now. Stored so the position can be restored by
      // element, which survives a viewport change between leaving and coming back.
      let anchorSlug: string | undefined;
      if (container) {
        for (const child of Array.from(container.children)) {
          const el = child as HTMLElement;
          if (el.id && el.offsetTop >= scrollTop - 8) {
            anchorSlug = el.id;
            break;
          }
        }
      }

      feedSnapshot = {
        places: state.places,
        page: state.page,
        hasMore: state.hasMore,
        search: state.debouncedSearch,
        veg: state.hasVeg,
        lat: state.lat,
        lng: state.lng,
        scrollTop,
        anchorSlug,
      };
    };

    router.events.on("routeChangeStart", capture);
    return () => router.events.off("routeChangeStart", capture);
  }, [router, containerRef]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoadingMore || isSearching || isInitialLoading) return;
    const nextPage = page + 1;
    // Must be the settled query, not the raw input: page 1 was fetched with
    // `debouncedSearch`, so paging with `searchValue` would append results for a
    // different query to the list already on screen whenever the user scrolls
    // within the 500ms debounce window.
    const loaded = await fetchPlaces(nextPage, debouncedSearch, hasVeg, true);

    /*
      The counter advances only on success.

      Advancing before the request (as this used to) had two consequences when a page
      failed. The obvious one is a permanent hole in the feed: the next successful
      `loadMore` fetched the page *after* the one that failed, so ten places vanished with
      no indication. The subtler one is a retry spin. `page` is a dependency of this
      callback, which is a dependency of the home page's IntersectionObserver callback, so
      changing it tears down and recreates the observer; `observe()` always delivers an
      initial callback, and at the bottom of the feed the sentinel is still intersecting,
      so the failure immediately triggered another attempt, and another. Against a 429
      that never converged.
    */
    if (loaded) setPage(nextPage);
  }, [hasMore, isLoadingMore, isSearching, isInitialLoading, page, debouncedSearch, hasVeg, fetchPlaces]);

  /** Re-issues whichever request failed, for the retry affordance in the feed. */
  const retryFetch = useCallback(() => {
    if (feedError === "more") {
      loadMore();
      return;
    }
    fetchPlaces(1, debouncedSearch, hasVeg, false);
  }, [feedError, loadMore, fetchPlaces, debouncedSearch, hasVeg]);

  const filteredPlaces = useMemo(() => {
    let result = [...places];

    if (userLocation) {
      result = result.map((place) => {
        const placeLat = place.geometry?.location?.lat;
        const placeLng = place.geometry?.location?.lng;

        if (placeLat != null && placeLng != null) {
          const displacement = roundDistanceKm(
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
    restoredFeed,
    feedError,
    retryFetch,
  };
};
