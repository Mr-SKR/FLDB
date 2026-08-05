import React from "react";
import { Box, CircularProgress, Typography } from "@mui/material";

/**
 * A small, non-blocking status pill floated over the top of the feed.
 *
 * This replaces a full-screen opaque splash (logo, wordmark, tagline) that was shown while
 * the first fix was being acquired. With permission already granted that path runs an 8s
 * fast attempt and then a 10s precise fallback, so a visitor with poor GPS could sit behind
 * an unskippable branded screen for the better part of twenty seconds while a perfectly
 * good feed sat rendered underneath it.
 *
 * Showing the feed and saying what is happening is better on every count: the content is
 * readable and scrollable immediately, the wait is explained rather than merely imposed,
 * and the re-sort when the fix lands is a visible improvement instead of a reveal.
 *
 * `aria-live="polite"` because this appears without the reader having done anything.
 */
export const FeedNotice: React.FC<{ label: string }> = ({ label }) => (
  <Box
    aria-live="polite"
    sx={{
      position: "absolute",
      top: 12,
      left: "50%",
      transform: "translateX(-50%)",
      zIndex: 95,
      display: "flex",
      alignItems: "center",
      gap: 1,
      px: 1.75,
      py: 0.75,
      borderRadius: 999,
      bgcolor: "rgba(0,0,0,0.62)",
      backdropFilter: "blur(8px)",
      border: "1px solid rgba(255,255,255,0.18)",
      color: "white",
      boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
      pointerEvents: "none",
      maxWidth: "calc(100% - 32px)",
    }}
  >
    <CircularProgress size={13} thickness={6} sx={{ color: "inherit" }} />
    <Typography variant="caption" sx={{ fontWeight: 700, whiteSpace: "nowrap" }}>
      {label}
    </Typography>
  </Box>
);
