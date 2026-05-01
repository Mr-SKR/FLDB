import React, { useEffect, forwardRef, useState, useRef, useCallback, useContext } from "react";
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

import { useGeolocation } from "../hooks/useGeolocation";
import { usePlaceFilters } from "../hooks/usePlaceFilters";
import { getPlacesPaginated } from "../services/placeService";
import { FeedViewer } from "../components/ui/FeedViewer";
import { FilterSection } from "../components/ui/FilterSection";
import { PlaceInterface } from "../types/types";
import ResponsiveDrawer from "../components/headers/Header";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import { LocationPrompt } from "../components/ui/LocationPrompt";
import { MobileControls } from "../components/ui/MobileControls";
import { ColorModeContext } from "./_app";

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
  const colorMode = useContext(ColorModeContext);

  const {
    userLocation,
    error: geoError,
    refreshLocation,
    clearLocation,
  } = useGeolocation();

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

  // Check for location permissions/prompt logic
  useEffect(() => {
    const checkLocationStatus = async () => {
      // If we already have location in state/session, no need to prompt
      if (userLocation) return;

      const hasSkippedPrompt = sessionStorage.getItem("skipLocationPrompt");
      if (hasSkippedPrompt) return;

      // Check browser permissions API if available
      if (navigator.permissions && navigator.permissions.query) {
        try {
          const result = await navigator.permissions.query({ name: "geolocation" });
          if (result.state === "granted") {
            // Already allowed by browser, just fetch it
            await refreshLocation(true);
            return;
          } else if (result.state === "denied") {
            // User explicitly blocked it in browser, don't show custom prompt
            return;
          }
        } catch (e) {
          console.error("Error checking location permissions:", e);
        }
      }

      // If state is 'prompt' or API not supported, show our custom modal
      setTimeout(() => {
        setIsLocationPromptOpen(true);
      }, 1000);
    };

    checkLocationStatus();
  }, [userLocation, refreshLocation]);

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

  if (isInitialLoading) {
    return <LoadingScreen />;
  }

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
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=0" />
        <meta name="theme-color" content="#000000" />
      </Head>

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
      <MobileControls onToggleColorMode={colorMode.toggleColorMode} />

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

export const getStaticProps = async () => {
  try {
    const { data } = await getPlacesPaginated(1, 10);
    return {
      props: { data: data || [] },
      revalidate: 60,
    };
  } catch (error) {
    console.error("Error in getStaticProps:", error);
    return {
      props: { data: [] },
      revalidate: 60,
    };
  }
};

export default Home;
