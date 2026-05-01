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
  Stack,
  Divider,
} from "@mui/material";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import SearchIcon from "@mui/icons-material/Search";
import ClearIcon from "@mui/icons-material/Clear";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import MyLocationIcon from "@mui/icons-material/MyLocation";
import GpsFixedIcon from "@mui/icons-material/GpsFixed";
import GpsOffIcon from "@mui/icons-material/GpsOff";
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
      <Stack spacing={3}>
        {/* Search Section */}
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

        {/* Filters Row */}
        <Box sx={{ display: "flex", gap: 1 }}>
          <Paper
            elevation={0}
            onClick={() => setHasVeg(!hasVeg)}
            sx={{
              flex: 1,
              p: 1.5,
              borderRadius: "16px",
              cursor: "pointer",
              border: "1px solid",
              borderColor: hasVeg ? "success.main" : "divider",
              bgcolor: hasVeg ? alpha("#4caf50", 0.1) : "background.default",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              transition: "all 0.2s",
            }}
          >
            <RestaurantIcon
              fontSize="small"
              color={hasVeg ? "success" : "action"}
            />
            <Typography
              variant="body2"
              sx={{
                fontWeight: "bold",
                color: hasVeg ? "success.dark" : "text.secondary",
              }}
            >
              Veg Friendly
            </Typography>
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
