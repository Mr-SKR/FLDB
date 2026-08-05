import React from "react";
import { Box, Chip, Grid, Paper, Stack, Typography } from "@mui/material";
import Image from "next/image";
import NextLink from "next/link";
import { NearbyPlace } from "../../services/placeService";
import { stripPlusCode } from "../../utils/formatAddress";
import { isYouTubeThumbnail } from "../../utils/images";
import { RatingSummary } from "./PlaceMeta";

/**
 * Cross-links to the closest other places.
 *
 * These were text-only, which made them read as a footnote on a page that is otherwise
 * photography-led. A thumbnail is what turns a list of names into something worth tapping,
 * and these links are also the site's internal link graph, so tapping matters.
 */
export const NearbyPlaces: React.FC<{ places: NearbyPlace[] }> = ({ places }) => {
  if (places.length === 0) return null;

  return (
    <Box component="section" sx={{ mt: { xs: 1, sm: 2 } }}>
      <Typography
        variant="h5"
        component="h2"
        fontWeight="800"
        gutterBottom
        sx={{ mb: 3, letterSpacing: -0.5 }}
      >
        Restaurants nearby
      </Typography>
      <Grid container spacing={2}>
        {places.map((item) => (
          <Grid item xs={12} sm={6} key={item.slug}>
            <Paper
              component={NextLink}
              href={`/place/${item.slug}`}
              elevation={0}
              sx={{
                display: "flex",
                gap: 2,
                p: 1.5,
                height: "100%",
                borderRadius: "16px",
                border: "1px solid",
                borderColor: "divider",
                bgcolor: "action.hover",
                textDecoration: "none",
                color: "inherit",
                transition: "all 0.2s",
                "&:hover": {
                  bgcolor: "action.selected",
                  transform: "translateY(-2px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.06)",
                },
              }}
            >
              {item.image && (
                <Box
                  sx={{
                    position: "relative",
                    flex: "0 0 auto",
                    width: 84,
                    height: 84,
                    borderRadius: "12px",
                    overflow: "hidden",
                    bgcolor: "black",
                  }}
                >
                  <Image
                    src={item.image}
                    // Decorative: the place name sits directly beside it in the same link,
                    // so announcing the image too would read the destination out twice.
                    alt=""
                    fill
                    sizes="84px"
                    style={{ objectFit: "cover" }}
                    unoptimized={isYouTubeThumbnail(item.image)}
                  />
                </Box>
              )}

              <Box sx={{ minWidth: 0, flexGrow: 1 }}>
                <Typography
                  variant="subtitle1"
                  component="h3"
                  sx={{ fontWeight: 700, lineHeight: 1.3, mb: 0.5 }}
                >
                  {item.name}
                </Typography>
                {item.formatted_address && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      mb: 1,
                    }}
                  >
                    {stripPlusCode(item.formatted_address)}
                  </Typography>
                )}
                <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
                  <Chip
                    size="small"
                    label={`${item.distanceKm} km away`}
                    sx={{ fontWeight: 600 }}
                  />
                  <RatingSummary
                    rating={item.rating}
                    total={item.user_ratings_total}
                    compact
                  />
                  {item.hasVeg && (
                    <Chip size="small" color="success" variant="outlined" label="Veg friendly" />
                  )}
                </Stack>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};
