import React, { useState, useEffect } from "react";
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
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import {
  Grade as GradeIcon,
  Directions as DirectionsIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
} from "@mui/icons-material";
import { useLocation } from "react-router-dom";
import ReactPlayer from "react-player";
import { DiscussionEmbed } from "disqus-react";

import ResponsiveDrawer from "../components/headers/Header";
import CustomAccordion from "../components/accordion/accordion";
import { VideoInterface } from "../types/types";

// const axios = require("axios").default;
import axios from "axios";

function FLDB(): JSX.Element {
  const location = useLocation();
  const videoId = location.pathname.split("/")[2];

  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<VideoInterface>();

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: response } = await axios.get(
          process.env.REACT_APP_FLDB_API_BASE_URL + "/videos/" + String(videoId)
        );
        setData(response);
      } catch (error) {
        console.error((error as Error).message);
      }
      setLoading(false);
    };

    fetchData();
  }, [videoId]);

  return loading ? (
    <React.Fragment>
      <Box
        sx={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          height: "100vh",
        }}
      >
        <CircularProgress />
      </Box>
    </React.Fragment>
  ) : (
    <React.Fragment>
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
            <Grid item xs={12} md={6} sx={{ width: "480px", height: "20rem" }}>
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
                  process.env.REACT_APP_DISQUS_SHORTNAME || "disqus-shortname"
                }
                config={{
                  url: window.location.href,
                  identifier: window.location.pathname.split("/")[2],
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

export default FLDB;
