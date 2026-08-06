import React, { useEffect, forwardRef, useState, useRef, useCallback } from "react";
import {
  Typography,
  Snackbar,
  Box,
  Fab,
  SwipeableDrawer,
  CircularProgress,
  IconButton,
  Alert as MuiAlert,
  AlertProps,
} from "@mui/material";
import { Tune as TuneIcon, Close as CloseIcon } from "@mui/icons-material";
import { logger } from "../lib/logger";
import { Seo } from "../components/seo/Seo";
import { JsonLd } from "../components/seo/JsonLd";
import {
  absoluteUrl,
  buildItemListJsonLd,
  buildWebSiteJsonLd,
  getSiteUrl,
  JsonLd as JsonLdType,
} from "../lib/seo";
import { SITE_DESCRIPTION, SITE_NAME } from "../config/constants";

import { useGeolocation, UserLocation } from "../hooks/useGeolocation";
import { usePlaceFilters } from "../hooks/usePlaceFilters";
import { getPlacesPaginated } from "../services/placeService";
import { FeedViewer } from "../components/ui/FeedViewer";
import { FilterSection } from "../components/ui/FilterSection";
import { FilterBar } from "../components/ui/FilterBar";
import { FeedNotice } from "../components/ui/FeedNotice";
import { PlaceInterface } from "../types/types";
import ResponsiveDrawer from "../components/headers/Header";
import { LocationPrompt } from "../components/ui/LocationPrompt";
import { MobileControls } from "../components/ui/MobileControls";
import { PAGE_SIZE } from "../config/constants";

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

interface HomeProps {
  data: PlaceInterface[];
  /** Size of the unfiltered catalogue, counted at build time. */
  total: number;
  canonical: string;
  jsonLd: JsonLdType[];
}

