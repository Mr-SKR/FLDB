import React, { useState, useEffect, forwardRef } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import logo from "../assets/img/walking-chef.gif";
import ResponsiveDrawer from "../components/headers/Header";
import windowDimensions from "../utils/windowDimensions";
import { Link } from "react-router-dom";

// const axios = require("axios").default;
import axios from "axios";
import { VideoInterface } from "../types/types";

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  props,
  ref
) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function Home(): JSX.Element {
  const { width } = windowDimensions();
  const [searchValue, setSearchValue] = useState<{ videoId?: string }>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<VideoInterface[]>([]);
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [openSnackbar, setOpenSnackbar] = useState<boolean>(false);

  const handleSnackbarClose = (
    _event?: React.SyntheticEvent | Event,
    reason?: string
  ) => {
    if (reason === "clickaway") {
      return;
    }

    setOpenSnackbar(false);
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setLoadingMessage("Fetching restaurant information");
      try {
        const { data: response } = await axios.get(
          process.env.REACT_APP_FLDB_API_BASE_URL + "/searchindices",
          {
            timeout: 10000,
          }
        );
        const sortedData = response.sort(
          (a: { videoTitle: string }, b: { videoTitle: string }) => {
            const nameA = a.videoTitle.toUpperCase();
            const nameB = b.videoTitle.toUpperCase();
            if (nameA < nameB) {
              return -1;
            }
            if (nameA > nameB) {
              return 1;
            }
            return 0;
          }
        );
        setData(sortedData);
      } catch (error) {
        setOpenSnackbar(true);
        console.error((error as Error).message);
      }
      setLoading(false);
      setLoadingMessage("");
    };

    fetchData();
  }, []);

  return loading ? (
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
      <Grid
        container
        direction="column"
        justifyContent="center"
        alignItems="center"
        spacing={2}
        sx={{
          height: `calc(100vh - ${width >= 600 ? 64 : 56}px)`,
        }}
      >
        <Grid item>
          <img
            src={logo}
            alt="logo"
            height="auto"
            // style="max-width:60vw;height:auto"
          />
        </Grid>
        <Grid
          item
          container
          justifyContent="center"
          alignItems="center"
          spacing={1}
        >
          <Grid item>
            <Autocomplete
              disablePortal
              sx={{ width: "70vw", maxWidth: "40rem" }}
              id="search-box"
              options={data}
              getOptionLabel={(option: {
                videoTitle: string;
                title: string;
                videoId: string;
              }) => option.videoTitle}
              isOptionEqualToValue={(option, value) =>
                option.title === value.title
              }
              onChange={(_event, newSearchValue) => {
                setSearchValue(newSearchValue || {});
              }}
              renderInput={(params) => (
                <TextField {...params} label="Select restaurant" />
              )}
            />
          </Grid>
          <Grid item>
            <Button
              variant="contained"
              sx={{ height: "56px" }}
              onClick={() => {
                if (searchValue.videoId) {
                  window.location.href = "/fldb/" + String(searchValue.videoId);
                }
              }}
            >
              Go
            </Button>
          </Grid>
        </Grid>
        <Grid item>
          <Button
            variant="text"
            sx={{ height: "56px", textTransform: "none" }}
            component={Link}
            to="/nearby"
            onClick={() => {
              if (searchValue.videoId) {
                window.location.href = "/fldb/" + String(searchValue.videoId);
              }
            }}
          >
            Nearby restaurants
          </Button>
        </Grid>
      </Grid>
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
    </React.Fragment>
  );
}

export default Home;
