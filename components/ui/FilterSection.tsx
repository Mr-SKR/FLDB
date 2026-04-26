import React from "react";
import {
  Grid,
  TextField,
  FormControlLabel,
  Switch,
  IconButton,
  Box,
  Typography,
} from "@mui/material";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import { UserLocation } from "../../hooks/useGeolocation";

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
    <Box sx={{ p: 2 }}>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <TextField
            fullWidth
            label="Search by restaurant name, video title etc.,"
            variant="outlined"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
          />
        </Grid>
        <Grid item xs={12} sm={6} display="flex" justifyContent="center">
          <FormControlLabel
            control={
              <Switch
                checked={!!userLocation}
                onChange={() => (userLocation ? clearLocation() : refreshLocation())}
              />
            }
            label="Enable location access"
          />
        </Grid>
        <Grid item xs={12} sm={6} display="flex" justifyContent="center">
          <FormControlLabel
            control={
              <Switch
                checked={hasVeg}
                onChange={(e) => setHasVeg(e.target.checked)}
              />
            }
            label="Veg friendly restaurant"
          />
        </Grid>
        {userLocation && (
          <Grid item xs={12} display="flex" justifyContent="center" alignItems="center">
            <Typography variant="caption">
              Location last updated: {new Date(userLocation.lastUpdated).toLocaleString()}
            </Typography>
            <IconButton onClick={refreshLocation} size="small">
              <RotateLeftIcon />
            </IconButton>
          </Grid>
        )}
      </Grid>
    </Box>
  );
};
