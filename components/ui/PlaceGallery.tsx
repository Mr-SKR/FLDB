import React, { useState } from "react";
import { Box, Stack, Typography, Chip } from "@mui/material";
import Image from "next/image";
import {
  PhotoCamera as PhotoCameraIcon,
  Videocam as VideocamIcon,
} from "@mui/icons-material";
import { attributionText, isYouTubeThumbnail, PlaceImage } from "../../utils/images";

interface PlaceGalleryProps {
  images: PlaceImage[];
  /** Place name, used for alt text. */
  name: string;
  /** Google's html_attributions for the place photo; required to be displayed. */
  photoAttribution?: string[];
}

/**
 * The photography on a place page.
 *
 * The feed card is full-bleed imagery with a crossfading carousel, and tapping one used to
 * land the reader on a page that opened with a title on a blank panel. The pictures are the
 * reason someone taps through, so the detail page has to lead with them too.
 *
 * Deliberately *not* the card's auto-advancing carousel. Motion earns its place in a feed
 * that is being skimmed; on a page the reader has chosen, an image that swaps itself out
 * while they are looking at it is just an obstacle. Selection here is manual only, which
 * also means there is nothing to pause and no WCAG 2.2.2 question to answer.
 */
export const PlaceGallery: React.FC<PlaceGalleryProps> = ({
  images,
  name,
  photoAttribution,
}) => {
  // URLs that failed to load, dropped from the gallery. Blob storage on the Hobby plan can
  // become unavailable if its limits are hit, and a broken hero is worse than a smaller one.
  const [failedUrls, setFailedUrls] = useState<string[]>([]);
  const [active, setActive] = useState(0);

  const usable = images.filter((image) => !failedUrls.includes(image.url));
  if (usable.length === 0) return null;

  // The list shrinks as images fail, so the index has to be clamped rather than trusted.
  const activeIndex = Math.min(active, usable.length - 1);
  const current = usable[activeIndex];
  const credit = current.source === "place" ? attributionText(photoAttribution) : "";

  const markFailed = (url: string) =>
    setFailedUrls((prev) => (prev.includes(url) ? prev : [...prev, url]));

  return (
    <Box>
      <Box
        sx={{
          position: "relative",
          width: "100%",
          // Wider than tall on a phone but not letterboxed; closer to a banner on desktop,
          // where the same aspect ratio would push everything below it off the screen.
          aspectRatio: { xs: "4 / 3", sm: "16 / 9" },
          // 16:9 across a 900px container is 500px tall, which pushed the restaurant's own
          // name below the fold on a laptop. The cap crops rather than reflows, and
          // `objectFit: cover` means the crop is centred instead of squashed.
          maxHeight: { sm: 400 },
          borderRadius: "20px",
          overflow: "hidden",
          bgcolor: "black",
          border: "1px solid",
          borderColor: "divider",
        }}
      >
        <Image
          key={current.url}
          src={current.url}
          alt={
            usable.length > 1
              ? `${name}, photo ${activeIndex + 1} of ${usable.length}`
              : name
          }
          fill
          sizes="(max-width: 900px) 100vw, 900px"
          style={{ objectFit: "cover" }}
          // The hero is the page's LCP element, so it must not be lazy.
          priority
          unoptimized={isYouTubeThumbnail(current.url)}
          onError={() => markFailed(current.url)}
        />

        {/* Scrim behind the chip and credit. Both are small light text over an arbitrary
            photograph, and against a bright one they were unreadable without it. */}
        <Box
          sx={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(to top, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 30%, rgba(0,0,0,0) 70%, rgba(0,0,0,0.45) 100%)",
            pointerEvents: "none",
          }}
        />

        {current.source && (
          <Chip
            icon={
              current.source === "place" ? (
                <PhotoCameraIcon sx={{ fontSize: "0.8rem !important", color: "white !important" }} />
              ) : (
                <VideocamIcon sx={{ fontSize: "0.8rem !important", color: "white !important" }} />
              )
            }
            label={current.source === "place" ? "Listing photo" : "Video still"}
            size="small"
            sx={{
              position: "absolute",
              top: 12,
              left: 12,
              bgcolor: "rgba(0,0,0,0.6)",
              color: "white",
              fontSize: "0.65rem",
              height: "20px",
              border: "1px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(4px)",
              textTransform: "uppercase",
              fontWeight: "bold",
              letterSpacing: "0.05em",
              "& .MuiChip-label": { px: 0.75 },
              "& .MuiChip-icon": { ml: 0.75, mr: -0.25 },
            }}
          />
        )}

        {/* Google requires photo attributions to be displayed alongside the image. */}
        {credit && (
          <Typography
            variant="caption"
            sx={{
              position: "absolute",
              bottom: 8,
              left: 12,
              right: 12,
              color: "rgba(255,255,255,0.8)",
              fontSize: "0.6rem",
              textShadow: "0 1px 2px rgba(0,0,0,0.8)",
            }}
          >
            Photo: {credit}
          </Typography>
        )}
      </Box>

      {usable.length > 1 && (
        <Stack
          direction="row"
          spacing={1}
          sx={{
            mt: 1.5,
            overflowX: "auto",
            pb: 0.5,
            // The strip scrolls on a phone rather than shrinking each thumbnail to nothing.
            "&::-webkit-scrollbar": { height: 4 },
            "&::-webkit-scrollbar-thumb": { bgcolor: "divider", borderRadius: 2 },
          }}
        >
          {usable.map((image, index) => (
            <Box
              key={image.url}
              component="button"
              type="button"
              onClick={() => setActive(index)}
              aria-label={`Show photo ${index + 1} of ${usable.length}`}
              aria-current={index === activeIndex}
              sx={{
                position: "relative",
                flex: "0 0 auto",
                width: 84,
                height: 60,
                p: 0,
                borderRadius: "10px",
                overflow: "hidden",
                cursor: "pointer",
                bgcolor: "black",
                border: "2px solid",
                borderColor: index === activeIndex ? "primary.main" : "transparent",
                opacity: index === activeIndex ? 1 : 0.6,
                transition: "opacity 0.2s, border-color 0.2s",
                "&:hover": { opacity: 1 },
                "&:focus-visible": {
                  outline: "2px solid",
                  outlineColor: "primary.main",
                  outlineOffset: "2px",
                },
              }}
            >
              <Image
                src={image.url}
                alt=""
                fill
                sizes="84px"
                style={{ objectFit: "cover" }}
                unoptimized={isYouTubeThumbnail(image.url)}
                onError={() => markFailed(image.url)}
              />
            </Box>
          ))}
        </Stack>
      )}
    </Box>
  );
};
