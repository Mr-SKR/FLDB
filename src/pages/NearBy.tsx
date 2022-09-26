import React, { useState, useEffect, forwardRef } from "react";
import ResponsiveDrawer from "../components/headers/Header";
import { Box, Typography, Container } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import Fab from "@mui/material/Fab";
import Tooltip from "@mui/material/Tooltip";
import axios from "axios";

import FoodCard from "../components/cards/card";
import {
  getAccurateLocation,
  getLocationPermissionState,
} from "../utils/userLocation";

import { getDisplacementFromLatLonInKm } from "../utils/getGeoDisplacement";
import windowDimensions from "../utils/windowDimensions";
import { VideoInterface } from "../types/types";

import { useAppSelector, useAppDispatch } from "../hooks";
import {
  setVideos,
  setCurrentVideos,
  setCurrentPageVideos,
  setCurrentPage,
  nextPage,
  prevPage,
} from "../features/video/videoSlice";

import { PAGE_SIZE } from "../config/constants";

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function NearBy(): JSX.Element {
  const { width } = windowDimensions();
  const [userLocation, setUserLocation] = useState<GeolocationPosition>();
  const [locationPermission, setLocationPermission] = useState<string>("");
  const [dataLoading, setDataLoading] = useState(false);
  const [locationComputing, setLocationComputing] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [prevPageEnabled, setPrevPageEnabled] = useState(false);
  const [nextPageEnabled, setNextPageEnabled] = useState(true);
  const [fabText, setFabText] = useState("Veg");

  const dispatch = useAppDispatch();
  const videoSelector = useAppSelector((state) => state.videos);
  const currentVideos: VideoInterface[] = videoSelector.currentVideos;
  const currentPageVideos: VideoInterface[] = videoSelector.currentPageVideos;
  const currentPage: number = videoSelector.currentPage;

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
      dispatch(nextPage());
      setPrevPageEnabled(true);
      window.scrollTo(0, 0);
    }
    if ((currentPage + 2) * PAGE_SIZE >= currentVideos.length) {
      setNextPageEnabled(false);
    }
  };

  const handlePrevPageClick = () => {
    if (currentPage - 1 >= 0) {
      dispatch(prevPage());
      setNextPageEnabled(true);
      window.scrollTo(0, 0);
    }
    if (currentPage - 1 === 0) {
      setPrevPageEnabled(false);
    }
  };

  if (!("geolocation" in navigator)) {
    alert("No geolocation available!");
    window.location.replace("/");
  }

  const onFABClick = () => {
    if (fabText === "Veg") {
      const result = videoSelector.videos.filter(
        (record: VideoInterface) => record.hasVeg
      );
      dispatch(setCurrentVideos(result));
      setFabText("All");
      dispatch(setCurrentPageVideos(result.slice(0, PAGE_SIZE)));
      dispatch(setCurrentPage(0));
    } else {
      dispatch(setCurrentVideos(videoSelector.videos));
      setFabText("Veg");
      dispatch(setCurrentPageVideos(videoSelector.videos.slice(0, PAGE_SIZE)));
      dispatch(setCurrentPage(0));
    }
  };

  useEffect(() => {
    const setData = async () => {
      setLocationComputing(true);
      setLoadingMessage("Obtaining user location");
      let currentLocation: GeolocationPosition;
      try {
        const location: GeolocationPosition = await getAccurateLocation();
        console.log(location);
        setUserLocation(location);
        currentLocation = location;
        setLocationPermission(await getLocationPermissionState());
        setLocationComputing(false);
      } catch (error) {
        if ((error as Error).message.toLowerCase().includes("denied")) {
          console.log((error as Error).message);
        } else {
          console.error((error as Error).message);
        }
        setLocationComputing(false);
        setLoadingMessage("");
      }

      try {
        setDataLoading(true);
        setLoadingMessage("Fetching restaurant information");
        const responseData = await axios.get(
          process.env.REACT_APP_FLDB_API_BASE_URL + "/videos",
          {
            params: {
              fields: "_id,videoId,name,videoTitle,geometry,hasVeg,thumbnail",
            },
            timeout: 10000,
          }
        );
        const response: VideoInterface[] = responseData.data;
        if (response) {
          setLoadingMessage("Claculating displacement");
          const result: VideoInterface[] = response.reduce(
            (oldRecord: VideoInterface[], newRecord) => {
              if (newRecord.name && currentLocation) {
                const displacement = Math.ceil(
                  getDisplacementFromLatLonInKm(
                    currentLocation.coords.latitude,
                    currentLocation.coords.longitude,
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
          const sortedData = result.sort(
            (a, b) => a.displacement - b.displacement
          );
          dispatch(setVideos(sortedData));
          dispatch(setCurrentVideos(sortedData));
          dispatch(setCurrentPageVideos(sortedData.slice(0, PAGE_SIZE)));
          setDataLoading(false);
          setLoadingMessage("");
        }
      } catch (error) {
        console.error((error as Error).message);
        setDataLoading(false);
        setLoadingMessage("");
        setOpenSnackbar(true);
        return;
      }
    };

    setData();
  }, []);

  if (locationPermission === "denied" || !userLocation) {
    return (
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100vw",
          height: "100vh",
        }}
      >
        <Typography sx={{ textAlign: "center" }}>
          Enable location access to this site. Guide to enable location:{" "}
          <a href="https://support.google.com/chrome/answer/142065?hl=en">
            Chrome
          </a>
          ,{" "}
          <a href="https://support.mozilla.org/bm/questions/1260334">Firefox</a>
          , <a href="https://discussions.apple.com/thread/252953307">Safari</a>
        </Typography>
      </Box>
    );
  } else if (userLocation) {
    return dataLoading || locationComputing ? (
      <React.Fragment>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            height: "100vh",
          }}
        >
          <CircularProgress />
          <Typography>{loadingMessage}</Typography>
        </Box>
      </React.Fragment>
    ) : (
      <React.Fragment>
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
            Request timed out. Try again
          </Alert>
        </Snackbar>
        {currentVideos.length && (
          <Tooltip
            title={fabText === "Veg" ? "Show me veg options" : "Show me all"}
          >
            <Fab
              aria-label="veg-toggle"
              color={fabText === "Veg" ? "secondary" : "primary"}
              onClick={onFABClick}
              sx={{
                position: "fixed",
                bottom: 20,
                right: 20,
                zIndex: 1,
              }}
            >
              {fabText}
            </Fab>
          </Tooltip>
        )}
        {currentVideos.length ? (
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
                {currentPageVideos.reduce(
                  (oldRecord: JSX.Element[], newRecord) => {
                    if (newRecord.name) {
                      oldRecord.push(
                        <FoodCard
                          key={newRecord._id}
                          videoId={newRecord.videoId}
                          title={newRecord.name}
                          description={newRecord.videoTitle}
                          displacement={newRecord.displacement}
                          hasVeg={newRecord.hasVeg}
                          height={width > 600 ? 480 : 180}
                          thumbnail={
                            width > 600
                              ? newRecord?.thumbnail?.large
                              : newRecord?.thumbnail?.small
                          }
                        />
                      );
                    }
                    return oldRecord;
                  },
                  []
                )}
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
        ) : (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              height: `calc(100vh - ${width >= 600 ? 56 : 64}px)`,
            }}
          >
            <Typography sx={{ textAlign: "center" }}>
              Oops! Something went worng!
            </Typography>
          </Box>
        )}
      </React.Fragment>
    );
  } else {
    return <React.Fragment></React.Fragment>;
  }
}

export default NearBy;
