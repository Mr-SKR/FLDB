import { useState, useEffect } from "react";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import TextField from "@mui/material/TextField";
import Autocomplete from "@mui/material/Autocomplete";
import Button from "@mui/material/Button";
import logo from "../assets/img/mochi-peachcat-cat.gif";
import ResponsiveDrawer from "../components/headers/Header";
import windowDimensions from "../utils/windowDimensions";
import { useTheme } from "@emotion/react";

const axios = require("axios").default;

function Home() {
  const { width } = windowDimensions();
  const theme = useTheme();
  const [searchValue, setSearchValue] = useState({});
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const { data: response } = await axios.get(
          process.env.REACT_APP_FLDB_API_BASE_URL + "/searchindices"
        );
        setData(response);
      } catch (error) {
        console.error(error.message);
      }
      setLoading(false);
    };

    fetchData();
  }, []);

  return loading ? (
    <>
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
    </>
  ) : (
    <>
      <ResponsiveDrawer />
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          height: `calc(100vh - ${
            width >= 600
              ? theme.custom.appbarHeight.small
              : theme.custom.appbarHeight.large
          }px)`,
        }}
      >
        <img src={logo} alt="logo" max-width="50vw" height="auto" />
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            mt: "3rem",
          }}
        >
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
          <Button
            variant="contained"
            sx={{ height: "56px", ml: "5px" }}
            onClick={() => {
              window.location = "/fldb/" + String(searchValue.videoId);
            }}
          >
            Go
          </Button>
        </Box>
      </Box>
    </>
  );
}

export default Home;
