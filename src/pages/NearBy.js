import { useState, useEffect } from "react";
import ResponsiveDrawer from "../components/headers/Header";
import { Box, Typography, Container } from "@mui/material";
import CircularProgress from "@mui/material/CircularProgress";

import FoodCard from "../components/cards/card";
import {
  getAccurateLocation,
  getLocationPermissionState,
} from "../utils/userLocation";

import { getDisplacementFromLatLonInKm } from "../utils/getGeoDisplacement";

const axios = require("axios").default;

function NearBy() {
  const [userLocation, setUserLocation] = useState(null);
  const [locationPermission, setLocationPermission] = useState(null);
  const [dataLoading, setDataLoading] = useState(false);
  const [locationComputing, setLocationComputing] = useState(false);
  const [data, setData] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState(null);

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
          process.env.REACT_APP_FLDB_API_BASE_URL + "/videos"
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
          setData(result);
          setDataLoading(false);
          setLoadingMessage(null);
        }
      } catch (error) {
        console.error(error.message);
        setDataLoading(false);
        setLoadingMessage(null);
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
        <Box
          component={Container}
          sx={{ maxWidth: "720px", justfyContent: "center" }}
        >
          {data.length ? (
            data
              .sort((a, b) => a.displacement - b.displacement)
              .reduce((oldRecord, newRecord) => {
                if (newRecord.name) {
                  oldRecord.push(
                    <FoodCard
                      key={newRecord._id}
                      videoId={newRecord.videoId}
                      title={newRecord.name}
                      description={newRecord.videoTitle}
                      displacement={newRecord.displacement}
                    />
                  );
                }
                return oldRecord;
              }, [])
          ) : (
            <Box
              sx={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                height: "100%",
                width: "100%",
              }}
            >
              {String(userLocation)}
              <Typography sx={{ textAlign: "center" }}>
                Oops! Something went worng!
              </Typography>
            </Box>
          )}
        </Box>
      </>
    );
  }
}

export default NearBy;
