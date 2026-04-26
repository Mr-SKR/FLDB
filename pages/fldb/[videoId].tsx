import React from "react";
import {
  Typography,
  Grid,
  Box,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import { useRouter } from "next/router";
import ReactPlayer from "react-player";
import { DiscussionEmbed } from "disqus-react";
import Head from "next/head";

import ResponsiveDrawer from "../../components/headers/Header";
import CustomAccordion from "../../components/accordion/accordion";
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

  if (router.isFallback) {
    return <Typography sx={{ p: 4 }}>Loading...</Typography>;
  }

  if (!data) {
    return <Typography sx={{ p: 4 }}>Restaurant not found</Typography>;
  }

  return (
    <React.Fragment>
      <Head>
        <title>{data.name ? `FLDb: ${data.name}` : "Food Lovers Database (FLDb)"}</title>
        <meta
          name="description"
          content={data.videoTitle || "Food Lovers Database (FLDb)"}
          key="description"
        />
      </Head>
      <ResponsiveDrawer />
      
      <Container maxWidth="md" sx={{ mt: 2, mb: 4, px: { xs: 1, sm: 2 } }}>
        <Grid container spacing={3} justifyContent="center">
          <Grid item xs={12}>
            <Box
              sx={{
                position: "relative",
                paddingTop: "56.25%", // 16:9 aspect ratio
                width: "100%",
                borderRadius: 2,
                overflow: "hidden",
                boxShadow: 3,
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

          <Grid item xs={12} textAlign="center">
            <Typography variant="h5" component="h1" fontWeight="bold">
              {data.name?.toUpperCase() || "Unnamed Restaurant"}
            </Typography>
            <Typography variant="subtitle1" color="text.secondary">
              {data.videoTitle}
            </Typography>
          </Grid>

          <Grid item xs={12}>
            <RestaurantInfo data={data} />
          </Grid>

          <Grid item xs={12}>
            <Accordion>
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Typography fontWeight="bold">Operating hours</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography align="center">
                  {data.opening_hours?.weekday_text?.join(", ") || "N/A"}
                </Typography>
              </AccordionDetails>
            </Accordion>
          </Grid>

          <Grid item xs={12}>
            <CustomAccordion
              qid={1}
              title="Description"
              description={data.videoDescription || "N/A"}
            />
          </Grid>

          <Grid item xs={12}>
            <Box sx={{ mt: 4 }}>
              <DiscussionEmbed
                shortname={process.env.NEXT_PUBLIC_DISQUS_SHORTNAME || "disqus-shortname"}
                config={{
                  url: host + router.asPath,
                  identifier: videoId,
                  title: data.name || data.videoTitle,
                }}
              />
            </Box>
          </Grid>
        </Grid>
      </Container>
    </React.Fragment>
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