const Home: React.FC<HomeProps> = ({ data, total, canonical, jsonLd }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLocationPromptOpen, setIsLocationPromptOpen] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const {
    userLocation,
    error: geoError,
    permissionState,
    locationPending,
    requestLocation,
    clearError,
    clearLocation,
  } = useGeolocation();

  // Always null on mount. This tracks whether a location has *arrived*, so it must not be
  // seeded with the current value.
  const prevUserLocation = useRef<UserLocation | null>(null);

  const {
    searchValue,
    setSearchValue,
    hasVeg,
    setHasVeg,
    sortBy,
    setSortBy,
    minRating,
    setMinRating,
    totalCount,
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
  } = usePlaceFilters(data, userLocation, feedContainerRef, total);

  // Auto-scroll to top when location is granted to show the newly sorted first item.
  //
  // Skipped entirely when the feed was restored. Coming back from a place page replays the
  // stored position, which is indistinguishable here from location being granted for the
  // first time, and jumping to the top is precisely what the restore exists to prevent.
  useEffect(() => {
    if (restoredFeed) {
      prevUserLocation.current = userLocation;
      return;
    }
    if (!prevUserLocation.current && userLocation && feedContainerRef.current) {
      feedContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    prevUserLocation.current = userLocation;
  }, [userLocation, restoredFeed]);

  // Offer our own prompt only when the browser has not already decided for us.
  // Permission resolution and the "already granted" fetch both live in useGeolocation.
  useEffect(() => {
    if (userLocation) return;
    if (permissionState !== "prompt" && permissionState !== "unsupported") return;
    if (sessionStorage.getItem("skipLocationPrompt")) return;

    const timer = setTimeout(() => setIsLocationPromptOpen(true), 1000);
    return () => clearTimeout(timer);
  }, [permissionState, userLocation]);

  const handleAllowLocation = async () => {
    setIsLocationPromptOpen(false);
    await requestLocation();
  };

  const handleContinueWithout = () => {
    setIsLocationPromptOpen(false);
    sessionStorage.setItem("skipLocationPrompt", "true");
  };

  const handleObserver = useCallback((entries: IntersectionObserverEntry[]) => {
    const [entry] = entries;
    if (entry.isIntersecting && hasMore) {
      loadMore();
    }
  }, [hasMore, loadMore]);

  useEffect(() => {
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: "200px",
      threshold: 0.1,
    });

    if (observerTarget.current) {
      observer.observe(observerTarget.current);
    }

    return () => observer.disconnect();
  }, [handleObserver]);

  /*
    What is happening to the feed, said in a pill rather than behind a curtain.

    This used to be a full-screen splash. Suppressing the default ordering while a position
    is inbound is a reasonable goal, but the cost was disproportionate: with permission
    already granted, acquisition runs an 8s attempt and then a 10s fallback, so a weak GPS
    fix meant up to eighteen seconds of an opaque, unskippable logo screen sitting on top of
    a feed that had already rendered. Naming the wait and leaving the content readable is
    both faster to first use and more honest about what the ordering currently is.
  */
  const notice = locationPending
    ? "Finding places near you…"
    : isInitialLoading
      ? "Loading places…"
      : null;

  return (
    <Box
      sx={{
        /*
          Follows the colour scheme rather than pinning the page to black.

          The cards are full-bleed photography and stay dark whatever the scheme, which is
          what made this easy to miss: only the surround changes, and on a phone the cards
          cover all of it. On a desktop the feed is capped at 1280px, so the majority of a
          wide window was this element, and it stayed pure black with the toggle set to
          light, so the theme switch appeared to do nothing on the home page.
        */
        bgcolor: "background.default",
        height: "100dvh",
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Seo
        title={`${SITE_NAME}: Restaurants Reviewed by India's Best Food Vloggers`}
        description={SITE_DESCRIPTION}
        canonical={canonical}
      />
      {jsonLd.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}

      {/*
        The page's single h1. It is visually hidden because the design is a full-bleed
        media feed with no room for a heading, but the document still needs one: without
        it the home page opened straight into a run of h2 card titles, leaving search
        engines to infer the subject of the site's most important page from nothing.
        Clipped rather than `display: none`, so assistive technology still announces it.
      */}
      <Typography
        variant="h1"
        sx={{
          position: "absolute",
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: "hidden",
          clip: "rect(0 0 0 0)",
          whiteSpace: "nowrap",
          border: 0,
        }}
      >
        {SITE_NAME}: restaurants reviewed by India&apos;s best food vloggers
      </Typography>

      <LocationPrompt
        open={isLocationPromptOpen}
        onAllow={handleAllowLocation}
        onContinue={handleContinueWithout}
      />

      {/* Header - Visible only on Desktop to maximize mobile screen space */}
      <Box sx={{ display: { xs: "none", sm: "block" }, flexShrink: 0 }}>
        <ResponsiveDrawer />
      </Box>

      {/* Mobile Controls */}
      <MobileControls />

      {/* `onClose` is what actually dismisses this. `autoHideDuration` only schedules a
          call to it, so without a handler the timer fired into nothing and a geolocation
          error (most often a denied permission, after which no refresh ever runs to clear
          it) stayed pinned over the feed for the rest of the session. */}
      <Snackbar
        open={!!geoError}
        autoHideDuration={6000}
        onClose={clearError}
        sx={{ mb: 8 }}
      >
        <Alert severity="error" onClose={clearError} sx={{ width: "100%" }}>
          {geoError}
        </Alert>
      </Snackbar>

      {/* Main Container */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
          // The gutter either side of the capped feed. `paper` rather than `default` keeps
          // the slight lift the old #111-on-#000 pairing had, in whichever scheme is active.
          bgcolor: "background.paper",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Feed Wrapper. Constrains the width and provides relative positioning for the FAB.
            The 500px cap is the phone layout; from `md` up the feed is a grid and wants room
            for two or three columns, so the cap widens rather than leaving the screen empty. */}
        <Box
          sx={{
            width: "100%",
            maxWidth: { xs: "500px", md: "1280px" },
            height: "100%",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Desktop search and filters, above the grid they act on. The phone keeps the
              bottom sheet below, which suits a one-handed, full-bleed layout. */}
          <FilterBar
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            hasVeg={hasVeg}
            setHasVeg={setHasVeg}
            sortBy={sortBy}
            setSortBy={setSortBy}
            minRating={minRating}
            setMinRating={setMinRating}
            userLocation={userLocation}
            requestLocation={requestLocation}
            clearLocation={clearLocation}
            totalCount={totalCount}
            isSearching={isSearching}
          />

          {notice && <FeedNotice label={notice} />}

          {/* Feed Content */}
          <FeedViewer
            containerRef={feedContainerRef}
            filteredPlaces={filteredPlaces}
            userLocation={userLocation}
            requestLocation={requestLocation}
            isLoadingMore={isLoadingMore}
            isSearching={isSearching}
            observerTarget={observerTarget}
            onClearFilters={resetFilters}
            feedError={feedError}
            onRetry={retryFetch}
          />

          {/* Filter FAB. Phone and tablet only: from `md` up the same controls are in the
              bar above, and a floating button over them would be a second way to do one
              thing. */}
          {!isFilterOpen && (
            <Fab
              size="medium"
              color="primary"
              aria-label="Search and filter"
              onClick={() => setIsFilterOpen(true)}
              sx={{
                display: { xs: "flex", md: "none" },
                position: "absolute",
                bottom: { xs: 32, sm: 40 },
                right: 24,
                zIndex: 100,
                boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
                transition: "transform 0.2s",
                "&:active": { transform: "scale(0.95)" }
              }}
            >
              <TuneIcon />
            </Fab>
          )}
        </Box>

        {/* Global Loading Overlay */}
        {isSearching && (
          <Box sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 20,
            bgcolor: "rgba(0,0,0,0.5)",
            p: 2,
            borderRadius: "50%",
            backdropFilter: "blur(4px)"
          }}>
            <CircularProgress size={30} sx={{ color: "white" }} />
          </Box>
        )}
      </Box>

      {/* Bottom Sheet Filter */}
      <SwipeableDrawer
        anchor="bottom"
        open={isFilterOpen}
        onClose={() => setIsFilterOpen(false)}
        onOpen={() => setIsFilterOpen(true)}
        disableBackdropTransition={false}
        PaperProps={{
          sx: {
            borderTopLeftRadius: "24px",
            borderTopRightRadius: "24px",
            // Capped so a card stays visible above the sheet. This panel filters the feed
            // behind it, and at 85vh it covered essentially all of the thing it was
            // changing, leaving the user no way to see the effect of what they typed.
            maxHeight: "80vh",
            overflowY: "auto",
            bgcolor: "background.paper",
            width: "100%",
            maxWidth: "500px",
            margin: "0 auto",
          }
        }}
      >
        <Box sx={{ px: 3, pt: 2, pb: 4 }}>
          {/* Drag handle */}
          <Box sx={{
            width: 40,
            height: 4,
            bgcolor: "action.disabled",
            borderRadius: 2,
            mx: "auto",
            mb: 2,
            opacity: 0.5
          }} />

          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
            <Typography variant="h6" component="h2" sx={{ fontWeight: "bold" }}>Explore & Filter</Typography>
            <IconButton onClick={() => setIsFilterOpen(false)} size="small" sx={{ bgcolor: "action.hover" }} aria-label="Close filters">
              <CloseIcon />
            </IconButton>
          </Box>
          <FilterSection
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            userLocation={userLocation}
            requestLocation={requestLocation}
            clearLocation={clearLocation}
            hasVeg={hasVeg}
            setHasVeg={setHasVeg}
            sortBy={sortBy}
            setSortBy={setSortBy}
            minRating={minRating}
            setMinRating={setMinRating}
            totalCount={totalCount}
            isSearching={isSearching}
          />
        </Box>
      </SwipeableDrawer>
    </Box>
  );
};

