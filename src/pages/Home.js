import { useState, useEffect, forwardRef } from "react";
import Box from "@mui/material/Box";
import Grid from "@mui/material/Grid";
import CircularProgress from "@mui/material/CircularProgress";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import Snackbar from "@mui/material/Snackbar";
import MuiAlert from "@mui/material/Alert";
import logo from "../assets/img/walking-chef.gif";
import ResponsiveDrawer from "../components/headers/Header";
import windowDimensions from "../utils/windowDimensions";
import { useTheme } from "@emotion/react";
import { Link } from "react-router-dom";

const axios = require("axios").default;

const Alert = forwardRef(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

function Home() {
  const { width } = windowDimensions();
  const theme = useTheme();
  const [searchValue, setSearchValue] = useState({});
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [loadingMessage, setLoadingMessage] = useState(null);
  const [openSnackbar, setOpenSnackbar] = useState(false);

  const handleSnackbarClose = (event, reason) => {
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
        const sortedData = response.sort((a, b) => {
          const nameA = a.videoTitle.toUpperCase();
          const nameB = b.videoTitle.toUpperCase();
          if (nameA < nameB) {
            return -1;
          }
          if (nameA > nameB) {
            return 1;
          }
          return 0;
        });
        setData(sortedData);
      } catch (error) {
        setOpenSnackbar(true);
        console.error(error.message);
      }
      setLoading(false);
      setLoadingMessage(null);
    };

    fetchData();
  }, []);

  return loading ? (
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
      <Grid
        container
        direction="column"
        justifyContent="center"
        alignItems="center"
        spacing={2}
        sx={{
          height: `calc(100vh - ${
            width >= 600
              ? theme.custom.appbarHeight.large
              : theme.custom.appbarHeight.small
          }px)`,
        }}
      >
        <Grid item>
          <img src={logo} alt="logo" max-width="60vw" height="auto" />
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
              getOptionLabel={(option) => option.videoTitle}
              isOptionEqualToValue={(option, value) =>
                option.title === value.title
              }
              onChange={(_event, newSearchValue) => {
                setSearchValue(newSearchValue);
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
                  window.location = "/fldb/" + String(searchValue.videoId);
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
                window.location = "/fldb/" + String(searchValue.videoId);
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
    </>
  );
}

export default Home;
