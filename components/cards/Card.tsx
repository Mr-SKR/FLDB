import React, { useState, useEffect } from "react";
import {
  Button,
  Typography,
  Box,
  Chip,
  Rating,
  Stack,
} from "@mui/material";
import Image from "next/image";
import NextLink from "next/link";
import { useRouter } from "next/router";
import {
  Restaurant as RestaurantIcon,
  LocationOn as LocationOnIcon,
  Directions as DirectionsIcon,
} from "@mui/icons-material";

interface FoodCardProps {
  slug: string;
  height: string | number;
  thumbnail: string;
  allThumbnails?: { small?: string; large?: string; source?: "place" | "youtube" }[];
  title: string;
  address: string;
  displacement: number;
  hasVeg: boolean;
  useLocation: boolean;
  index: number;
  setUseLocation: (force?: boolean) => Promise<boolean>;
  rating?: number;
  url?: string;
  /** Google's html_attributions for the place photo; required to be displayed. */
  photoAttribution?: string[];
}

/**
 * YouTube thumbnails are already well-compressed JPEGs on Google's own CDN, which serves
 * them for free. Routing them through Vercel's optimizer would spend a hard-capped resource
 * (5,000 image transformations/month on Hobby, shared with the place photos) for very little
 * gain, so they are rendered as-is. Place photos from blob storage stay optimised.
 *
 * Keyed on the host rather than the `source` field, since the single-thumbnail fallback
 * path carries no source.
 */
const isYouTubeThumbnail = (url: string): boolean => url.includes("i.ytimg.com");

/**
 * Google returns attributions as HTML anchors. Render the text only. Injecting third-party
 * HTML into the page is not worth the XSS surface for a credit line.
 */
const attributionText = (attributions?: string[]): string =>
  (attributions ?? [])
    .map((a) => a.replace(/<[^>]*>/g, "").trim())
    .filter(Boolean)
    .join(", ");