/**
 * How long the server-rendered first page may serve stale, matching the place pages.
 *
 * This payload is only the pre-hydration placeholder: any visitor who grants location,
 * searches, or filters immediately fetches live results from /api/search, so staleness is
 * visible only to someone who declines location and does nothing, and then only as the
 * alphabetically-first ten places, which barely change.
 *
 * Because syncing runs locally against the production database, the deployment never learns
 * that data changed, and on-demand revalidation cannot reach it. This timer is therefore the
 * mechanism by which a sync becomes visible on the live site. Trigger a Vercel Deploy Hook
 * after syncing if you want it live immediately.
 */
const HOME_REVALIDATE_SECONDS = 3600;

export const getStaticProps = async () => {
  const siteUrl = getSiteUrl();
  const canonical = absoluteUrl(siteUrl, "/");

  try {
    // Must match PAGE_SIZE: the client infers `hasMore` from whether a response came back
    // full, so a server-rendered first page of a different size would break paging.
    // `total` was already being counted here and discarded. It is the size of the
    // unfiltered catalogue, which is what the filter panels state until a filter narrows it.
    const { data, total } = await getPlacesPaginated(1, PAGE_SIZE);
    const places = data || [];

    return {
      props: {
        data: places,
        total,
        canonical,
        jsonLd: [
          buildWebSiteJsonLd(siteUrl),
          buildItemListJsonLd(
            places.map((place) => ({ name: place.name, slug: place.slug })),
            siteUrl
          ),
        ],
      },
      revalidate: HOME_REVALIDATE_SECONDS,
    };
  } catch (error) {
    logger.error("Error in getStaticProps", "Home", error);
    return {
      props: { data: [], total: 0, canonical, jsonLd: [buildWebSiteJsonLd(siteUrl)] },
      // Retry sooner after a failure so a transient database error does not pin an empty
      // page in the cache for a full hour.
      revalidate: 60,
    };
  }
};

export default Home;
