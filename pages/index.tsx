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
  Box,
  Divider,
  LinearProgress,
} from "@mui/material";
import MuiAlert, { AlertProps } from "@mui/material/Alert";
import TuneIcon from "@mui/icons-material/Tune";
import Head from "next/head";

import { useGeolocation } from "../hooks/useGeolocation";
import { usePagination } from "../hooks/usePagination";
import { usePlaceFilters } from "../hooks/usePlaceFilters";
import { getAllPlaces } from "../services/videoService";
import FoodCard from "../components/cards/card";
import { FilterSection } from "../components/ui/FilterSection";
import { PaginationSection } from "../components/ui/PaginationSection";
import { PlaceInterface } from "../types/types";
import { PAGE_SIZE } from "../config/constants";
import { useTheme } from "@mui/material/styles";
import useMediaQuery from "@mui/material/useMediaQuery";

const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(props, ref) {
  return <MuiAlert elevation={6} ref={ref} variant="filled" {...props} />;
});

interface HomeProps {
  data: PlaceInterface[];
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
    filteredPlaces,
    isSearching,
  } = usePlaceFilters(data, userLocation);

  const {
    currentPage,
    currentPageItems,
    totalPages,
    hasNextPage,
    hasPrevPage,
    nextPage,
    prevPage,
    resetPagination,
  } = usePagination(filteredPlaces, PAGE_SIZE);

  // Reset pagination when filters change
  useEffect(() => {
    resetPagination();
  }, [searchValue, hasVeg, userLocation, resetPagination]);

  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
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

      <Container maxWidth="md" sx={{ mt: { xs: 2, sm: 4 }, mb: 4 }}>
        <Accordion 
          defaultExpanded 
          elevation={0} 
          sx={{ 
            mb: 4, 
            borderRadius: "16px !important", 
            border: "1px solid", 
            borderColor: "divider",
            overflow: "hidden",
            bgcolor: "background.paper",
            "&:before": { display: "none" }
          }}
        >
          <AccordionSummary 
            expandIcon={<TuneIcon color="primary" />}
            sx={{ bgcolor: "background.paper" }}
          >
            <Typography variant="h6" sx={{ fontWeight: "bold", color: "text.primary" }}>
              Explore Restaurants
            </Typography>
          </AccordionSummary>
          <Divider />
          <AccordionDetails sx={{ bgcolor: "background.paper", p: { xs: 2, sm: 3 } }}>
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

        {isSearching && (
          <Box sx={{ width: '100%', mb: 4 }}>
            <LinearProgress />
          </Box>
        )}

        {currentPageItems.length > 0 ? (
          <Grid container spacing={3} alignItems="stretch">
            {currentPageItems.map((place, index) => (
              <Grid item xs={12} sm={6} key={place._id}>
                <FoodCard
                  slug={place.slug}
                  title={place.name}
                  address={place.formatted_address || ""}
                  displacement={place.displacement || 0}
                  hasVeg={place.hasVeg || false}
                  height={isLargeScreen ? 300 : 200}
                  thumbnail={isLargeScreen ? place.thumbnail?.large || "" : place.thumbnail?.small || ""}
                  useLocation={!!userLocation}
                  setUseLocation={refreshLocation}
                  index={index}
                />
              </Grid>
            ))}
          </Grid>
        ) : (
          <Box sx={{ textAlign: "center", py: 10 }}>
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No restaurants found matching your criteria
            </Typography>
            <Typography variant="body2" color="text.disabled">
              Try adjusting your search or filters
            </Typography>
          </Box>
        )}

        {totalPages > 1 && (
          <Box sx={{ mt: 6 }}>
            <PaginationSection
              currentPage={currentPage}
              totalPages={totalPages}
              hasNextPage={hasNextPage}
              hasPrevPage={hasPrevPage}
              onNext={nextPage}
              onPrev={prevPage}
            />
          </Box>
        )}
      </Container>
    </Box>
  );
};

export const getStaticProps = async () => {
  const data = await getAllPlaces();

  return {
    props: { data },
    revalidate: 60,
  };
};

export default Home;
