import React from "react";
import {
  Typography,
  Grid,
  Box,
  Container,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Grade as GradeIcon,
  Directions as DirectionsIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
} from "@mui/icons-material";
import { useRouter } from "next/router";
import ReactPlayer from "react-player";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import { DiscussionEmbed } from "disqus-react";
import Head from "next/head";
import axios from "axios";

import ResponsiveDrawer from "../../components/headers/Header";
import CustomAccordion from "../../components/accordion/accordion";
import { VideoInterface } from "../../types/types";
import { getAllVideoIds } from "../../utils/video";

interface FLDBProps {
  videoId: string;
  data: VideoInterface;
  host: string;
}

function FLDB(props: FLDBProps): JSX.Element {
  const router = useRouter();
  const { videoId, data, host } = props;

  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("lg"));

  return (
    <React.Fragment>
      <Head>
        <title>
          {data?.name ? `FLDb: ${data.name}` : "Food Lovers Database (FLDb)"}
        </title>
        <meta
          name="description"
          content={
            data?.videoTitle
              ? `FLDb: ${data.videoTitle}`
              : "Food Lovers Database (FLDb)"
          }
          key="description"
        />
      </Head>
      <ResponsiveDrawer />
      <Box
        component={Container}
        sx={{
          maxWidth: "720px",
          justfyContent: "center",
          padding: "0",
        }}
      >
        {data && (
          <Grid container spacing={2} sx={{ justifyContent: "center" }}>
            <Grid
              item
              xs={12}
              md={6}
              sx={{
                width: `${isLargeScreen ? 640 : 360}px`,
                height: `${isLargeScreen ? 360 : 270}px`,
              }}
            >
              <ReactPlayer
                url={`https://www.youtube.com/watch?v=${videoId}`}
                width="100%"
                height="100%"
              />
            </Grid>

            <Grid item xs={12}>
              <Typography variant="h6" textAlign="center">
                {data.name
                  ? String(data.name).toUpperCase()
                  : "Unnamed Restaurant"}
              </Typography>
            </Grid>

            <Grid item xs={12}>
              <Typography variant="subtitle2" textAlign="center">
                {String(data.videoTitle)}
              </Typography>
            </Grid>
            <Grid
              item
              xs={12}
              md={6}
              sx={{
                marginBottom: "-2rem",
              }}
            >
              <List>
                <ListItem>
                  <ListItemIcon>
                    <GradeIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      data.rating ? (
                        <a
                          href={`https://search.google.com/local/reviews?placeid=${data.place_id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {String(data.rating)} / 5
                        </a>
                      ) : (
                        "N/A"
                      )
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <PhoneIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      data.international_phone_number ? (
                        <a href={`tel:${data.international_phone_number}`}>
                          {String(data.international_phone_number)}
                        </a>
                      ) : (
                        "N/A"
                      )
                    }
                  />
                </ListItem>
              </List>
            </Grid>
            <Grid item xs={12} md={6}>
              <List>
                <ListItem>
                  <ListItemIcon>
                    <DirectionsIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      data.url ? (
                        <a
                          href={data.url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {data.url}{" "}
                        </a>
                      ) : (
                        "N/A"
                      )
                    }
                  />
                </ListItem>
                <ListItem>
                  <ListItemIcon>
                    <LocationOnIcon />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      data.formatted_address
                        ? String(data.formatted_address)
                        : "N/A"
                    }
                  />
                </ListItem>
              </List>
            </Grid>

            <Grid item xs={12} sx={{ marginTop: "1rem" }}>
              <Accordion>
                <AccordionSummary
                  expandIcon={<ExpandMoreIcon />}
                  id="operating-hours-accordion"
                >
                  <Typography>Operating hours</Typography>
                </AccordionSummary>
                <AccordionDetails>
                  <Typography textAlign="center">
                    {data?.opening_hours?.weekday_text
                      ? String(data?.opening_hours?.weekday_text)
                      : "N/A"}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            </Grid>

            <Grid item xs={12} sx={{ marginBottom: "2rem" }}>
              <CustomAccordion
                qid={1}
                title="Description"
                description={
                  data.videoDescription ? String(data.videoDescription) : "N/A"
                }
              />
            </Grid>

            <Grid item xs={12} sx={{ marginLeft: "1rem", marginRight: "1rem" }}>
              <DiscussionEmbed
                shortname={
                  process.env.NEXT_PUBLIC_DISQUS_SHORTNAME || "disqus-shortname"
                }
                config={{
                  url: host + router.asPath,
                  identifier: router.asPath.split("/")[2],
                  title: data.name ? data.name : data.videoTitle,
                }}
              />
            </Grid>
          </Grid>
        )}
      </Box>
    </React.Fragment>
  );
}

interface GetStaticPathParam {
  params: {
    videoId: string;
  };
}

interface GetStaticPathsReturn {
  paths: GetStaticPathParam[];
  fallback: string | boolean;
}

export const getStaticPaths = async (): Promise<GetStaticPathsReturn> => {
  const videoIds = await getAllVideoIds();
  return {
    paths: videoIds.map((videoId) => {
      return { params: { videoId: videoId } };
    }),
    fallback: true, // can be true or false or 'blocking'
  };
};

interface GetStaticPropsContext {
  params: { videoId: string };
}

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const { videoId }: { videoId: string } = context.params;
  const { data } = await axios.get(
    process.env.NEXT_PUBLIC_FLDB_API_BASE_URL + "/videos/" + String(videoId)
  );
  const host = process.env.HOST;
  return {
    props: { videoId, data, host },
  };
};

export default FLDB;
