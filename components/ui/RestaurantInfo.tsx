import React from "react";
import {
  Grid,
  Typography,
  Link,
  Box,
  Paper,
} from "@mui/material";
import {
  Grade as GradeIcon,
  Directions as DirectionsIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
} from "@mui/icons-material";
import { VideoInterface } from "../../types/types";

interface RestaurantInfoProps {
  data: VideoInterface;
}

export const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ data }) => {
  const infoItems = [
    {
      icon: <GradeIcon color="warning" />,
      label: "Rating",
      value: data.rating ? (
        <Link
          href={`https://search.google.com/local/reviews?placeid=${data.place_id}`}
          target="_blank"
          rel="noopener noreferrer"
          sx={{ fontWeight: "bold", textDecoration: "none", color: "primary.main" }}
        >
          {data.rating} / 5 (Google)
        </Link>
      ) : "N/A"
    },
    {
      icon: <PhoneIcon color="primary" />,
      label: "Contact",
      value: data.international_phone_number ? (
        <Link href={`tel:${data.international_phone_number}`} sx={{ textDecoration: "none", color: "text.primary" }}>
          {data.international_phone_number}
        </Link>
      ) : "N/A"
    },
    {
      icon: <DirectionsIcon color="secondary" />,
      label: "Directions",
      value: data.url ? (
        <Link href={data.url} target="_blank" rel="noopener noreferrer" sx={{ textDecoration: "none", color: "primary.main" }}>
          View on Google Maps
        </Link>
      ) : "N/A"
    },
    {
      icon: <LocationOnIcon color="error" />,
      label: "Address",
      value: data.formatted_address || "N/A"
    }
  ];

  return (
    <Grid container spacing={2}>
      {infoItems.map((item, index) => (
        <Grid item xs={12} sm={6} key={index}>
          <Paper 
            elevation={0} 
            sx={{ 
              p: 2, 
              display: "flex", 
              alignItems: "flex-start", 
              gap: 2, 
              bgcolor: "action.hover", 
              borderRadius: "12px",
              height: "100%",
              border: "1px solid",
              borderColor: "divider"
            }}
          >
            <Box sx={{ mt: 0.5 }}>{item.icon}</Box>
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.5, fontWeight: "bold", textTransform: "uppercase", letterSpacing: 0.5 }}>
                {item.label}
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, wordBreak: "break-word", color: "text.primary" }}>
                {item.value}
              </Typography>
            </Box>
          </Paper>
        </Grid>
      ))}
    </Grid>
  );
};
