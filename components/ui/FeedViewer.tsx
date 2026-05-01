import React from "react";
import { Box, Typography, CircularProgress } from "@mui/material";
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
}

export const FeedViewer: React.FC<FeedViewerProps> = ({
  filteredPlaces,
  userLocation,
  refreshLocation,
  isLoadingMore,
  isSearching,
  observerTarget,
}) => {
  return (
    <Box 
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
          color: "white",
          p: 4,
          textAlign: "center"
        }}>
          <Typography variant="h6" gutterBottom>No restaurants found</Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>Try adjusting your filters</Typography>
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
