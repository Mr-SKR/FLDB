import React, { useState, useEffect, forwardRef } from "react";
import ResponsiveDrawer from "../components/headers/Header";
import { Box, Typography, Container } from "@mui/material";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import FormControlLabel from "@mui/material/FormControlLabel";
import Switch from "@mui/material/Switch";
import TuneIcon from "@mui/icons-material/Tune";
import IconButton from "@mui/material/IconButton";
import RotateLeftIcon from "@mui/icons-material/RotateLeft";
import TextField from "@mui/material/TextField";
import Grid from "@mui/material/Grid";

import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";
import axios from "axios";
import Head from "next/head";

import FoodCard from "../components/cards/card";
import { getAccurateLocation } from "../utils/userLocation";
import { getDisplacementFromLatLonInKm } from "../utils/getGeoDisplacement";
import { VideoInterface } from "../types/types";

import { PAGE_SIZE } from "../config/constants";

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

interface UserLocation {
  lat: number;
  long: number;
  lastUpdated: number;
}

interface HomeProps {
  data: VideoInterface[];
}

function Home(props: HomeProps): JSX.Element {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("sm"));

  const { data } = props;

  const [userLocation, setUserLocation] = useState<UserLocation | null>();
  const [hasVeg, setHasVeg] = useState<boolean>(false);
  const [searchValue, setSearchValue] = useState<string>("");

  const [useLocation, setUseLocation] = useState<boolean>(false);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [prevPageEnabled, setPrevPageEnabled] = useState(false);
  const [nextPageEnabled, setNextPageEnabled] = useState(true);
  const [alertMessage, setAlertMessage] = useState<string>("");
  const [lastUpdated, setLastUpdated] = useState<number>();

  const [currentVideos, setCurrentVideos] = useState(data);
  const [currentPageVideos, setCurrentPageVideos] = useState(
    data.slice(0, PAGE_SIZE)
  );
  const [currentPage, setCurrentPage] = useState(0);

  const nextPage = () => {
    setCurrentPageVideos(
      currentVideos.slice(
        (currentPage + 1) * PAGE_SIZE,
        (currentPage + 2) * PAGE_SIZE
      )
    );

    setCurrentPage(currentPage + 1);
  };

  const prevPage = () => {
    setCurrentPageVideos(
      currentVideos.slice(
        (currentPage - 1) * PAGE_SIZE,
        currentPage * PAGE_SIZE
      )
    );
    setCurrentPage(currentPage - 1);
  };

  const handleToggleChange = (event: React.MouseEvent<HTMLElement>) => {
    if ((event.target as HTMLInputElement).value === "next")
      handleNextPageClick();
    else if ((event.target as HTMLInputElement).value === "prev")
      handlePrevPageClick();
  };

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }

    setOpenSnackbar(false);
  };

  const handleNextPageClick = () => {
    if ((currentPage + 1) * PAGE_SIZE < currentVideos.length) {
      nextPage();
      setPrevPageEnabled(true);
      window.scrollTo(0, 0);
    }
    if ((currentPage + 2) * PAGE_SIZE >= currentVideos.length) {
      setNextPageEnabled(false);
    }
  };

  const handlePrevPageClick = () => {
    if (currentPage - 1 >= 0) {
      prevPage();
      setNextPageEnabled(true);
      window.scrollTo(0, 0);
    }
    if (currentPage - 1 === 0) {
      setPrevPageEnabled(false);
    }
  };

  const calculateDispacement = (
    data: VideoInterface[],
    lat: number,
    long: number
  ): VideoInterface[] => {
    const result: VideoInterface[] = data.reduce(
      (oldRecord: VideoInterface[], newRecord) => {
        if (newRecord.name) {
          const displacement = Math.ceil(
            getDisplacementFromLatLonInKm(
              lat,
              long,
              newRecord.geometry.location.lat,
              newRecord.geometry.location.lng
            )
          );
          oldRecord.push({ ...newRecord, displacement });
        }
        return oldRecord;
      },
      []
    );
    const sortedData = result.sort((a, b) => a.displacement - b.displacement);

    return sortedData;
  };

  useEffect(() => {
    // if sessionStorage has location details, use that for calculating displacement
    const userLocation = sessionStorage.getItem("userLocation");
    const vegToggleOn = sessionStorage.getItem("vegToggleOn");

    if (userLocation && typeof userLocation !== "undefined") {
      const { lat, long, lastUpdated } = JSON.parse(userLocation);
      if (
        typeof lat === "number" &&
        typeof long === "number" &&
        typeof lastUpdated === "number"
      ) {
        setUserLocation({ lat, long, lastUpdated });
        setLastUpdated(lastUpdated);
      }
    }
    if (vegToggleOn && typeof vegToggleOn !== "undefined") {
      const hasVeg = JSON.parse(vegToggleOn);
      if (typeof hasVeg === "boolean") setHasVeg(hasVeg);
    }
  }, []);

  useEffect(() => {
    const setData = async () => {
      let newData: VideoInterface[];
      if (searchValue) {
        newData = data.filter((video) => {
          return video.videoTitle
            .toLowerCase()
            .includes(searchValue.toLowerCase());
        });
      } else {
        newData = [...data];
      }
      if (hasVeg) {
        newData = newData.filter((record: VideoInterface) => record.hasVeg);
        sessionStorage.setItem("vegToggleOn", JSON.stringify(true));
      } else {
        sessionStorage.setItem("vegToggleOn", JSON.stringify(false));
      }
      if (useLocation) {
        setUseLocation(false);

        try {
          const location: GeolocationPosition = await getAccurateLocation();
          console.log(location);
          const userLocation = {
            lat: location.coords.latitude,
            long: location.coords.longitude,
            lastUpdated: location.timestamp,
          };
          newData = calculateDispacement(
            newData,
            userLocation.lat,
            userLocation.long
          );
          sessionStorage.setItem("userLocation", JSON.stringify(userLocation));
          setUserLocation(userLocation);
          setLastUpdated(location.timestamp);
        } catch (error) {
          if ((error as Error).message.toLowerCase().includes("denied")) {
            console.log((error as Error).message);
          } else {
            console.error((error as Error).message);
          }
          setAlertMessage((error as Error).message);
          setOpenSnackbar(true);
          return;
        }
      }
      if (userLocation) {
        newData = calculateDispacement(
          newData,
          userLocation.lat,
          userLocation.long
        );
      }
      setCurrentVideos(newData);
      setCurrentPageVideos(newData.slice(0, PAGE_SIZE));
    };
    setData();
  }, [useLocation, userLocation, searchValue, hasVeg]);

  return (
    <React.Fragment>
      <Head>
        <title>Food Lovers Database (FLDb)</title>
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        <meta
          name="description"
          content="FLDb | Food Lovers Database: Restaurants to visit in Karnataka"
          key="description"
        />
      </Head>
      <ResponsiveDrawer />
      <Snackbar
        open={openSnackbar}
        autoHideDuration={6000}
        onClose={handleSnackbarClose}
      >
        <Alert
          onClose={handleSnackbarClose}
          severity="error"
          sx={{ width: "100%" }}
        >
          {alertMessage}
        </Alert>
      </Snackbar>

      <React.Fragment>
        <Box
          sx={{
            display: "flex",
            justfyContent: "center",
            alignItems: "center",
          }}
        >
          <Box
            component={Container}
            sx={{
              maxWidth: "720px",
              justfyContent: "center",
              marginTop: "0.5rem",
              marginBottom: "1rem",
            }}
          >
            <Accordion expanded sx={{ mb: "1rem" }}>
              <AccordionSummary
                expandIcon={<TuneIcon />}
                aria-controls="filter-controls"
                id="filters"
              >
                <Typography
                  align="center"
                  variant="h6"
                  sx={{
                    width: "100%",
                    fontWeight: "bold",
                  }}
                >
                  Food Lovers Database (FLDb)
                </Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Box>
                  <Grid container>
                    <Grid item xs={12}>
                      <TextField
                        id="outlined-basic"
                        label="Search by restaurant name, video title etc.,"
                        variant="outlined"
                        sx={{ width: "100%", mb: "2rem" }}
                        value={searchValue}
                        onChange={(e) => {
                          setSearchValue(e.target.value);
                        }}
                      />
                    </Grid>
                    <Grid
                      item
                      container
                      xs={12}
                      sm={6}
                      direction="row"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Grid item>
                        <FormControlLabel
                          control={
                            <Switch
                              value={useLocation}
                              checked={userLocation ? true : false}
                              onChange={() => {
                                if (userLocation) {
                                  setUserLocation(null);
                                  setUseLocation(false);
                                  sessionStorage.removeItem("userLocation");
                                } else {
                                  setUseLocation(true);
                                }
                              }}
                            />
                          }
                          label="Enable location access"
                        />
                      </Grid>
                    </Grid>
                    <Grid
                      item
                      container
                      xs={12}
                      sm={6}
                      direction="row"
                      justifyContent="center"
                      alignItems="center"
                    >
                      <Grid item>
                        <FormControlLabel
                          control={
                            <Switch
                              value={hasVeg}
                              checked={hasVeg}
                              onChange={() => {
                                setHasVeg(!hasVeg);
                              }}
                            />
                          }
                          label="Veg friendly restaurant"
                        />
                      </Grid>
                    </Grid>
                    {lastUpdated && userLocation ? (
                      <Grid
                        item
                        container
                        xs={12}
                        direction="row"
                        justifyContent="center"
                        alignItems="center"
                        sx={{ mt: "2rem" }}
                      >
                        <small>
                          {`Location last updated: ${new Date(
                            lastUpdated
                          ).toLocaleString()}`}
                        </small>

                        <IconButton
                          onClick={() => {
                            if (!userLocation) {
                              setAlertMessage(
                                "Enable location access to refresh"
                              );
                              setOpenSnackbar(true);
                            } else {
                              setUseLocation(true);
                            }
                          }}
                        >
                          <RotateLeftIcon />
                        </IconButton>
                      </Grid>
                    ) : null}
                  </Grid>
                </Box>
              </AccordionDetails>
            </Accordion>
            <Grid container spacing={2}>
              {currentVideos.length ? (
                currentPageVideos.reduce(
                  (oldRecord: JSX.Element[], newRecord, currentIndex) => {
                    if (newRecord.name) {
                      oldRecord.push(
                        <Grid item xs={12} lg={6}>
                          <FoodCard
                            key={newRecord._id}
                            videoId={newRecord.videoId}
                            title={newRecord.name}
                            description={newRecord.videoTitle}
                            displacement={newRecord.displacement}
                            hasVeg={newRecord.hasVeg}
                            height={isLargeScreen ? 480 : 180}
                            thumbnail={
                              isLargeScreen
                                ? newRecord?.thumbnail?.large
                                : newRecord?.thumbnail?.small
                            }
                            useLocation={useLocation}
                            setUseLocation={setUseLocation}
                            index={currentIndex}
                          />
                        </Grid>
                      );
                    }
                    return oldRecord;
                  },
                  []
                )
              ) : (
                <React.Fragment></React.Fragment>
              )}
            </Grid>

            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                marginBottom: "1rem",
              }}
            >
              <ToggleButtonGroup
                exclusive
                onChange={handleToggleChange}
                aria-label="text alignment"
              >
                <ToggleButton
                  value="prev"
                  aria-label="previous page"
                  disabled={!prevPageEnabled}
                >
                  PREV
                </ToggleButton>
                <ToggleButton
                  value="page"
                  aria-label="page"
                  disabled
                  sx={{ textTransform: "none" }}
                >
                  {currentPage + 1}/
                  {Math.ceil(currentVideos.length / PAGE_SIZE)}
                </ToggleButton>
                <ToggleButton
                  value="next"
                  aria-label="next page"
                  disabled={!nextPageEnabled}
                >
                  NEXT
                </ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>
        </Box>
      </React.Fragment>
    </React.Fragment>
  );
}

export const getStaticProps = async () => {
  const { data }: { data: VideoInterface[] } = await axios.get(
    process.env.NEXT_PUBLIC_FLDB_API_BASE_URL + "/videos",
    {
      params: {
        fields: "_id,videoId,name,videoTitle,geometry,hasVeg,thumbnail",
      },
      timeout: 10000,
    }
  );
  const sortedData = data.sort((a, b) => {
    if (a.name < b.name) return -1;
    if (a.name > b.name) return 1;
    return 0;
  });
  return {
    props: { data: sortedData },
    revalidate: 60,
  };
};

export default Home;
