import { useState, useEffect, forwardRef } from "react";
import ResponsiveDrawer from "../components/headers/Header";
import { Box, Typography, Container } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";

import FoodCard from "../components/cards/card";
import {
  getAccurateLocation,
  getLocationPermissionState,
} from "../utils/userLocation";

import { getDisplacementFromLatLonInKm } from "../utils/getGeoDisplacement";
import windowDimensions from "../utils/windowDimensions";
import { useTheme } from "@emotion/react";

const axios = require("axios").default;

const Alert = forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function NearBy() {
  const pageSize = 10;
  const { width } = windowDimensions();
  const theme = useTheme();
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [locationComputing, setLocationComputing] = useState(false);
  const [data, setData] = useState([]);
  const [currentPageData, setCurrentPageData] = useState([]);
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [loadingMessage, setLoadingMessage] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);
  const [prevPageEnabled, setPrevPageEnabled] = useState(false);
  const [nextPageEnabled, setNextPageEnabled] = useState(true);

  const handleToggleChange = (event, newAlignment) => {
    console.log(event.target.value);
    if (event.target.value === "next") handleNextPageClick();
    else if (event.target.value === "prev") handlePrevPageClick();
  };

  const handleSnackbarClose = (event, reason) => {
    if (reason === "clickaway") {
      return;
    }
    setOpenSnackbar(false);
  };

  const handleNextPageClick = () => {
    if ((currentPageIndex + 1) * pageSize < data.length) {
      setCurrentPageData(
        data.slice(
          (currentPageIndex + 1) * pageSize,
          (currentPageIndex + 2) * pageSize
        )
      );
      setCurrentPageIndex(currentPageIndex + 1);
      setPrevPageEnabled(true);
      window.scrollTo(0, 0);
    }
    if ((currentPageIndex + 2) * pageSize > data.length) {
      setNextPageEnabled(false);
    }
  };

  const handlePrevPageClick = () => {
    if (currentPageIndex - 1 >= 0) {
      setCurrentPageData(
        data.slice(
          (currentPageIndex - 1) * pageSize,
          currentPageIndex * pageSize
        )
      );
      setCurrentPageIndex(currentPageIndex - 1);
      setNextPageEnabled(true);
      window.scrollTo(0, 0);
    }
    if (currentPageIndex - 1 === 0) {
      setPrevPageEnabled(false);
    }
  };

  if (!("geolocation" in navigator)) {
    alert("No geolocation available!");
    window.location.replace("/");
  }

  useEffect(() => {
    (async () => {
      setLocationComputing(true);
      setLoadingMessage("Obtaining user location");
      let currentLocation = null;
      try {
        const location = await getAccurateLocation();
        console.log(location);
        setUserLocation(location);
        currentLocation = location;
        setLocationPermission(await getLocationPermissionState());
        setLocationComputing(false);
      } catch (error) {
        if (error.message.toLowerCase().includes("denied")) {
          console.log(error.message);
        } else {
          console.error(error.message);
        }
        setLocationComputing(false);
        setLoadingMessage(null);
      }

      try {
        setDataLoading(true);
        setLoadingMessage("Fetching restaurant information");
        const { data: response } = await axios.get(
          process.env.REACT_APP_FLDB_API_BASE_URL + "/videos",
          {
            params: {
              fields: "_id,videoId,name,videoTitle,geometry,hasVeg,thumbnail",
            },
            timeout: 10000,
          }
        );

        if (response) {
          setLoadingMessage("Claculating displacement");
          const result = response.reduce((oldRecord, newRecord) => {
            if (newRecord.name && currentLocation) {
              const displacement = Math.ceil(
                getDisplacementFromLatLonInKm(
                  currentLocation.coords.latitude,
                  currentLocation.coords.longitude,
                  newRecord.geometry.location.lat,
                  newRecord.geometry.location.lng
                )
              );
              oldRecord.push({ displacement, ...newRecord });
            }

            return oldRecord;
          }, []);
          const sortedData = result.sort(
            (a, b) => a.displacement - b.displacement
          );
          setData(sortedData);
          setCurrentPageData(sortedData.slice(0, pageSize));
          setDataLoading(false);
          setLoadingMessage(null);
        }
      } catch (error) {
        console.error(error.message);
        setDataLoading(false);
        setLoadingMessage(null);
        setOpenSnackbar(true);
        return;
      }
    })();
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
      <>
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
      </>
    ) : (
      <>
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
        {data.length ? (
          <Box
            sx={{
              display: "flex",
              justfyContent: "center",
              alignItems: "center",
            }}
          >
            <Box
              component={Container}
              sx={{ maxWidth: "720px", justfyContent: "center" }}
            >
              {currentPageData.reduce((oldRecord, newRecord) => {
                if (newRecord.name) {
                  oldRecord.push(
                    <FoodCard
                      key={newRecord._id}
                      videoId={newRecord.videoId}
                      title={newRecord.name}
                      description={newRecord.videoTitle}
                      displacement={newRecord.displacement}
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
              }, [])}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: "1rem",
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
                    {currentPageIndex + 1}/{data.length / pageSize}
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
        ) : (
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              width: "100%",
              height: `calc(100vh - ${
                width >= 600
                  ? theme.custom.appbarHeight.small
                  : theme.custom.appbarHeight.large
              }px)`,
            }}
          >
            <Typography sx={{ textAlign: "center" }}>
              Oops! Something went worng!
            </Typography>
          </Box>
        )}
      </>
    );
  }
}

export default NearBy;
