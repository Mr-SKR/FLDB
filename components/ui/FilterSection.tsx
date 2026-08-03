import React from "react";
import {
  TextField,
  IconButton,
  Box,
  Typography,
  InputAdornment,
  Paper,
  Button,
  Stack,
  Divider,
  Switch,
  FormControlLabel,
  CircularProgress,
} from "@mui/material";
import {
  RotateLeft as RotateLeftIcon,
  Search as SearchIcon,
  Clear as ClearIcon,
  Restaurant as RestaurantIcon,
  GpsFixed as GpsFixedIcon,
  GpsOff as GpsOffIcon,
} from "@mui/icons-material";
import { UserLocation } from "../../hooks/useGeolocation";
import { alpha, keyframes } from "@mui/material/styles";

const pulse = keyframes`
  0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7); }
  70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(76, 175, 80, 0); }
  100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(76, 175, 80, 0); }
`;

interface FilterSectionProps {
  searchValue: string;
  setSearchValue: (val: string) => void;
  userLocation: UserLocation | null;
  refreshLocation: () => void;
  clearLocation: () => void;
  hasVeg: boolean;
  setHasVeg: (val: boolean) => void;
  /** How many places the current filters match, for live feedback. */
  resultCount: number;
  /** True when more pages remain, so the count is reported as a floor rather than a total. */
  hasMore: boolean;
  /** True while a query is in flight, so a stale count is not shown as if it were the answer. */
  isSearching: boolean;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  searchValue,
  setSearchValue,
  userLocation,
  refreshLocation,
  clearLocation,
  hasVeg,
  setHasVeg,
  resultCount,
  hasMore,
  isSearching,
}) => {
  /**
   * Live feedback for a sheet that covers the results it is filtering.
   *
   * Typing here updates the feed behind the drawer, which the user cannot see, so without
   * this the only way to find out whether a search matched anything was to close the sheet.
   * `hasMore` means only the first page has been fetched, so the count is a floor: reporting
   * a bare "10 places" when hundreds match would be worse than saying nothing.
   */
  const filtersActive = Boolean(searchValue) || hasVeg;
  const noun = resultCount === 1 && !hasMore ? "place" : "places";
  const countLabel = isSearching
    ? "Searching…"
    : resultCount === 0
      ? "Nothing matches these filters"
      : `${resultCount}${hasMore ? "+" : ""} ${noun}${filtersActive ? " match your filters" : ""}`;

  return (
    <Box>
      <Stack spacing={3}>
        {/* Search field and its match count are one unit, so they are wrapped rather than
            left as two Stack children fighting the 24px spacing with a negative margin. */}
        <Box>
          <TextField
            fullWidth
            placeholder="Search restaurant or dish..."
            variant="outlined"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: searchValue && (
                <InputAdornment position="end">
                  <IconButton onClick={() => setSearchValue("")} size="small">
                    <ClearIcon />
                  </IconButton>
                </InputAdornment>
              ),
              sx: { borderRadius: "16px", bgcolor: "background.default" },
            }}
          />

          {/* Live match count, directly under the field so the effect of typing is visible
              without closing the sheet. `aria-live` announces it to screen readers too. */}
          <Box
            aria-live="polite"
            sx={{
              mt: 1,
              display: "flex",
              alignItems: "center",
              gap: 1,
              minHeight: 20,
              px: 0.5,
            }}
          >
            {isSearching && <CircularProgress size={12} thickness={6} />}
            <Typography
              variant="caption"
              sx={{
                fontWeight: 600,
                color: resultCount === 0 && !isSearching ? "warning.main" : "text.secondary",
              }}
            >
              {countLabel}
            </Typography>
          </Box>
        </Box>

        {/* Filters Row */}
        <Box sx={{ display: "flex", gap: 1 }}>
          {/*
            A real MUI Switch rather than a card wired up with role="switch".
            The hand-rolled version was accessible (it carried the right ARIA and key
            handlers) but gave a sighted user nothing to go on: in the off state it was a
            plain bordered rectangle, visually identical to a button, so its two-state
            nature was only discoverable by tapping it. The native control brings the
            affordance, keyboard support and semantics together for free.
          */}
          <Paper
            elevation={0}
            sx={{
              flex: 1,
              px: 2,
              py: 0.5,
              borderRadius: "16px",
              border: "1px solid",
              borderColor: hasVeg ? "success.main" : "divider",
              bgcolor: hasVeg ? alpha("#4caf50", 0.1) : "background.default",
              transition: "all 0.2s",
              "&:has(:focus-visible)": {
                outline: "3px solid",
                outlineColor: "primary.main",
                outlineOffset: "2px",
              },
            }}
          >
            <FormControlLabel
              checked={hasVeg}
              onChange={(_, checked) => setHasVeg(checked)}
              labelPlacement="start"
              sx={{ m: 0, width: "100%", justifyContent: "space-between" }}
              control={<Switch color="success" inputProps={{ "aria-label": "Veg friendly only" }} />}
              label={
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <RestaurantIcon fontSize="small" color={hasVeg ? "success" : "action"} />
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: "bold",
                      color: hasVeg ? "success.dark" : "text.secondary",
                    }}
                  >
                    Veg Friendly
                  </Typography>
                </Box>
              }
            />
          </Paper>
        </Box>

        <Divider>
          <Typography
            variant="caption"
            sx={{ color: "text.disabled", fontWeight: "bold", px: 1 }}
          >
            LOCATION STATUS
          </Typography>
        </Divider>

        {/* Location Dashboard Section */}
        <Paper
          elevation={0}
          sx={{
            p: 2,
            borderRadius: "20px",
            bgcolor: "background.default",
            border: "1px solid",
            borderColor: userLocation ? alpha("#4caf50", 0.3) : "divider",
          }}
        >
          {userLocation ? (
            <Stack spacing={2}>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                <Box
                  sx={{
                    width: 10,
                    height: 10,
                    borderRadius: "50%",
                    bgcolor: "#4caf50",
                    animation: `${pulse} 2s infinite`,
                  }}
                />
                <Box sx={{ flexGrow: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: "bold" }}>
                    Live Location Active
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    Last updated: {new Date(userLocation.lastUpdated).toLocaleTimeString()}
                  </Typography>
                </Box>
                <IconButton
                  size="small"
                  onClick={refreshLocation}
                  aria-label="Refresh my location"
                  sx={{ bgcolor: "action.hover" }}
                >
                  <RotateLeftIcon fontSize="small" />
                </IconButton>
              </Box>
              
              <Button
                fullWidth
                variant="outlined"
                color="error"
                size="small"
                startIcon={<GpsOffIcon />}
                onClick={clearLocation}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  borderColor: "divider",
                  color: "text.secondary",
                  "&:hover": { borderColor: "error.light", bgcolor: alpha("#f44336", 0.05), color: "error.main" }
                }}
              >
                Clear Location & Stop Sorting
              </Button>
            </Stack>
          ) : (
            <Stack alignItems="center" spacing={1.5} sx={{ py: 1 }}>
              <GpsOffIcon sx={{ color: "text.disabled", fontSize: 40 }} />
              <Typography variant="body2" sx={{ color: "text.secondary", textAlign: "center" }}>
                Location sorting is currently disabled.
              </Typography>
              <Button
                variant="contained"
                startIcon={<GpsFixedIcon />}
                onClick={refreshLocation}
                sx={{
                  borderRadius: "12px",
                  textTransform: "none",
                  fontWeight: "bold",
                  px: 4,
                  boxShadow: 0,
                }}
              >
                Enable Nearby Features
              </Button>
            </Stack>
          )}
        </Paper>
      </Stack>
    </Box>
  );
};
