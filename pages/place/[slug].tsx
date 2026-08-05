import React from "react";
import {
  Typography,
  Grid,
  Box,
  Container,
  Breadcrumbs,
  Link as MuiLink,
  Paper,
  Divider,
  Stack,
} from "@mui/material";
import { ArrowBack as ArrowBackIcon } from "@mui/icons-material";
import NextLink from "next/link";
import { GetStaticPropsContext } from "next";

import ResponsiveDrawer from "../../components/headers/Header";
import { PlaceInterface, VideoInterface } from "../../types/types";
import {
  getAllPlaceSlugs,
  getPlaceBySlug,
  getNearbyPlaces,
  getVideosForPlace,
  NearbyPlace,
} from "../../services/placeService";
import { RestaurantInfo } from "../../components/ui/RestaurantInfo";
import { PlaceGallery } from "../../components/ui/PlaceGallery";
import { PlaceMetaRow, BusinessStatusNotice } from "../../components/ui/PlaceMeta";
import { OpeningHours } from "../../components/ui/OpeningHours";
import { VideoSection } from "../../components/ui/VideoSection";
import { NearbyPlaces } from "../../components/ui/NearbyPlaces";
import { CommentsSection } from "../../components/ui/CommentsSection";
import { ShareButton } from "../../components/ui/ShareButton";
import { Footer } from "../../components/ui/Footer";
import { Seo } from "../../components/seo/Seo";
import { JsonLd } from "../../components/seo/JsonLd";
import { collectPlaceImages, PlaceImage } from "../../utils/images";
import { NEARBY_PLACES_COUNT, SITE_NAME } from "../../config/constants";
import {
  absoluteUrl,
  buildBreadcrumbJsonLd,
  buildPlaceDescription,
  buildPlaceTitle,
  buildRestaurantJsonLd,
  getSiteUrl,
  JsonLd as JsonLdType,
} from "../../lib/seo";

/** How long a prerendered place page may serve stale before ISR regenerates it. */
const PLACE_REVALIDATE_SECONDS = 3600;

interface PlacePageProps {
  slug: string;
  place: PlaceInterface;
  videos: VideoInterface[];
  nearby: NearbyPlace[];
  images: PlaceImage[];
  canonical: string;
  title: string;
  description: string;
  socialImage?: string;
  jsonLd: JsonLdType[];
}

const PlacePage: React.FC<PlacePageProps> = ({
  place,
  videos,
  nearby,
  images,
  canonical,
  title,
  description,
  socialImage,
  jsonLd,
}) => {
  return (
    <Box sx={{ bgcolor: "background.default", minHeight: "100vh" }}>
      <Seo
        title={title}
        description={description}
        canonical={canonical}
        image={socialImage}
        imageAlt={place.name}
        type="article"
      />
      {jsonLd.map((data, index) => (
        <JsonLd key={index} data={data} />
      ))}
      <ResponsiveDrawer />

      {/* The page's main landmark. Without one there is nothing for a screen reader's
          "jump to main content" to land on, and every page here was header-then-soup. */}
      <Container
        component="main"
        maxWidth="md"
        sx={{ mt: { xs: 2, sm: 4 }, mb: 4, px: { xs: 2, sm: 2 } }}
      >
        {/* A real breadcrumb rather than a "back" button: it emits crawlable anchors and
            mirrors the BreadcrumbList JSON-LD, which search engines require to match the
            visible page before they will render a breadcrumb trail in results. */}
        <Breadcrumbs
          aria-label="Breadcrumb"
          sx={{ mb: { xs: 2, sm: 3 }, fontWeight: 600 }}
        >
          <MuiLink
            component={NextLink}
            href="/"
            underline="hover"
            color="text.secondary"
            sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
          >
            <ArrowBackIcon fontSize="small" />
            {SITE_NAME}
          </MuiLink>
          <Typography color="text.primary" sx={{ fontWeight: 600 }}>
            {place.name}
          </Typography>
        </Breadcrumbs>

        <Paper
          elevation={0}
          sx={{
            p: { xs: 2, sm: 4 },
            borderRadius: "24px",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
            overflow: "hidden",
          }}
        >
          <Grid container spacing={{ xs: 3, sm: 4 }}>
            {images.length > 0 && (
              <Grid item xs={12}>
                <PlaceGallery
                  images={images}
                  name={place.name}
                  photoAttribution={place.photoAttribution}
                />
              </Grid>
            )}

            <Grid item xs={12}>
              <Stack
                direction="row"
                spacing={2}
                alignItems="flex-start"
                justifyContent="space-between"
              >
                <Box sx={{ textAlign: "left", minWidth: 0 }}>
                  <Typography
                    variant="h3"
                    component="h1"
                    fontWeight="800"
                    color="text.primary"
                    sx={{
                      fontSize: { xs: "2rem", sm: "2.5rem" },
                      lineHeight: 1.1,
                      letterSpacing: -1,
                    }}
                  >
                    {place.name}
                  </Typography>
                  {/* Rating with its review count, live open/closed state, and diet. All
                      three were either buried or absent; they are what someone deciding
                      whether to go actually reads. */}
                  <PlaceMetaRow
                    rating={place.rating}
                    ratingsTotal={place.user_ratings_total}
                    weekdayText={place.opening_hours?.weekday_text}
                    hasVeg={place.hasVeg}
                  />
                </Box>
                <Box sx={{ pt: 0.5 }}>
                  <ShareButton
                    title={place.name}
                    text={`${place.name} on ${SITE_NAME}`}
                    url={canonical}
                  />
                </Box>
              </Stack>

              {place.business_status && place.business_status !== "OPERATIONAL" && (
                <Box sx={{ mt: 2 }}>
                  <BusinessStatusNotice status={place.business_status} />
                </Box>
              )}

              <Divider sx={{ mt: 3, mb: 1, borderStyle: "dashed" }} />
            </Grid>

            <Grid item xs={12}>
              <RestaurantInfo data={place} />
            </Grid>

            <Grid item xs={12}>
              <Box sx={{ mt: 1 }}>
                <OpeningHours weekdayText={place.opening_hours?.weekday_text} />
                <VideoSection videos={videos} />
              </Box>
            </Grid>

            {nearby.length > 0 && (
              <Grid item xs={12}>
                <NearbyPlaces places={nearby} />
              </Grid>
            )}

            <Grid item xs={12}>
              <CommentsSection
                url={canonical}
                identifier={place.place_id}
                title={place.name}
              />
            </Grid>
          </Grid>
        </Paper>
      </Container>

      <Footer />
    </Box>
  );
};

