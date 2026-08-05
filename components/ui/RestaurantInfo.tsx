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
  OpenInNew as OpenInNewIcon,
} from "@mui/icons-material";
import { PlaceInterface } from "../../types/types";
import { stripPlusCode } from "../../utils/formatAddress";
import { formatCount } from "./PlaceMeta";

interface RestaurantInfoProps {
  data: PlaceInterface;
}

export const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ data }) => {
  const ratingLink = data.rating ? `https://search.google.com/local/reviews?placeid=${data.place_id}` : null;
  const contactLink = data.international_phone_number ? `tel:${data.international_phone_number}` : null;

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
              {stripPlusCode(data.formatted_address) || "Address not available"}
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
          component={ratingLink ? Link : "div"}
          {...(ratingLink ? { 
            href: ratingLink, 
            target: "_blank", 
            rel: "noopener noreferrer",
            underline: "none"
          } : {})}
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
            textAlign: "center",
            cursor: ratingLink ? "pointer" : "default",
            transition: "all 0.2s",
            "&:hover": ratingLink ? {
              bgcolor: "action.selected",
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
            } : {},
            color: "inherit",
            textDecoration: "none"
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
              Reviews
            </Typography>
            {/* Both of these cards are links, and neither looked like one: no underline,
                no icon, nothing to distinguish them from the static info panels above.
                The trailing glyph is what marks them as tappable. */}
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
              }}
            >
              {/* The score itself now sits under the page heading, beside the open/closed
                  state, so repeating it here would say the same thing twice within one
                  screen. What this card uniquely offers is the way through to the reviews
                  it summarises, so it states that instead. */}
              {data.rating ? (
                <>
                  <Box component="span">
                    {typeof data.user_ratings_total === "number" && data.user_ratings_total > 0
                      ? `${formatCount(data.user_ratings_total)} on Google`
                      : "Read on Google"}
                  </Box>
                  <OpenInNewIcon sx={{ fontSize: "0.85rem", opacity: 0.7 }} />
                </>
              ) : "N/A"}
            </Typography>
          </Box>
        </Paper>

        {/* Contact Card */}
        <Paper
          component={contactLink ? Link : "div"}
          {...(contactLink ? { 
            href: contactLink,
            underline: "none"
          } : {})}
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
            textAlign: "center",
            cursor: contactLink ? "pointer" : "default",
            transition: "all 0.2s",
            "&:hover": contactLink ? {
              bgcolor: "action.selected",
              transform: "translateY(-2px)",
              boxShadow: "0 4px 12px rgba(0,0,0,0.05)"
            } : {},
            color: "inherit",
            textDecoration: "none"
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
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: data.international_phone_number ? "primary.main" : "text.primary",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 0.5,
              }}
            >
              {data.international_phone_number ? (
                <>
                  <Box component="span" sx={{ display: { xs: "none", sm: "inline" } }}>
                    {data.international_phone_number}
                  </Box>
                  <Box component="span" sx={{ display: { xs: "inline", sm: "none" } }}>
                    Call Now
                  </Box>
                </>
              ) : "N/A"}
            </Typography>
          </Box>
        </Paper>
      </Box>
    </Stack>
  );
};
