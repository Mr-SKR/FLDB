import React from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
import Image from "next/image";
import FoodCard from "../cards/Card";
import { PlaceInterface } from "../../types/types";
import { UserLocation } from "../../hooks/useGeolocation";

interface FeedViewerProps {
  filteredPlaces: PlaceInterface[];
  userLocation: UserLocation | null;
  refreshLocation: (force?: boolean) => Promise<boolean>;
  isLoadingMore: boolean;
  isSearching: boolean;
  observerTarget: React.RefObject<HTMLDivElement | null>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
}

export const FeedViewer: React.FC<FeedViewerProps> = ({
  filteredPlaces,
  userLocation,
  refreshLocation,
  isLoadingMore,
  isSearching,
  observerTarget,
  containerRef,
}) => {
  return (
    <Box 
      ref={containerRef}
      sx={{ 
        width: "100%",
        height: "100%",
        bgcolor: "black",
        position: "relative",
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
        "&::-webkit-scrollbar": { display: "none" },
        msOverflowStyle: "none",
        scrollbarWidth: "none",
        boxShadow: { sm: "0 0 40px rgba(0,0,0,0.8)" },
        borderLeft: { sm: "1px solid #333" },
        borderRight: { sm: "1px solid #333" },
      }}
    >
      {filteredPlaces.length > 0 ? (
        filteredPlaces.map((place, index) => (
          <FoodCard
            key={place._id}
            slug={place.slug}
            title={place.name}
            address={place.formatted_address || ""}
            displacement={place.displacement || 0}
            hasVeg={place.hasVeg || false}
            height="100%"
            thumbnail={place.thumbnail?.large || place.thumbnail?.small || ""}
            allThumbnails={place.allThumbnails}
            useLocation={!!userLocation}
            setUseLocation={refreshLocation}
            index={index}
            rating={place.rating}
            url={place.url}
          />
        ))
      ) : !isSearching && (
        <Box sx={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          background: "linear-gradient(180deg, #121212 0%, #000000 100%)",
          color: "white",
          p: 4,
          textAlign: "center"
        }}>
          <Box sx={{ mb: 4, opacity: 0.9 }}>
             <Image 
               src="/img/walking-chef.gif" 
               alt="Walking Chef" 
               width={120}
               height={120}
               style={{ borderRadius: "12px", objectFit: "contain" }} 
               unoptimized
             />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, mb: 1, letterSpacing: "-0.5px" }}>
            Nothing on the menu?
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.6, maxWidth: "260px", mx: "auto", mb: 4 }}>
            We couldn&apos;t find any restaurants matching your current filters.
          </Typography>
          <Typography 
            variant="button" 
            sx={{ 
              color: "primary.main", 
              fontWeight: 700,
              cursor: "pointer",
              "&:hover": { textDecoration: "underline" }
            }}
            onClick={() => window.location.reload()}
          >
            Clear all filters
          </Typography>
        </Box>
      )}
      {/* Infinite Scroll Sentinel */}
      <Box ref={observerTarget} sx={{ height: "10px", width: "100%" }} />

      {/* Loading Indicator (Inside Feed) */}
      {isLoadingMore && (
        <Box sx={{ py: 4, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={24} sx={{ color: "white" }} />
        </Box>
      )}
    </Box>
  );
};
