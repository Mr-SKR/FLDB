import React from "react";
import {
  Typography,
  Grid,
  Box,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Breadcrumbs,
  Chip,
  Link as MuiLink,
  Paper,
  Divider,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  ArrowBack as ArrowBackIcon,
  AccessTime as AccessTimeIcon,
  VideoLibrary as VideoLibraryIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import NextLink from "next/link";
import ReactPlayer from "react-player";
import { DiscussionEmbed } from "disqus-react";
import { GetStaticPropsContext } from "next";

import ResponsiveDrawer from "../../components/headers/Header";
import { PlaceInterface, VideoInterface } from "../../types/types";
import {
  getAllPlaceSlugs,
  getPlaceBySlug,
  getNearbyPlaces,
  getVideosForPlace,
  NearbyPlace,
} from "../../services/placeService";
import { RestaurantInfo } from "../../components/ui/RestaurantInfo";
import { Seo } from "../../components/seo/Seo";
import { JsonLd } from "../../components/seo/JsonLd";
import { NEARBY_PLACES_COUNT, SITE_NAME } from "../../config/constants";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildPlaceDescription,
  buildPlaceTitle,
  buildRestaurantJsonLd,
  getSiteUrl,
  JsonLd as JsonLdType,
} from "../../lib/seo";

/** How long a prerendered place page may serve stale before ISR regenerates it. */
const PLACE_REVALIDATE_SECONDS = 3600;

interface PlacePageProps {
  slug: string;
  place: PlaceInterface;
  videos: VideoInterface[];
  nearby: NearbyPlace[];
  canonical: string;
  title: string;
  description: string;
  socialImage?: string;
  jsonLd: JsonLdType[];
}

