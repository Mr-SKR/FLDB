import React, { useEffect, forwardRef } from "react";
import ResponsiveDrawer from "../components/headers/Header";
import {
  Typography,
  Container,
  Snackbar,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from "@mui/material";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import TuneIcon from "@mui/icons-material/Tune";
import Head from "next/head";

import { useGeolocation } from "../hooks/useGeolocation";
import { usePagination } from "../hooks/usePagination";
import { useVideoFilters } from "../hooks/useVideoFilters";
import { getAllVideos } from "../services/videoService";
import FoodCard from "../components/cards/card";
import { FilterSection } from "../components/ui/FilterSection";
import { PaginationSection } from "../components/ui/PaginationSection";
import { VideoInterface } from "../types/types";
import { PAGE_SIZE } from "../config/constants";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

interface HomeProps {
  data: VideoInterface[];
}

const Home: React.FC<HomeProps> = ({ data }) => {
  const theme = useTheme();
  const isLargeScreen = useMediaQuery(theme.breakpoints.up("sm"));

  const {
    userLocation,
    error: geoError,
    refreshLocation,
    clearLocation,
  } = useGeolocation();

  const {
    searchValue,
    setSearchValue,
    hasVeg,
    setHasVeg,
    filteredVideos,
  } = useVideoFilters(data, userLocation);

  const {
    currentPage,
    currentPageItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    resetPagination,
  } = usePagination(filteredVideos, PAGE_SIZE);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [searchValue, hasVeg, userLocation, resetPagination]);

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

      <Snackbar open={!!geoError} autoHideDuration={6000}>
        <Alert severity="error" sx={{ width: "100%" }}>
          {geoError}
        </Alert>
      </Snackbar>

      <Container maxWidth="md" sx={{ mt: 2, mb: 4 }}>
        <Accordion defaultExpanded sx={{ mb: 3 }}>
          <AccordionSummary expandIcon={<TuneIcon />}>
            <Typography align="center" variant="h6" sx={{ width: "100%", fontWeight: "bold" }}>
              Food Lovers Database (FLDb)
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <FilterSection
              searchValue={searchValue}
              setSearchValue={setSearchValue}
              userLocation={userLocation}
              refreshLocation={refreshLocation}
              clearLocation={clearLocation}
              hasVeg={hasVeg}
              setHasVeg={setHasVeg}
            />
          </AccordionDetails>
        </Accordion>

        <Grid container spacing={2}>
          {currentPageItems.map((video, index) => (
            <Grid item xs={12} lg={6} key={video._id}>
              <FoodCard
                videoId={video.videoId}
                title={video.name || "No title"}
                description={video.videoTitle}
                displacement={video.displacement || 0}
                hasVeg={video.hasVeg || false}
                height={isLargeScreen ? 480 : 180}
                thumbnail={isLargeScreen ? video.thumbnail?.large || "" : video.thumbnail?.small || ""}
                useLocation={!!userLocation}
                setUseLocation={refreshLocation}
                index={index}
              />
            </Grid>
          ))}
        </Grid>

        <PaginationSection
          currentPage={currentPage}
          totalPages={totalPages}
          hasNextPage={hasNextPage}
          hasPrevPage={hasPrevPage}
          onNext={nextPage}
          onPrev={prevPage}
        />
      </Container>
    </React.Fragment>
  );
};

export const getStaticProps = async () => {
  const data = await getAllVideos();

  // No need to sort here as useVideoFilters handles it
  return {
    props: { data },
    revalidate: 60,
  };
};

export default Home;
