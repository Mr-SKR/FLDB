import React from "react";
import { Box, Chip, Stack, Typography, Alert } from "@mui/material";
import {
  Schedule as ScheduleIcon,
  Star as StarIcon,
} from "@mui/icons-material";
import { VegMark } from "./VegMark";
import { useOpenState } from "../../hooks/useOpenState";
import { OpenState } from "../../lib/openingHours";

/**
 * Thousands separators without `toLocaleString`.
 *
 * This renders on the server and again on the client, and the two only agree on a locale's
 * grouping if both runtimes carry the same ICU data. Node ships without full ICU in some
 * builds, and "1,23,456" against "123,456" is exactly the kind of hydration mismatch React
 * cannot patch. Plain three-digit grouping is identical everywhere.
 */
export const formatCount = (value: number): string =>
  String(Math.round(value)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");

/** The wording for each open state, kept in one place so the chip and its label agree. */
const describeOpenState = (state: OpenState): { label: string; color: "success" | "warning" | "default" } => {
  if (state.status === "open") {
    return state.closingSoon
      ? { label: `Closing soon · ${state.closesAt}`, color: "warning" }
      : { label: `Open now · until ${state.closesAt}`, color: "success" };
  }

  if (state.status === "closed") {
    // `opensDay` is only set when the next opening falls on a later day, so a place opening
    // again this morning reads "Closed · opens 9 am" rather than naming today's weekday as
    // though it were next week. Interpolating it unconditionally also printed the literal
    // "undefined" the moment it became optional.
    const when = [state.opensDay, state.opensAt].filter(Boolean).join(" ");
    return {
      label: state.opensAt ? `Closed · opens ${when}` : "Closed",
      color: "default",
    };
  }

  return { label: "", color: "default" };
};

/**
 * Whether the place is open at this moment.
 *
 * The single most valuable fact about a restaurant, and it used to be folded inside a
 * collapsed "Operating Hours" accordion as seven lines of raw text for the reader to
 * cross-reference against their own watch.
 *
 * Renders nothing until the client has resolved it, and nothing at all when the hours
 * cannot be parsed. An empty space is better than a confident wrong answer about whether
 * someone should get in a car.
 */
const OpenStatusChip: React.FC<{ weekdayText?: string[] }> = ({ weekdayText }) => {
  const state = useOpenState(weekdayText);
  if (!state || state.status === "unknown") return null;

  const { label, color } = describeOpenState(state);

  return (
    <Chip
      size="small"
      icon={<ScheduleIcon sx={{ fontSize: "1rem !important" }} />}
      label={label}
      color={color === "default" ? undefined : color}
      variant={color === "default" ? "outlined" : "filled"}
      sx={{ fontWeight: 700 }}
    />
  );
};

/**
 * Google's `business_status` for the place, when it is anything other than trading.
 *
 * The value was already being honoured in the JSON-LD, so search engines were told a place
 * had closed while the page itself presented it as perfectly normal. Rendered as a banner
 * rather than a chip: a wasted trip is the most expensive mistake this site can cause.
 */
export const BusinessStatusNotice: React.FC<{ status?: string }> = ({ status }) => {
  if (status !== "CLOSED_TEMPORARILY" && status !== "CLOSED_PERMANENTLY") return null;

  const permanent = status === "CLOSED_PERMANENTLY";

  return (
    <Alert
      severity={permanent ? "error" : "warning"}
      variant="outlined"
      sx={{ borderRadius: "16px", alignItems: "center" }}
    >
      {permanent
        ? "Google lists this place as permanently closed. The reviews below are kept for reference."
        : "Google lists this place as temporarily closed. Check before travelling."}
    </Alert>
  );
};

interface RatingSummaryProps {
  rating?: number;
  total?: number;
  /** Renders the star at text size rather than as a standalone icon. */
  compact?: boolean;
}

/**
 * A rating with the number of ratings behind it.
 *
 * `user_ratings_total` was already stored and already used in the JSON-LD (schema.org
 * rejects an `AggregateRating` without a count) but never shown. A bare "4.2" carries very
 * little: 4.2 from nine people and 4.2 from four thousand are different claims.
 */
export const RatingSummary: React.FC<RatingSummaryProps> = ({ rating, total, compact }) => {
  if (typeof rating !== "number") return null;

  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
      <StarIcon sx={{ fontSize: compact ? "1rem" : "1.15rem", color: "warning.main" }} />
      <Typography component="span" variant="body2" sx={{ fontWeight: 700 }}>
        {rating}
      </Typography>
      {typeof total === "number" && total > 0 && (
        <Typography component="span" variant="body2" sx={{ color: "text.secondary" }}>
          ({formatCount(total)})
        </Typography>
      )}
    </Box>
  );
};

/** The veg badge for the place page header. The nearby cards use a tighter, icon-less one. */
const VegChip: React.FC<{ size?: "small" | "medium" }> = ({ size = "small" }) => (
  <Chip
    size={size}
    color="success"
    variant="outlined"
    icon={<VegMark sx={{ fontSize: "1rem !important" }} />}
    label="Veg friendly"
    sx={{ fontWeight: 600 }}
  />
);

/**
 * The row of facts directly under a place's name: rating, whether it is open, diet.
 *
 * Grouped into one component because these three are read together and were previously
 * scattered (rating in a card halfway down, hours inside an accordion, veg only on the feed
 * card and not on the page at all).
 */
export const PlaceMetaRow: React.FC<{
  rating?: number;
  ratingsTotal?: number;
  weekdayText?: string[];
  hasVeg?: boolean;
}> = ({ rating, ratingsTotal, weekdayText, hasVeg }) => (
  <Stack
    direction="row"
    spacing={1.5}
    alignItems="center"
    flexWrap="wrap"
    useFlexGap
    sx={{ mt: 1.5 }}
  >
    <RatingSummary rating={rating} total={ratingsTotal} />
    <OpenStatusChip weekdayText={weekdayText} />
    {hasVeg && <VegChip />}
  </Stack>
);
