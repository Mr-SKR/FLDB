import React from "react";
import {
  Typography,
  Grid,
  Box,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Button,
  Paper,
  Divider,
} from "@mui/material";
import { useTheme } from "@mui/material/styles";
import {
  ExpandMore as ExpandMoreIcon,
  ArrowBack as ArrowBackIcon,
  AccessTime as AccessTimeIcon,
  VideoLibrary as VideoLibraryIcon,
  Description as DescriptionIcon,
} from "@mui/icons-material";
import { useRouter } from "next/router";
import ReactPlayer from "react-player";
import { DiscussionEmbed } from "disqus-react";
import Head from "next/head";
import { GetStaticPropsContext } from "next";

import ResponsiveDrawer from "../../components/headers/Header";
import { PlaceInterface, VideoInterface } from "../../types/types";
import { getAllPlaceSlugs, getPlaceBySlug, getVideosForPlace } from "../../services/placeService";
import { RestaurantInfo } from "../../components/ui/RestaurantInfo";

interface PlacePageProps {
  slug: string;
  place: PlaceInterface;
  videos: VideoInterface[];
  host: string;
}

const PlacePage: React.FC<PlacePageProps> = ({ place, videos, host }) => {
  const router = useRouter();
  const theme = useTheme();

  if (router.isFallback) {
    return (
      <Container maxWidth="md" sx={{ py: 10, textAlign: "center" }}>
        <Typography variant="h5">Loading delicious content...</Typography>
      </Container>
    );
  }

  if (!place) {
    return (
      <Container maxWidth="md" sx={{ py: 10, textAlign: "center" }}>
        <Typography variant="h5">Place not found</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/")} sx={{ mt: 2 }}>
          Back to Database
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Head>
        <title>{`FLDb: ${place.name}`}</title>
        <meta
          name="description"
          content={`Explore ${place.name} on Food Lovers Database (FLDb)`}
          key="description"
        />
      </Head>
      <ResponsiveDrawer />
      
      <Container maxWidth="md" sx={{ mt: { xs: 2, sm: 4 }, mb: 4, px: { xs: 2, sm: 2 } }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => router.push("/")}
          sx={{ mb: { xs: 2, sm: 3 }, textTransform: "none", color: "text.secondary", fontWeight: 600 }}
        >
          Back to home
        </Button>

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
                  <Typography variant="h6" fontWeight="800" gutterBottom sx={{ mt: 6, mb: 3, display: "flex", alignItems: "center", gap: 1.5, letterSpacing: -0.5, fontSize: { xs: "1.25rem", sm: "1.5rem" } }}>
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

            <Grid item xs={12}>
              <Box sx={{ mt: { xs: 2, sm: 4 } }}>
                <Typography variant="h5" fontWeight="800" gutterBottom sx={{ mb: 3, letterSpacing: -0.5 }}>
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
                      url: (host || "https://fl-db.in") + router.asPath,
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
  const slugs = await getAllPlaceSlugs();
  return {
    paths: slugs.map((slug) => ({ params: { slug } })),
    fallback: true,
  };
};

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const { slug } = context.params!;
  const place = await getPlaceBySlug(slug as string);

  if (!place) {
    return { notFound: true };
  }

  const videos = await getVideosForPlace(place.videoIds);

  const host = process.env.HOST || "";
  return {
    props: { slug, place, videos, host },
  };
};

export default PlacePage;