export default function FoodCard(props: FoodCardProps): React.ReactElement {
  const router = useRouter();
  const [currentThumbIndex, setCurrentThumbIndex] = useState(0);
  // URLs that failed to load. Blob storage on the Hobby plan can become unavailable if its
  // limits are hit, so a broken place photo must degrade to the YouTube thumbnail (served
  // free from i.ytimg.com) rather than leaving an empty card.
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const ratingValue = props.rating;

  // Empty URLs must never reach next/image (it throws on src=""), so filter them out here
  // and fall back to rendering a plain background when a place has no usable image.
  const fromAllThumbnails = (props.allThumbnails ?? [])
    .map((t) => ({ url: t.large || t.small || "", source: t.source }))
    .filter((t) => t.url !== "" && !failedUrls.includes(t.url));

  const fallbackThumbnail =
    props.thumbnail && !failedUrls.includes(props.thumbnail) ? props.thumbnail : "";

  const thumbnails: { url: string; source?: "place" | "youtube" }[] =
    fromAllThumbnails.length > 0
      ? fromAllThumbnails
      : fallbackThumbnail
        ? [{ url: fallbackThumbnail, source: undefined }]
        : [];

  // The list shrinks when an image fails to load, so the cycling index has to be clamped
  // or the card would render nothing until the next 4s tick.
  const activeIndex = thumbnails.length > 0 ? currentThumbIndex % thumbnails.length : 0;

  useEffect(() => {
    if (thumbnails.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentThumbIndex((prev) => (prev + 1) % thumbnails.length);
    }, 4000); // Cycle every 4 seconds

    return () => clearInterval(interval);
  }, [thumbnails.length]);

  const handleCardClick = (e: React.MouseEvent) => {
    // Only navigate if the user didn't click an interactive element (button/chip/link)
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest(".MuiChip-root")) {
      return;
    }
    router.push(`/place/${props.slug}`);
  };

  return (
    <Box
      id={props.slug}
      onClick={handleCardClick}
      sx={{
        height: "100dvh",
        width: "100%",
        position: "relative",
        scrollSnapAlign: "start",
        overflow: "hidden",
        bgcolor: "black",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
      }}
    >
      {/* Background Image */}
      <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        {thumbnails.length === 0 && (
          <Box
            sx={{
              position: "absolute",
              inset: 0,
              background: "linear-gradient(160deg, #2d3436 0%, #000000 100%)",
            }}
          />
        )}
        {thumbnails.map((thumb, idx) => {
          // Only render the current image and the next one to allow preloading/smooth transition.
          // Always keep the first one (idx 0) rendered for priority/initial load consistency.
          const isCurrent = idx === activeIndex;
          const isNext = idx === (activeIndex + 1) % thumbnails.length;
          const isInitial = idx === 0;

          if (!isCurrent && !isNext && !isInitial) return null;

          return (
            <Box
              key={`${thumb.url}-${idx}`}
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                opacity: isCurrent ? 1 : 0,
                transition: "opacity 1s ease-in-out",
                zIndex: isCurrent ? 0 : -1,
              }}
            >
              <Image
                src={thumb.url}
                alt={props.title}
                fill
                sizes="(max-width: 500px) 100vw, 500px"
                style={{ objectFit: "cover" }}
                priority={props.index < 2 && idx === 0}
                unoptimized={isYouTubeThumbnail(thumb.url)}
                // Drop this source and fall through to the next one (typically a YouTube
                // thumbnail) rather than showing a broken image.
                onError={() =>
                  setFailedUrls((prev) =>
                    prev.includes(thumb.url) ? prev : [...prev, thumb.url]
                  )
                }
              />
            </Box>
          );
        })}
        {/* Dark Gradient Overlay */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "60%",
            background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)",
            zIndex: 1,
          }}
        />
      </Box>

      {/* Thumbnail Indicators */}
      {thumbnails.length > 1 && (
        <Stack 
          direction="row" 
          spacing={0.5} 
          sx={{ 
            position: "absolute", 
            top: 10, 
            left: "50%", 
            transform: "translateX(-50%)", 
            zIndex: 3 
          }}
        >
          {thumbnails.map((_, idx) => (
            <Box
              key={idx}
              sx={{
                width: idx === activeIndex ? 20 : 6,
                height: 4,
                borderRadius: 2,
                bgcolor: idx === activeIndex ? "white" : "rgba(255,255,255,0.4)",
                transition: "all 0.3s ease",
              }}
            />
          ))}
        </Stack>
      )}

      {/* Top Badges */}
      <Box
        sx={{
          position: "absolute",
          top: 20,
          left: 16,
          right: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          zIndex: 2,
        }}
      >
        <Stack direction="column" spacing={1} alignItems="flex-start">
          {props.hasVeg && (
            <Chip
              icon={<RestaurantIcon sx={{ fontSize: "1rem !important", color: "white !important" }} />}
              label="Veg Friendly"
              size="small"
              sx={{
                bgcolor: "success.main",
                color: "white",
                fontWeight: "bold",
                boxShadow: 3,
              }}
            />
          )}

          {thumbnails[activeIndex]?.source && (
            <Chip
              label={thumbnails[activeIndex].source === "place" ? "Place Photo" : "From Video"}
              size="small"
              sx={{
                bgcolor: "rgba(0,0,0,0.6)",
                color: "white",
                fontSize: "0.65rem",
                height: "20px",
                border: "1px solid rgba(255,255,255,0.2)",
                backdropFilter: "blur(4px)",
                textTransform: "uppercase",
                fontWeight: "bold",
                letterSpacing: "0.05em",
                "& .MuiChip-label": { px: 1 }
              }}
            />
          )}

          {/* Google requires photo attributions to be displayed alongside the image. */}
          {thumbnails[activeIndex]?.source === "place" && attributionText(props.photoAttribution) && (
            <Typography
              variant="caption"
              sx={{
                color: "rgba(255,255,255,0.75)",
                fontSize: "0.6rem",
                textShadow: "0 1px 2px rgba(0,0,0,0.8)",
                maxWidth: 220,
              }}
            >
              Photo: {attributionText(props.photoAttribution)}
            </Typography>
          )}
        </Stack>
      </Box>

      {/* Bottom Content Overlay */}
      <Box
        sx={{
          position: "absolute",
          bottom: 40,
          left: 16,
          right: 16, // Use full width now that side actions are gone
          zIndex: 2,
          color: "white",
          textAlign: "left",
        }}
      >
        {/*
          A real anchor, not just the card's click handler.
          - Keyboard and screen-reader users can reach the place page at all; the card
            itself is a div whose onClick they can never trigger.
          - Crawlers get a followable href. Without it the only route to any place page is
            the sitemap, since nothing else on the home feed links out.
          - next/link prefetches on hover, so the navigation is warm.
          Only the title is the link: wrapping the whole card would nest the Directions
          anchor inside another anchor, which is invalid HTML. handleCardClick already
          bails on `target.closest("a")`, so clicking the title navigates exactly once.
        */}
        {/* h2 under the page's single h1: each card is one item in the feed listing. */}
        <Typography
          component="h2"
          variant="h4"
          sx={{
            fontWeight: "bold",
            m: 0,
            mb: 0.5,
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            fontSize: { xs: "1.75rem", sm: "2.25rem" },
            lineHeight: 1.2,
          }}
        >
          <NextLink
            href={`/place/${props.slug}`}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {props.title}
          </NextLink>
        </Typography>

        {/* An explicit type check, not truthiness: `{0 && …}` renders a stray "0". */}
        {typeof ratingValue === "number" && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Rating value={ratingValue} readOnly precision={0.1} size="small" />
            <Typography variant="body2" sx={{ fontWeight: "bold", opacity: 0.9 }}>
              {ratingValue}
            </Typography>
          </Stack>
        )}

        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2, opacity: 0.9 }}>
          <LocationOnIcon sx={{ fontSize: "1.1rem", mr: 0.5, mt: 0.3 }} />
          <Typography
            variant="body2"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {props.address}
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {props.url && (
            <Button
              size="small"
              variant="contained"
              href={props.url}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<DirectionsIcon />}
              sx={{
                borderRadius: "20px",
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                backdropFilter: "blur(4px)",
                textTransform: "none",
                fontWeight: "bold",
                px: 2,
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            >
              Directions
            </Button>
          )}

          <Chip
            // Distinguish "no location yet" from a genuine 0 km: a place you are
            // standing next to used to render as "Distance".
            label={
              props.useLocation && Number.isFinite(props.displacement)
                ? `${props.displacement} Km`
                : "Distance"
            }
            onClick={() => !props.useLocation && props.setUseLocation(true)}
            sx={{
              bgcolor: "rgba(0,0,0,0.4)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              fontWeight: "medium",
              height: "32px",
            }}
          />
        </Stack>
      </Box>
    </Box>
  );
}