const PlacePage: React.FC<PlacePageProps> = ({
  place,
  videos,
  nearby,
  canonical,
  title,
  description,
  socialImage,
  jsonLd,
}) => {
  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Seo
        title={title}
        description={description}
        canonical={canonical}
        image={socialImage}
        imageAlt={place.name}
        type="article"
      />
      {jsonLd.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}
      <ResponsiveDrawer />
      
      <Container maxWidth="md" sx={{ mt: { xs: 2, sm: 4 }, mb: 4, px: { xs: 2, sm: 2 } }}>
        {/* A real breadcrumb rather than a "back" button: it emits crawlable anchors and
            mirrors the BreadcrumbList JSON-LD, which search engines require to match the
            visible page before they will render a breadcrumb trail in results. */}
        <Breadcrumbs
          aria-label="Breadcrumb"
          sx={{ mb: { xs: 2, sm: 3 }, fontWeight: 600 }}
        >
          <MuiLink
            component={NextLink}
            href="/"
            underline="hover"
            color="text.secondary"
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <ArrowBackIcon fontSize="small" />
            {SITE_NAME}
          </MuiLink>
          <Typography color="text.primary" sx={{ fontWeight: 600 }}>
            {place.name}
          </Typography>
        </Breadcrumbs>

        <Paper 
          elevation={0} 
          sx={{ 
            p: { xs: 2, sm: 4 }, 
            borderRadius: "24px", 
            border: "1px solid", 
            borderColor: "divider", 
            bgcolor: "background.paper",
            overflow: "hidden"
          }}
        >
          <Grid container spacing={{ xs: 3, sm: 4 }}>
            <Grid item xs={12}>
              <Box sx={{ textAlign: "left", mb: 1 }}>
                <Typography 
                  variant="h3" 
                  component="h1" 
                  fontWeight="800" 
                  color="text.primary"
                  sx={{ 
                    fontSize: { xs: "2rem", sm: "2.5rem" },
                    lineHeight: 1.1,
                    letterSpacing: -1
                  }}
                >
                  {place.name}
                </Typography>
              </Box>
              <Divider sx={{ mt: 3, mb: 1, borderStyle: "dashed" }} />
            </Grid>

            <Grid item xs={12}>
              <RestaurantInfo data={place} />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mt: 1 }}>
                <Accordion 
                  elevation={0} 
                  sx={{ 
                    border: "1px solid", 
                    borderColor: "divider", 
                    borderRadius: "16px !important", 
                    mb: 4, 
                    bgcolor: "action.hover",
                    overflow: "hidden"
                  }}
                >
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1.5}>
                      <AccessTimeIcon sx={{ color: "primary.main" }} />
                      <Typography fontWeight="bold">Operating Hours</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}>
                    {place.opening_hours?.weekday_text && place.opening_hours.weekday_text.length > 0 ? (
                      <Grid container spacing={1.5} sx={{ py: 1 }}>
                        {place.opening_hours.weekday_text.map((text, index) => (
                          <Grid item xs={12} key={index}>
                            <Typography variant="body2" sx={{ fontWeight: 500, display: "flex", justifyContent: "space-between" }}>
                              {text}
                            </Typography>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No hours listed</Typography>
                    )}
                  </AccordionDetails>
                </Accordion>

                <Box sx={{ mb: 4 }}>
                  <Typography variant="h6" component="h2" fontWeight="800" gutterBottom sx={{ mt: 6, mb: 3, display: "flex", alignItems: "center", gap: 1.5, letterSpacing: -0.5, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
                    <VideoLibraryIcon sx={{ color: "error.main", fontSize: "1.6rem" }} />
                    Featured in Videos
                  </Typography>
                  
                  {videos.map((video) => (
                    <Box key={video.videoId} sx={{ mb: 6 }}>
                      <Box
                        sx={{
                          position: "relative",
                          paddingTop: "56.25%",
                          width: "100%",
                          borderRadius: "20px",
                          overflow: "hidden",
                          boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                          bgcolor: "black",
                          mb: 2.5,
                          border: "1px solid",
                          borderColor: "divider"
                        }}
                      >
                        <ReactPlayer
                          url={`https://www.youtube.com/watch?v=${video.videoId}`}
                          width="100%"
                          height="100%"
                          style={{ position: "absolute", top: 0, left: 0 }}
                          controls
                        />
                      </Box>

                      {video.videoDescription && (
                        <Accordion 
                          elevation={0} 
                          sx={{ 
                            border: "1px solid", 
                            borderColor: "divider", 
                            borderRadius: "16px !important", 
                            bgcolor: "action.hover",
                            "&:before": { display: "none" }
                          }}
                        >
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Box display="flex" alignItems="center" gap={1.5}>
                              <DescriptionIcon color="action" sx={{ fontSize: "1.2rem" }} />
                              <Typography variant="body2" fontWeight="bold">Video Description</Typography>
                            </Box>
                          </AccordionSummary>
                          <AccordionDetails sx={{ bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}>
                            <Typography 
                              variant="body2" 
                              color="text.secondary" 
                              sx={{ 
                                whiteSpace: "pre-wrap", 
                                fontSize: "0.9rem",
                                lineHeight: 1.7
                              }}
                            >
                              {video.videoDescription}
                            </Typography>
                          </AccordionDetails>
                        </Accordion>
                      )}
                    </Box>
                  ))}
                </Box>
              </Box>
            </Grid>

            {nearby.length > 0 && (
              <Grid item xs={12}>
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
                    {nearby.map((item) => (
                      <Grid item xs={12} sm={6} key={item.slug}>
                        <Paper
                          component={NextLink}
                          href={`/place/${item.slug}`}
                          elevation={0}
                          sx={{
                            display: "block",
                            p: 2,
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
                              {item.formatted_address}
                            </Typography>
                          )}
                          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                            <Chip
                              size="small"
                              label={`${item.distanceKm} km away`}
                              sx={{ fontWeight: 600 }}
                            />
                            {typeof item.rating === "number" && (
                              <Chip size="small" variant="outlined" label={`★ ${item.rating}`} />
                            )}
                            {item.hasVeg && (
                              <Chip
                                size="small"
                                color="success"
                                variant="outlined"
                                label="Veg friendly"
                              />
                            )}
                          </Box>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Box>
              </Grid>
            )}

            <Grid item xs={12}>
              <Box sx={{ mt: { xs: 2, sm: 4 } }}>
                <Typography variant="h5" component="h2" fontWeight="800" gutterBottom sx={{ mb: 3, letterSpacing: -0.5 }}>
                  Comments & Discussion
                </Typography>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: { xs: 2, sm: 3 }, 
                    borderRadius: "20px", 
                    border: "1px solid", 
                    borderColor: "divider", 
                    bgcolor: "background.paper",
                    boxShadow: "0 4px 20px rgba(0,0,0,0.05)"
                  }}
                >
                  <DiscussionEmbed
                    shortname={process.env.NEXT_PUBLIC_DISQUS_SHORTNAME || "disqus-shortname"}
                    config={{
                      // The canonical URL, not `router.asPath`: the latter carries any
                      // query string, so arriving with a `?utm_source=…` tag would open a
                      // separate Disqus thread for the same restaurant.
                      url: canonical,
                      identifier: place.place_id,
                      title: place.name,
                    }}
                  />
                </Paper>
              </Box>
            </Grid>
          </Grid>
        </Paper>
      </Container>
    </Box>
  );
};

export const getStaticPaths = async () => {
  const places = await getAllPlaceSlugs();
  return {
    paths: places.map(({ slug }) => ({ params: { slug } })),
    /**
     * 'blocking' rather than true.
     *
     * With `fallback: true` the first request for a not-yet-generated page — which for a
     * newly synced restaurant is very often a crawler — receives a skeleton containing
     * "Loading delicious content..." and none of the actual content, with the real data
     * arriving only after client-side hydration. 'blocking' server-renders the complete
     * page before responding, so the first crawl sees the finished document and the
     * correct status code.
     */
    fallback: "blocking",
  };
};

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const { slug } = context.params!;
  const place = await getPlaceBySlug(slug as string);

  // Without `revalidate` these pages were frozen at build time, so a sync that attached a
  // new video to an existing place never surfaced until the next deploy.
  if (!place) {
    return { notFound: true, revalidate: PLACE_REVALIDATE_SECONDS };
  }

  const [videos, nearby] = await Promise.all([
    getVideosForPlace(place.videoIds),
    getNearbyPlaces(place, NEARBY_PLACES_COUNT),
  ]);

  const siteUrl = getSiteUrl();
  const canonical = absoluteUrl(siteUrl, `/place/${place.slug}`);

  // Prefer the stored place photo for social previews, falling back to a video thumbnail.
  // `allThumbnails` is already ordered place-photo-first by the sync.
  const socialImage =
    place.photoUrl ||
    place.allThumbnails?.find((thumb) => thumb.large || thumb.small)?.large ||
    place.allThumbnails?.find((thumb) => thumb.large || thumb.small)?.small ||
    place.thumbnail?.large ||
    place.thumbnail?.small ||
    null;

  const imageUrls = [socialImage].filter((url): url is string => Boolean(url));

  const jsonLd = [
    buildRestaurantJsonLd({ place, videos, pageUrl: canonical, imageUrls }),
    buildBreadcrumbJsonLd([
      { name: SITE_NAME, url: absoluteUrl(siteUrl, "/") },
      { name: place.name, url: canonical },
    ]),
  ];

  return {
    props: {
      slug,
      place,
      videos,
      nearby,
      canonical,
      title: buildPlaceTitle(place.name),
      description: buildPlaceDescription(place, videos.length),
      socialImage,
      jsonLd,
    },
    revalidate: PLACE_REVALIDATE_SECONDS,
  };
};

export default PlacePage;
