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
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import DescriptionIcon from "@mui/icons-material/Description";
import { useRouter } from "next/router";
import ReactPlayer from "react-player";
import { DiscussionEmbed } from "disqus-react";
import Head from "next/head";

import ResponsiveDrawer from "../../components/headers/Header";
import { VideoInterface } from "../../types/types";
import { getAllVideoIds, getVideoById } from "../../services/videoService";
import { RestaurantInfo } from "../../components/ui/RestaurantInfo";

interface FLDBProps {
  videoId: string;
  data: VideoInterface;
  host: string;
}

const FLDB: React.FC<FLDBProps> = ({ videoId, data, host }) => {
  const router = useRouter();
  const theme = useTheme();

  if (router.isFallback) {
    return (
      <Container maxWidth="md" sx={{ py: 10, textAlign: "center" }}>
        <Typography variant="h5">Loading delicious content...</Typography>
      </Container>
    );
  }

  if (!data) {
    return (
      <Container maxWidth="md" sx={{ py: 10, textAlign: "center" }}>
        <Typography variant="h5">Restaurant not found</Typography>
        <Button startIcon={<ArrowBackIcon />} onClick={() => router.push("/")} sx={{ mt: 2 }}>
          Back to Database
        </Button>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Head>
        <title>{data.name ? `FLDb: ${data.name}` : "Food Lovers Database (FLDb)"}</title>
        <meta
          name="description"
          content={data.videoTitle || "Food Lovers Database (FLDb)"}
          key="description"
        />
      </Head>
      <ResponsiveDrawer />
      
      <Container maxWidth="md" sx={{ mt: { xs: 2, sm: 4 }, mb: 4, px: { xs: 1, sm: 2 } }}>
        <Button 
          startIcon={<ArrowBackIcon />} 
          onClick={() => router.push("/")}
          sx={{ mb: { xs: 1, sm: 3 }, textTransform: "none", color: "text.secondary" }}
        >
          Back to list
        </Button>

        <Paper elevation={0} sx={{ p: { xs: 2, sm: 4 }, borderRadius: { xs: "12px", sm: "16px" }, border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
          <Grid container spacing={{ xs: 2, sm: 4 }}>
            <Grid item xs={12}>
              <Box
                sx={{
                  position: "relative",
                  paddingTop: "56.25%", // 16:9 aspect ratio
                  width: "100%",
                  borderRadius: "12px",
                  overflow: "hidden",
                  boxShadow: 2,
                  bgcolor: "black",
                }}
              >
                <ReactPlayer
                  url={`https://www.youtube.com/watch?v=${videoId}`}
                  width="100%"
                  height="100%"
                  style={{ position: "absolute", top: 0, left: 0 }}
                  controls
                />
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ textAlign: "center", mb: 1 }}>
                <Typography 
                  variant="h4" 
                  component="h1" 
                  fontWeight="bold" 
                  gutterBottom 
                  color="text.primary"
                  sx={{ 
                    fontSize: { xs: "1.5rem", sm: "2.125rem" },
                    lineHeight: 1.2
                  }}
                >
                  {data.name || "Unnamed Restaurant"}
                </Typography>
                <Typography 
                  variant="h6" 
                  color="text.secondary" 
                  sx={{ 
                    fontStyle: "italic", 
                    fontSize: { xs: "0.9rem", sm: "1.1rem" },
                    px: { xs: 1, sm: 0 }
                  }}
                >
                  {data.videoTitle}
                </Typography>
              </Box>
              <Divider sx={{ my: { xs: 2, sm: 3 } }} />
            </Grid>

            <Grid item xs={12}>
              <RestaurantInfo data={data} />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mt: 1 }}>
                <Accordion elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px !important", mb: 2, bgcolor: "background.paper" }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <AccessTimeIcon color="action" />
                      <Typography fontWeight="bold" sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>Operating Hours</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: "action.hover", borderRadius: "0 0 12px 12px" }}>
                    {data.opening_hours?.weekday_text && data.opening_hours.weekday_text.length > 0 ? (
                      <Grid container spacing={1}>
                        {data.opening_hours.weekday_text.map((text, index) => (
                          <Grid item xs={12} key={index}>
                            <Typography variant="body2" sx={{ fontSize: { xs: "0.85rem", sm: "0.875rem" } }}>{text}</Typography>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary">No hours listed</Typography>
                    )}
                  </AccordionDetails>
                </Accordion>

                <Accordion elevation={0} sx={{ border: "1px solid", borderColor: "divider", borderRadius: "12px !important", bgcolor: "background.paper" }}>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Box display="flex" alignItems="center" gap={1}>
                      <DescriptionIcon color="action" />
                      <Typography fontWeight="bold" sx={{ fontSize: { xs: "0.9rem", sm: "1rem" } }}>Video Description</Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ bgcolor: "action.hover", borderRadius: "0 0 12px 12px" }}>
                    <Typography 
                      variant="body2" 
                      sx={{ 
                        whiteSpace: "pre-wrap",
                        fontSize: { xs: "0.85rem", sm: "0.875rem" },
                        lineHeight: 1.6
                      }}
                    >
                      {data.videoDescription || "No description available."}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
              </Box>
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mt: { xs: 3, sm: 6 } }}>
                <Typography variant="h6" fontWeight="bold" gutterBottom sx={{ px: 1, color: "text.primary", fontSize: { xs: "1.1rem", sm: "1.25rem" } }}>
                  Comments & Discussion
                </Typography>
                <Paper elevation={0} sx={{ p: { xs: 1, sm: 2 }, borderRadius: "12px", border: "1px solid", borderColor: "divider", bgcolor: "background.paper" }}>
                  <DiscussionEmbed
                    key={theme.palette.mode}
                    shortname={process.env.NEXT_PUBLIC_DISQUS_SHORTNAME || "disqus-shortname"}
                    config={{
                      url: (host || "https://fl-db.in") + router.asPath,
                      identifier: videoId,
                      title: data.name || data.videoTitle,
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
  const videoIds = await getAllVideoIds();
  return {
    paths: videoIds.map((videoId) => ({ params: { videoId } })),
    fallback: true,
  };
};

export const getStaticProps = async (context: any) => {
  const { videoId } = context.params;
  const data = await getVideoById(videoId as string);

  if (!data) {
    return { notFound: true };
  }

  const host = process.env.HOST || "";
  return {
    props: { videoId, data, host },
  };
};

export default FLDB;
