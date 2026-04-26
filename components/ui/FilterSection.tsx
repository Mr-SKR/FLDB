import React from "react";
import {
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
  Box,
  Typography,
  InputAdornment,
  Paper,
  Button,
} from "@mui/material";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import { UserLocation } from "../../hooks/useGeolocation";
import { alpha } from "@mui/material/styles";

interface FilterSectionProps {
  searchValue: string;
  setSearchValue: (val: string) => void;
  userLocation: UserLocation | null;
  refreshLocation: () => void;
  clearLocation: () => void;
  hasVeg: boolean;
  setHasVeg: (val: boolean) => void;
}

export const FilterSection: React.FC<FilterSectionProps> = ({
  searchValue,
  setSearchValue,
  userLocation,
  refreshLocation,
  clearLocation,
  hasVeg,
  setHasVeg,
}) => {
  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12}>
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
              sx: { borderRadius: "12px", bgcolor: "background.paper" }
            }}
          />
        </Grid>

        <Grid item xs={12}>
          <Box display="flex" flexWrap="wrap" gap={2} justifyContent="space-around">
            <Paper
              elevation={0}
              sx={{
                p: 1,
                px: 2,
                borderRadius: "12px",
                border: "1px solid",
                borderColor: userLocation ? "primary.light" : "divider",
                bgcolor: userLocation ? (theme) => alpha(theme.palette.primary.main, 0.08) : "transparent",
                display: "flex",
                alignItems: "center",
                flexGrow: 1,
                maxWidth: { sm: "45%" }
              }}
            >
              <MyLocationIcon color={userLocation ? "primary" : "disabled"} sx={{ mr: 1 }} />
              <FormControlLabel
                sx={{ m: 0, flexGrow: 1, color: "text.primary" }}
                control={
                  <Switch
                    size="small"
                    checked={!!userLocation}
                    onChange={() => (userLocation ? clearLocation() : refreshLocation())}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Nearby Restaurants
                  </Typography>
                }
              />
            </Paper>

            <Paper
              elevation={0}
              sx={{
                p: 1,
                px: 2,
                borderRadius: "12px",
                border: "1px solid",
                borderColor: hasVeg ? "success.light" : "divider",
                bgcolor: hasVeg ? (theme) => alpha(theme.palette.success.main, 0.08) : "transparent",
                display: "flex",
                alignItems: "center",
                flexGrow: 1,
                maxWidth: { sm: "45%" }
              }}
            >
              <RestaurantIcon color={hasVeg ? "success" : "disabled"} sx={{ mr: 1 }} />
              <FormControlLabel
                sx={{ m: 0, flexGrow: 1, color: "text.primary" }}
                control={
                  <Switch
                    size="small"
                    color="success"
                    checked={hasVeg}
                    onChange={(e) => setHasVeg(e.target.checked)}
                  />
                }
                label={
                  <Typography variant="body2" sx={{ fontWeight: 500 }}>
                    Veg Only
                  </Typography>
                }
              />
            </Paper>
          </Box>
        </Grid>

        {userLocation && (
          <Grid item xs={12}>
            <Box display="flex" justifyContent="center">
              <Button
                variant="text"
                size="small"
                onClick={refreshLocation}
                startIcon={<RotateLeftIcon fontSize="small" />}
                sx={{
                  color: "text.secondary",
                  textTransform: "none",
                  borderRadius: "20px",
                  px: 2,
                  py: 0.5,
                  bgcolor: "action.hover",
                  "&:hover": {
                    bgcolor: (theme) => alpha(theme.palette.primary.main, 0.1),
                    color: "primary.main",
                  },
                }}
              >
                <Typography variant="caption" sx={{ fontWeight: 500 }}>
                  Updated: {new Date(userLocation.lastUpdated).toLocaleTimeString()} • Refresh
                </Typography>
              </Button>
            </Box>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
