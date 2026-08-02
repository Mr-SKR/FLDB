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
import Head from "next/head";
import { logger } from "../lib/logger";

import { useGeolocation, UserLocation } from "../hooks/useGeolocation";
import { usePlaceFilters } from "../hooks/usePlaceFilters";
import { getPlacesPaginated } from "../services/placeService";
import { FeedViewer } from "../components/ui/FeedViewer";
import { FilterSection } from "../components/ui/FilterSection";
import { PlaceInterface } from "../types/types";
import ResponsiveDrawer from "../components/headers/Header";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { LocationPrompt } from "../components/ui/LocationPrompt";
import { MobileControls } from "../components/ui/MobileControls";

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

interface HomeProps {
  data: PlaceInterface[];
}

const Home: React.FC<HomeProps> = ({ data }) => {
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [isLocationPromptOpen, setIsLocationPromptOpen] = useState(false);
  const observerTarget = useRef<HTMLDivElement>(null);
  const feedContainerRef = useRef<HTMLDivElement>(null);

  const {
    userLocation,
    error: geoError,
    permissionState,
    locationPending,
    refreshLocation,
    clearLocation,
  } = useGeolocation();

  const prevUserLocation = useRef<UserLocation | null>(userLocation);

  const {
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
  } = usePlaceFilters(data, userLocation);

  // Auto-scroll to top when location is granted to show the newly sorted first item
  useEffect(() => {
    if (!prevUserLocation.current && userLocation && feedContainerRef.current) {
      feedContainerRef.current.scrollTo({ top: 0, behavior: "smooth" });
    }
    prevUserLocation.current = userLocation;
  }, [userLocation]);

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
    await refreshLocation();
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

  // Rendered as a fixed-position overlay rather than replacing the feed, so the
  // server-rendered content stays in the HTML for crawlers while we suppress the
  // default (non-local) ordering from being shown to the user as if it were final.
  const showLoadingOverlay = isInitialLoading || locationPending;

  return (
    <Box 
      sx={{ 
        bgcolor: "#000", 
        height: "100dvh", 
        width: "100vw",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Head>
        <title>FLDb | Food Lovers Database</title>
        {/* The canonical viewport tag lives in _app.tsx. It deliberately does not set
            maximum-scale/user-scalable=0, which would disable pinch-zoom (WCAG 1.4.4). */}
        <meta name="theme-color" content="#000000" />
      </Head>

      {showLoadingOverlay && <LoadingScreen />}

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

      <Snackbar open={!!geoError} autoHideDuration={6000} sx={{ mb: 8 }}>
        <Alert severity="error" sx={{ width: "100%" }}>
          {geoError}
        </Alert>
      </Snackbar>

      {/* Main Container */}
      <Box 
        sx={{ 
          flexGrow: 1,
          display: "flex",
          justifyContent: "center",
          bgcolor: "#111", // Dark gutter color
          overflow: "hidden",
          position: "relative",
        }}
      >
        {/* Feed Wrapper - Constrains the width and provides relative positioning for FAB */}
        <Box
          sx={{
            width: "100%",
            maxWidth: "500px",
            height: "100%",
            position: "relative",
            display: "flex",
            flexDirection: "column",
          }}
        >
          {/* Feed Content */}
          <FeedViewer
            containerRef={feedContainerRef}
            filteredPlaces={filteredPlaces}
            userLocation={userLocation}
            refreshLocation={refreshLocation}
            isLoadingMore={isLoadingMore}
            isSearching={isSearching}
            observerTarget={observerTarget}
          />

          {/* Filter FAB - Now anchored to the feed wrapper */}
          {!isFilterOpen && (
            <Fab
              size="medium"
              color="primary"
              aria-label="filter"
              onClick={() => setIsFilterOpen(true)}
              sx={{
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
            maxHeight: "85vh",
            bgcolor: "background.paper",
            width: "100%",
            maxWidth: "500px",
            margin: "0 auto",
          }
        }}
      >
        <Box sx={{ p: 3, pb: 6 }}>
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
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>Explore & Filter</Typography>
            <IconButton onClick={() => setIsFilterOpen(false)} size="small" sx={{ bgcolor: "action.hover" }}>
              <CloseIcon />
            </IconButton>
          </Box>
          <FilterSection
            searchValue={searchValue}
            setSearchValue={setSearchValue}
            userLocation={userLocation}
            refreshLocation={refreshLocation}
            clearLocation={clearLocation}
            hasVeg={hasVeg}
            setHasVeg={setHasVeg}
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
 * visible only to someone who declines location and does nothing — and then only as the
 * alphabetically-first ten places, which barely change.
 *
 * Because syncing runs locally against the production database, the deployment never learns
 * that data changed, and on-demand revalidation cannot reach it. This timer is therefore the
 * mechanism by which a sync becomes visible on the live site. Trigger a Vercel Deploy Hook
 * after syncing if you want it live immediately.
 */
const HOME_REVALIDATE_SECONDS = 3600;

export const getStaticProps = async () => {
  try {
    const { data } = await getPlacesPaginated(1, 10);
    return {
      props: { data: data || [] },
      revalidate: HOME_REVALIDATE_SECONDS,
    };
  } catch (error) {
    logger.error("Error in getStaticProps", "Home", error);
    return {
      props: { data: [] },
      // Retry sooner after a failure so a transient database error does not pin an empty
      // page in the cache for a full hour.
      revalidate: 60,
    };
  }
};

export default Home;
