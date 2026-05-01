import React from "react";
import {
  Typography,
  Link,
  Box,
  Paper,
  Button,
  Stack,
} from "@mui/material";
import {
  Grade as GradeIcon,
  Directions as DirectionsIcon,
  Phone as PhoneIcon,
} from "@mui/icons-material";
import { PlaceInterface } from "../../types/types";

interface RestaurantInfoProps {
  data: PlaceInterface;
}

export const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ data }) => {
  const ratingValue = data.rating ? (
    <Link
      href={`https://search.google.com/local/reviews?placeid=${data.place_id}`}
      target="_blank"
      rel="noopener noreferrer"
      sx={{ fontWeight: "bold", textDecoration: "none", color: "primary.main" }}
    >
      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
        {data.rating} / 5 (Google Reviews)
      </Box>
      <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
        {data.rating} / 5
      </Box>
    </Link>
  ) : "N/A";

  const contactValue = data.international_phone_number ? (
    <Link href={`tel:${data.international_phone_number}`} sx={{ textDecoration: "none", color: "text.primary", fontWeight: 600 }}>
      <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
        {data.international_phone_number}
      </Box>
      <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
        Call Now
      </Box>
    </Link>
  ) : "N/A";

  return (
    <Stack spacing={2}>
      {/* Location Card */}
      <Paper
        elevation={0}
        sx={{
          p: { xs: 3, sm: 3 },
          bgcolor: "action.hover",
          borderRadius: "20px",
          border: "1px solid",
          borderColor: "divider",
          display: "flex",
          flexDirection: "column",
          gap: 3,
          textAlign: "center"
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
          <Box>
            <Typography 
              variant="caption" 
              color="text.secondary"
              sx={{ 
                fontWeight: "bold", 
                textTransform: "uppercase", 
                letterSpacing: 1.5,
                display: { xs: "none", sm: "block" },
                mb: 0.5
              }}
            >
              Location & Directions
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600, lineHeight: 1.5, color: "text.primary", fontSize: { xs: "1rem", sm: "1.1rem" } }}>
              {data.formatted_address || "Address not available"}
            </Typography>
          </Box>
        </Box>
        
        {data.url && (
          <Button
            variant="contained"
            disableElevation
            fullWidth
            href={data.url}
            target="_blank"
            rel="noopener noreferrer"
            startIcon={<DirectionsIcon />}
            sx={{
              bgcolor: "primary.main",
              color: "white",
              fontWeight: "bold",
              borderRadius: "12px",
              py: 1.5,
              fontSize: "1rem",
              "&:hover": {
                bgcolor: "primary.dark",
              },
            }}
          >
            Get Directions
          </Button>
        )}
      </Paper>

      {/* Side-by-side Cards Container */}
      <Box 
        sx={{ 
          display: "flex", 
          gap: 2,
          width: "100%"
        }}
      >
        {/* Rating Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
            bgcolor: "action.hover",
            borderRadius: "16px",
            flex: 1,
            border: "1px solid",
            borderColor: "divider",
            textAlign: "center"
          }}
        >
          <GradeIcon color="warning" sx={{ fontSize: "1.5rem" }} />
          <Box>
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                fontWeight: "bold", 
                textTransform: "uppercase",
                display: { xs: "none", sm: "block" }
              }}
            >
              Rating
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {ratingValue}
            </Typography>
          </Box>
        </Paper>

        {/* Contact Card */}
        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 2 },
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
            bgcolor: "action.hover",
            borderRadius: "16px",
            flex: 1,
            border: "1px solid",
            borderColor: "divider",
            textAlign: "center"
          }}
        >
          <PhoneIcon color="primary" sx={{ fontSize: "1.5rem" }} />
          <Box>
            <Typography 
              variant="caption" 
              color="text.secondary" 
              sx={{ 
                fontWeight: "bold", 
                textTransform: "uppercase",
                display: { xs: "none", sm: "block" }
              }}
            >
              Contact
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {contactValue}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Stack>
  );
};
