import React, { useEffect, useState } from "react";
import { Box, Typography, CircularProgress, Button } from "@mui/material";
import { KeyboardArrowDown as KeyboardArrowDownIcon } from "@mui/icons-material";
import { keyframes } from "@mui/material/styles";
import Image from "next/image";
import FoodCard from "../cards/Card";
import { PlaceInterface } from "../../types/types";
import { UserLocation } from "../../hooks/useGeolocation";
import { stripPlusCode } from "../../utils/formatAddress";

/** Gentle downward nudge. Motion is what makes a hint read as a hint rather than a label. */
const nudge = keyframes`
  0%, 100% { transform: translateY(0); opacity: 0.85; }
  50%      { transform: translateY(4px); opacity: 1; }
`;

const SCROLL_HINT_DISMISSED_KEY = "scrollHintSeen";

interface FeedViewerProps {
  filteredPlaces: PlaceInterface[];
  userLocation: UserLocation | null;
  refreshLocation: (force?: boolean) => Promise<boolean>;
  isLoadingMore: boolean;
  isSearching: boolean;
  observerTarget: React.RefObject<HTMLDivElement | null>;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  onClearFilters: () => void;
}

export const FeedViewer: React.FC<FeedViewerProps> = ({
  filteredPlaces,
  userLocation,
  refreshLocation,
  isLoadingMore,
  isSearching,
  observerTarget,
  containerRef,
  onClearFilters,
}) => {
  /**
   * "There is more below" hint for the phone feed.
   *
   * Cards are exactly one viewport tall, so nothing peeks over the fold and the feed gives
   * a first-time visitor no signal that it scrolls at all. It can read as a single detail
   * page. Desktop does not need this: the grid is visibly cut off mid-row.
   *
   * Shown once per session and dismissed the moment the reader scrolls, so it never
   * becomes something to dismiss twice.
   */
  const [showScrollHint, setShowScrollHint] = useState(false);

  useEffect(() => {
    if (filteredPlaces.length < 2) return;
    if (sessionStorage.getItem(SCROLL_HINT_DISMISSED_KEY)) return;

    const container = containerRef?.current;
    if (!container) return;

    setShowScrollHint(true);

    const dismiss = () => {
      setShowScrollHint(false);
      sessionStorage.setItem(SCROLL_HINT_DISMISSED_KEY, "true");
    };

    /*
      Dismiss on a real scroll, measured as a delta rather than on the first event.

      Listening for a single `scroll` event killed the hint instantly on every load: the
      scroll-snap container emits one while it settles onto the first card during initial
      layout, before the reader has done anything at all. Comparing against the starting
      offset ignores that and waits for an actual movement.
    */
    const startedAt = container.scrollTop;
    const onScroll = () => {
      if (Math.abs(container.scrollTop - startedAt) < 20) return;
      container.removeEventListener("scroll", onScroll);
      dismiss();
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    // Also give up on its own, so it is never the last thing left on screen.
    const timer = setTimeout(dismiss, 8000);

    return () => {
      container.removeEventListener("scroll", onScroll);
      clearTimeout(timer);
    };
  }, [filteredPlaces.length, containerRef]);

  return (
    <Box
      ref={containerRef}
      sx={{
        width: "100%",
        height: "100%",
        bgcolor: "black",
        position: "relative",
        overflowY: "scroll",
        "&::-webkit-scrollbar": { display: "none" },
        msOverflowStyle: "none",
        scrollbarWidth: "none",
        /*
          One column that snaps on a phone; a grid from `md` up.

          The single-column layout was applied at every width, so a 1440px desktop showed a
          500px strip of cards in roughly 940px of empty black. Snap scrolling has to be
          switched off with it: a mandatory snap on a multi-row grid fights the scroll,
          because the browser keeps pulling the viewport onto a row edge.

          The grid starts at `md`, not `sm`. See the matching note in Card.tsx: two columns
          in a 600px window are too narrow for a card's own action row.
        */
        scrollSnapType: { xs: "y mandatory", md: "none" },
        display: { xs: "block", md: "grid" },
        gridTemplateColumns: { md: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
        gap: { md: 2 },
        alignContent: "start",
        p: { xs: 0, md: 2 },
      }}
    >
      {filteredPlaces.length > 0 ? (
        filteredPlaces.map((place, index) => (
          <FoodCard
            key={place._id}
            slug={place.slug}
            title={place.name}
            address={stripPlusCode(place.formatted_address)}
            displacement={place.displacement ?? Infinity}
            hasVeg={place.hasVeg || false}
            height="100%"
            thumbnail={place.thumbnail?.large || place.thumbnail?.small || ""}
            allThumbnails={place.allThumbnails}
            useLocation={!!userLocation}
            setUseLocation={refreshLocation}
            index={index}
            rating={place.rating}
            url={place.url}
            photoAttribution={place.photoAttribution}
          />
        ))
      ) : !isSearching && (
        <Box sx={{
          // Full width in the desktop grid; a lone cell in column one would look broken.
          gridColumn: "1 / -1",
          height: "100%",
          minHeight: { md: "60vh" },
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
          <Typography variant="h5" component="h2" sx={{ fontWeight: 800, mb: 1, letterSpacing: "-0.5px" }}>
            Nothing on the menu?
          </Typography>
          <Typography variant="body1" sx={{ opacity: 0.6, maxWidth: "260px", mx: "auto", mb: 4 }}>
            We couldn&apos;t find any restaurants matching your current filters.
          </Typography>
          {/* A real button rather than a clickable Typography: this is keyboard-focusable
              and announced as a control. It resets the filter state directly. The previous
              `window.location.reload()` did nothing useful, since the filters are persisted
              in sessionStorage and were simply restored on the way back up. */}
          <Button
            variant="text"
            onClick={onClearFilters}
            sx={{
              color: "primary.main",
              fontWeight: 700,
              "&:hover": { textDecoration: "underline", bgcolor: "transparent" },
            }}
          >
            Clear all filters
          </Button>
        </Box>
      )}
      {/* Infinite Scroll Sentinel. Spans the grid so it sits below the last row rather
          than becoming a cell of its own. */}
      <Box ref={observerTarget} sx={{ gridColumn: "1 / -1", height: "10px", width: "100%" }} />

      {/* Loading Indicator (Inside Feed) */}
      {isLoadingMore && (
        <Box sx={{ gridColumn: "1 / -1", py: 4, display: "flex", justifyContent: "center" }}>
          <CircularProgress size={24} sx={{ color: "white" }} />
        </Box>
      )}

      {/* Scroll hint. Fixed to the feed rather than the card, so it does not scroll away
          mid-animation, and phone-only since the desktop grid is self-evidently scrollable. */}
      {showScrollHint && (
        <Box
          aria-hidden
          sx={{
            display: { xs: "flex", md: "none" },
            position: "fixed",
            bottom: 10,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 90,
            alignItems: "center",
            gap: 0.5,
            px: 1.5,
            py: 0.5,
            borderRadius: 999,
            bgcolor: "rgba(0,0,0,0.55)",
            backdropFilter: "blur(6px)",
            border: "1px solid rgba(255,255,255,0.18)",
            color: "rgba(255,255,255,0.9)",
            pointerEvents: "none",
            animation: `${nudge} 1.8s ease-in-out infinite`,
            "@media (prefers-reduced-motion: reduce)": { animation: "none" },
          }}
        >
          <Typography
            variant="caption"
            sx={{ fontWeight: 700, letterSpacing: "0.04em", fontSize: "0.65rem" }}
          >
            Swipe for more
          </Typography>
          <KeyboardArrowDownIcon sx={{ fontSize: "1rem" }} />
        </Box>
      )}
    </Box>
  );
};
