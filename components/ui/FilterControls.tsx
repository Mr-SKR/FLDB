import React from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Typography,
} from "@mui/material";
import { SortMode } from "../../hooks/usePlaceFilters";
import { formatCount } from "./PlaceMeta";

/**
 * The ordering and rating controls, shared by the phone bottom sheet and the desktop bar.
 *
 * The feed previously offered exactly one filter (veg) behind a sheet titled "Explore &
 * Filter", while the data already supported ordering by distance or score and filtering on
 * a rating floor. These are the two that change how the catalogue feels: "show me the best
 * ones" and "show me the best ones near me" were both unanswerable.
 */

/**
 * The label under the search field, shared by the sheet and the desktop bar.
 *
 * `total` is the number of places that match, counted by the API across every page, not the
 * number loaded so far. The distinction is the whole point of the label: the previous
 * version counted loaded places, so it read "10+ places" on almost every first render and
 * grew as the reader scrolled, which said nothing about the filters at all.
 *
 * Null means not yet known, and produces no text rather than a zero.
 */
export const describeResultCount = (
  total: number | null,
  isSearching: boolean,
  filtersActive: boolean
): string => {
  if (isSearching) return "Searching…";
  if (total === null) return "";
  if (total === 0) return filtersActive ? "Nothing matches these filters" : "No places yet";

  const noun = total === 1 ? "place" : "places";
  // `formatCount`, not `toLocaleString`: the unfiltered total is seeded from
  // `getStaticProps`, so this string is rendered on the server as well as the client and
  // the two must agree byte for byte. See the note on `formatCount` itself.
  const count = formatCount(total);
  // "matches your filters" only when something is actually filtering. Otherwise this is
  // simply the size of the catalogue, and claiming it as a match would be odd.
  return filtersActive
    ? `${count} ${noun} ${total === 1 ? "matches" : "match"} your filters`
    : `${count} ${noun}`;
};

const SORT_LABELS: Record<SortMode, string> = {
  nearest: "Nearest",
  rating: "Top rated",
  name: "A to Z",
};

interface SortSelectProps {
  value: SortMode;
  onChange: (value: SortMode) => void;
  /** Whether a position is known, which is what makes "Nearest" meaningful. */
  hasLocation: boolean;
  size?: "small" | "medium";
}

export const SortSelect: React.FC<SortSelectProps> = ({
  value,
  onChange,
  hasLocation,
  size = "small",
}) => (
  <FormControl size={size} sx={{ minWidth: 148 }}>
    <InputLabel id="sort-label">Sort by</InputLabel>
    <Select
      labelId="sort-label"
      label="Sort by"
      value={value}
      onChange={(event: SelectChangeEvent) => onChange(event.target.value as SortMode)}
      // Without this the closed control renders the whole `MenuItem` body, so the
      // "needs location" hint below ended up crammed into the field itself, next to a
      // label that was already saying "Sort by". The hint belongs in the open menu, where
      // it is describing a choice, not in the summary of a choice already made.
      renderValue={(selected) => SORT_LABELS[selected as SortMode]}
      sx={{ borderRadius: "12px" }}
    >
      {/*
        "Nearest" stays selectable without a location instead of being disabled. The API
        falls back to A-to-Z for it, and the secondary line says so, which keeps the option
        as an invitation to enable location rather than a dead control that explains nothing.
      */}
      <MenuItem value="nearest">
        {SORT_LABELS.nearest}
        {!hasLocation && (
          <Typography component="span" variant="caption" sx={{ ml: 1, color: "text.secondary" }}>
            needs location
          </Typography>
        )}
      </MenuItem>
      <MenuItem value="rating">{SORT_LABELS.rating}</MenuItem>
      <MenuItem value="name">{SORT_LABELS.name}</MenuItem>
    </Select>
  </FormControl>
);

interface MinRatingSelectProps {
  value: number;
  onChange: (value: number) => void;
  size?: "small" | "medium";
}

/** Rating floors worth offering. Anything above 4.5 matches too little to be useful. */
const RATING_OPTIONS = [0, 3.5, 4, 4.5];

export const MinRatingSelect: React.FC<MinRatingSelectProps> = ({
  value,
  onChange,
  size = "small",
}) => (
  <FormControl size={size} sx={{ minWidth: 132 }}>
    <InputLabel id="min-rating-label">Rating</InputLabel>
    <Select
      labelId="min-rating-label"
      label="Rating"
      value={String(value)}
      onChange={(event: SelectChangeEvent) => onChange(Number(event.target.value))}
      sx={{ borderRadius: "12px" }}
    >
      {RATING_OPTIONS.map((option) => (
        <MenuItem key={option} value={String(option)}>
          {option === 0 ? "Any rating" : `${option}+ stars`}
        </MenuItem>
      ))}
    </Select>
  </FormControl>
);