export const getStaticPaths = async () => {
  const places = await getAllPlaceSlugs();
  return {
    paths: places.map(({ slug }) => ({ params: { slug } })),
    /**
     * 'blocking' rather than true.
     *
     * With `fallback: true` the first request for a not-yet-generated page (which for a
     * newly synced restaurant is very often a crawler) receives a skeleton containing
     * "Loading delicious content..." and none of the actual content, with the real data
     * arriving only after client-side hydration. 'blocking' server-renders the complete
     * page before responding, so the first crawl sees the finished document and the
     * correct status code.
     */
    fallback: "blocking",
  };
};

export const getStaticProps = async (context: GetStaticPropsContext) => {
  const { slug } = context.params!;
  const place = await getPlaceBySlug(slug as string);

  // Without `revalidate` these pages were frozen at build time, so a sync that attached a
  // new video to an existing place never surfaced until the next deploy.
  if (!place) {
    return { notFound: true, revalidate: PLACE_REVALIDATE_SECONDS };
  }

  const [videos, nearby] = await Promise.all([
    getVideosForPlace(place.videoIds),
    getNearbyPlaces(place, NEARBY_PLACES_COUNT),
  ]);

  const siteUrl = getSiteUrl();
  const canonical = absoluteUrl(siteUrl, `/place/${place.slug}`);

  // The gallery's images, resolved here rather than in the component so the same list backs
  // the social preview below and the page itself cannot disagree with the card that led
  // here about which photograph belongs to this place.
  const images = collectPlaceImages(place);

  // Prefer the stored place photo for social previews, falling back to a video thumbnail.
  // `allThumbnails` is already ordered place-photo-first by the sync.
  const socialImage = place.photoUrl || images[0]?.url || null;

  const imageUrls = [socialImage].filter((url): url is string => Boolean(url));

  const jsonLd = [
    buildRestaurantJsonLd({ place, videos, pageUrl: canonical, imageUrls }),
    buildBreadcrumbJsonLd([
      { name: SITE_NAME, url: absoluteUrl(siteUrl, "/") },
      { name: place.name, url: canonical },
    ]),
  ];

  return {
    props: {
      slug,
      place,
      videos,
      nearby,
      images,
      canonical,
      title: buildPlaceTitle(place.name),
      description: buildPlaceDescription(place, videos.length),
      socialImage,
      jsonLd,
    },
    revalidate: PLACE_REVALIDATE_SECONDS,
  };
};

export default PlacePage;
