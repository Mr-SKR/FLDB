import React from "react";
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from "@mui/material";
import {
  Clear as ClearIcon,
  GpsFixed as GpsFixedIcon,
  GpsOff as GpsOffIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import { SortMode } from "../../hooks/usePlaceFilters";
import { UserLocation } from "../../hooks/useGeolocation";
import { describeResultCount, MinRatingSelect, SortSelect } from "./FilterControls";
import { VegMark } from "./VegMark";

interface FilterBarProps {
  searchValue: string;
  setSearchValue: (value: string) => void;
  hasVeg: boolean;
  setHasVeg: (value: boolean) => void;
  sortBy: SortMode;
  setSortBy: (value: SortMode) => void;
  minRating: number;
  setMinRating: (value: number) => void;
  userLocation: UserLocation | null;
  requestLocation: () => Promise<boolean>;
  clearLocation: () => void;
  /** Places matching the current query across every page, or null before it is known. */
  totalCount: number | null;
  isSearching: boolean;
}

/**
 * The desktop search and filter toolbar.
 *
 * From `md` up the feed is a two or three column grid up to 1280px wide, and the only way
 * to search it was a floating action button opening a bottom sheet capped at 500px: a phone
 * pattern, on a layout that is not a phone, covering the results it filters. The header
 * component is even called `SearchAppBar` and had no search in it.
 *
 * Rendered above the feed so the controls and the results they govern are on screen
 * together, which is the whole point of having the room.
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  searchValue,
  setSearchValue,
  hasVeg,
  setHasVeg,
  sortBy,
  setSortBy,
  minRating,
  setMinRating,
  userLocation,
  requestLocation,
  clearLocation,
  totalCount,
  isSearching,
}) => {
  const filtersActive = Boolean(searchValue) || hasVeg || minRating > 0;
  const countLabel = describeResultCount(totalCount, isSearching, filtersActive);

  return (
    <Box
      sx={{
        display: { xs: "none", md: "flex" },
        alignItems: "center",
        gap: 1.5,
        flexWrap: "wrap",
        px: 2,
        py: 1.5,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: "background.default",
      }}
    >
      <TextField
        size="small"
        placeholder="Search restaurant, dish or area..."
        value={searchValue}
        onChange={(event) => setSearchValue(event.target.value)}
        // The one control that should get the room left over, since what people type is
        // longer than any of the labels beside it.
        sx={{ flexGrow: 1, minWidth: 220 }}
        InputProps={{
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon color="action" fontSize="small" />
            </InputAdornment>
          ),
          endAdornment: searchValue ? (
            <InputAdornment position="end">
              <IconButton onClick={() => setSearchValue("")} size="small" aria-label="Clear search">
                <ClearIcon fontSize="small" />
              </IconButton>
            </InputAdornment>
          ) : null,
          sx: { borderRadius: "12px", bgcolor: "background.paper" },
        }}
      />

      <SortSelect value={sortBy} onChange={setSortBy} hasLocation={!!userLocation} />
      <MinRatingSelect value={minRating} onChange={setMinRating} />

      {/* A filter chip rather than a switch: on a horizontal bar the selected/unselected
          states of a chip read at a glance, and it takes a third of the width. */}
      <Chip
        icon={<VegMark />}
        label="Veg friendly"
        clickable
        color={hasVeg ? "success" : "default"}
        variant={hasVeg ? "filled" : "outlined"}
        onClick={() => setHasVeg(!hasVeg)}
        // Announced as the two-state control it is, which a plain chip is not.
        role="switch"
        aria-checked={hasVeg}
        sx={{ fontWeight: 600, height: 36, borderRadius: "12px" }}
      />

      {userLocation ? (
        <Tooltip title="Stop using your location">
          <Button
            size="small"
            variant="outlined"
            startIcon={<GpsFixedIcon />}
            onClick={clearLocation}
            sx={{
              borderRadius: "12px",
              borderColor: "success.main",
              color: "success.main",
              flexShrink: 0,
            }}
          >
            Located
          </Button>
        </Tooltip>
      ) : (
        <Button
          size="small"
          variant="outlined"
          startIcon={<GpsOffIcon />}
          onClick={requestLocation}
          sx={{ borderRadius: "12px", flexShrink: 0 }}
        >
          Use my location
        </Button>
      )}

      {/* The live count, mirroring the one in the phone sheet. `aria-live` so a screen
          reader hears the result of a filter change without hunting for it. */}
      <Box
        aria-live="polite"
        sx={{ display: "flex", alignItems: "center", gap: 0.75, ml: "auto", pl: 1 }}
      >
        {isSearching && <CircularProgress size={12} thickness={6} />}
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: totalCount === 0 && !isSearching ? "warning.main" : "text.secondary",
          }}
        >
          {countLabel}
        </Typography>
      </Box>
    </Box>
  );
};
