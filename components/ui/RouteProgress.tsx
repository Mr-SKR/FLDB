import React, { useEffect, useState } from "react";
import { Box } from "@mui/material";
import { keyframes } from "@mui/material/styles";
import { useRouter } from "next/router";

/**
 * Indeterminate sweep. The duration of a navigation is unknown, so the bar advances
 * steadily rather than pretending to track real progress.
 */
const slide = keyframes`
  from { transform: translateX(-100%); }
  to   { transform: translateX(100%); }
`;

/**
 * Wait this long before showing anything.
 *
 * Place pages are prerendered and prefetched on hover, so most navigations resolve in a few
 * tens of milliseconds. Painting a loading indicator for one frame and removing it is worse
 * than showing nothing: it reads as a flicker, and it makes a fast app look unstable.
 */
const APPEAR_DELAY_MS = 150;

/**
 * A thin progress bar across the top of the viewport during client-side navigation.
 *
 * Replaces a full-screen, opaque, logo-and-tagline splash that covered the entire app on
 * every route change. That splash was a heavier interruption than the navigation it was
 * reporting: it hid content that was already on screen, it made a 40ms transition feel like
 * a page load, and going back to the feed flashed it again.
 */
export const RouteProgress: React.FC = () => {
  const router = useRouter();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | null = null;

    const start = (url: string) => {
      // A hash change or a shallow replace of the same URL is not a navigation worth
      // reporting; the original code compared these too.
      if (url === router.asPath) return;
      timer = setTimeout(() => setVisible(true), APPEAR_DELAY_MS);
    };

    const done = () => {
      if (timer) clearTimeout(timer);
      timer = null;
      setVisible(false);
    };

    router.events.on("routeChangeStart", start);
    router.events.on("routeChangeComplete", done);
    router.events.on("routeChangeError", done);

    return () => {
      if (timer) clearTimeout(timer);
      router.events.off("routeChangeStart", start);
      router.events.off("routeChangeComplete", done);
      router.events.off("routeChangeError", done);
    };
  }, [router]);

  if (!visible) return null;

  return (
    <Box
      // Announced rather than silent, since for a screen reader the page has otherwise
      // simply gone quiet. `aria-label` carries the meaning the bar conveys visually.
      role="status"
      aria-label="Loading page"
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: 3,
        zIndex: 2000,
        overflow: "hidden",
        bgcolor: "transparent",
        pointerEvents: "none",
      }}
    >
      <Box
        sx={{
          width: "100%",
          height: "100%",
          bgcolor: "primary.main",
          animation: `${slide} 1s ease-in-out infinite`,
          // Reduced motion still needs the indicator, just not the travel: a static bar
          // says "working" without anything moving across the screen.
          "@media (prefers-reduced-motion: reduce)": { animation: "none", opacity: 0.7 },
        }}
      />
    </Box>
  );
};
