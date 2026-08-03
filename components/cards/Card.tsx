import React, { useState, useEffect, useCallback } from "react";
import {
  Button,
  Typography,
  Box,
  Chip,
  Rating,
  Stack,
  useMediaQuery,
} from "@mui/material";
import { keyframes } from "@mui/material/styles";
import Image from "next/image";
import NextLink from "next/link";
import { useRouter } from "next/router";
import {
  Restaurant as RestaurantIcon,
  LocationOn as LocationOnIcon,
  Directions as DirectionsIcon,
  MyLocation as MyLocationIcon,
  NearMe as NearMeIcon,
  PhotoCamera as PhotoCameraIcon,
  Videocam as VideocamIcon,
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

/** How long each photo holds before the next one begins fading in. */
const DWELL_MS = 5000;

/** Crossfade length. Long enough to read as a dissolve, short enough not to feel sluggish. */
const FADE_MS = 900;

/**
 * Slow push-in on whichever photo is showing.
 *
 * A still photograph held for five seconds reads as a stalled page; a barely perceptible
 * drift reads as alive. Kept to 6% over a duration longer than the dwell, so it never
 * reaches the end of its travel and never visibly snaps.
 *
 * `transform` is used rather than width/height so it stays on the compositor.
 */
const kenBurns = keyframes`
  from { transform: scale(1); }
  to   { transform: scale(1.06); }
`;

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

  const count = thumbnails.length;

  /*
    Active and outgoing photo are tracked together in one piece of state.

    Deriving the outgoing one as "active minus one" only holds while the carousel advances
    a step at a time. The indicator dots jump to an arbitrary photo, and on such a jump the
    layer being replaced is whatever was on screen, not the numerically preceding one.
    Getting that wrong would fade the new photo in over a layer that is already invisible,
    which reintroduces exactly the dip to black this was built to avoid.

    Updated through a single pure updater so `previous` can never disagree with `active`.
  */
  const [{ active, previous }, setPhoto] = useState({ active: 0, previous: -1 });

  // The list shrinks when an image fails to load, so the index has to be clamped or the
  // card would render nothing until the next tick.
  const activeIndex = count > 0 ? active % count : 0;
  const previousIndex = previous >= 0 && count > 0 ? previous % count : -1;
  const hasCycled = previousIndex >= 0;

  /** Honour the OS setting: auto-playing motion is opt-out for a reason. */
  const prefersReducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");
  const [isPaused, setIsPaused] = useState(false);
  /**
   * Set once the reader picks a photo themselves, which stops the carousel for good.
   *
   * This is the card's "pause" control. Auto-advancing imagery that cannot be stopped is a
   * WCAG 2.2.2 problem, and someone who has just chosen a photo plainly does not want it
   * replaced two seconds later.
   */
  const [userTookControl, setUserTookControl] = useState(false);

  const showPhoto = useCallback((next: number) => {
    setUserTookControl(true);
    setPhoto((p) => (next === p.active ? p : { active: next, previous: p.active }));
  }, []);

  useEffect(() => {
    // Nothing to cycle, the reader is hovering it, they took control, or they asked for
    // less motion.
    if (count <= 1 || isPaused || userTookControl || prefersReducedMotion) return;

    const interval = setInterval(() => {
      setPhoto((p) => ({ active: (p.active + 1) % count, previous: p.active }));
    }, DWELL_MS);

    return () => clearInterval(interval);
  }, [count, isPaused, userTookControl, prefersReducedMotion]);

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
      /* Hold the photo while the pointer is on the card. Someone hovering is reading it,
         and having the image swap out from under them is the most annoying moment in a
         carousel. Touch devices never fire these, so the phone feed is unaffected. */
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      sx={{
        /*
          Two layouts from one component.

          On a phone the card is the viewport: full-bleed, snap-scrolled, one at a time.
          From `md` up the feed becomes a grid, so the card is a tile of fixed height inside
          a cell, with corners and no snap alignment. Everything inside is absolutely
          positioned against this box, so it rescales without further change.

          `md` (900px) rather than `sm` (600px) deliberately. Two columns at 600px leaves
          each card around 280px wide, which is too narrow for the Directions and distance
          chips to sit on one line, so they wrap and the card looks broken. A tablet gets
          the clean single-column layout instead.
        */
        /*
          `100%` of the scroll container, not `100dvh`.

          `100dvh` is the whole viewport, but the feed sits below the header, which appears
          from `sm` up. Between 600px and 900px that made every card 65px taller than the
          area it scrolls in, so the action row was clipped off the bottom of each one and
          snap scrolling landed slightly past the end of the card. Measuring against the
          container is correct at every width, including phones where the two are equal.
        */
        height: { xs: "100%", md: 420 },
        width: "100%",
        position: "relative",
        scrollSnapAlign: { xs: "start", md: "none" },
        overflow: "hidden",
        bgcolor: "black",
        borderRadius: { xs: 0, md: "20px" },
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        transition: "transform 0.2s, box-shadow 0.2s",
        "@media (min-width: 900px)": {
          "&:hover": {
            transform: "translateY(-4px)",
            boxShadow: "0 12px 32px rgba(0,0,0,0.45)",
          },
        },
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
          const isCurrent = idx === activeIndex;
          // The photo being replaced. It stays fully opaque underneath the incoming one.
          const isPrevious = hasCycled && idx === previousIndex;
          // Mounted but invisible, purely so the browser has it decoded before its turn.
          const isNext = count > 1 && idx === (activeIndex + 1) % count;
          const isInitial = idx === 0;

          if (!isCurrent && !isPrevious && !isNext && !isInitial) return null;

          const isShowing = isCurrent || isPrevious;

          return (
            <Box
              key={`${thumb.url}-${idx}`}
              sx={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                overflow: "hidden",
                /*
                  A dissolve with no dip to black.

                  The incoming photo fades 0 -> 1 on the top layer while the outgoing one
                  sits beneath it at full opacity, so something is always covering the card.
                  Fading both at once (the obvious approach) still dips: at the midpoint
                  each is at 50%, which composites to 75% coverage and a visible darkening.

                  The previous code did something worse. It set `zIndex: -1` on every
                  non-current layer, which paints behind the card's own black background,
                  and z-index does not animate. So the outgoing photo was not fading at
                  all: it was cut instantly to nothing, and the replacement then faded up
                  from pure black over a full second.
                */
                opacity: isShowing ? 1 : 0,
                transition: prefersReducedMotion
                  ? "none"
                  : `opacity ${FADE_MS}ms cubic-bezier(0.4, 0, 0.2, 1)`,
                // Every layer stays above the card background. Current on top, outgoing
                // directly beneath it, preload layers below both.
                zIndex: isCurrent ? 3 : isPrevious ? 2 : 1,
                animation:
                  isShowing && !prefersReducedMotion
                    ? `${kenBurns} ${DWELL_MS + FADE_MS * 2}ms ease-out forwards`
                    : "none",
              }}
            >
              <Image
                src={thumb.url}
                alt={props.title}
                fill
                sizes="(max-width: 500px) 100vw, 500px"
                style={{ objectFit: "cover" }}
                // First three, not two: the desktop grid puts three cards in the opening
                // row, so a two-card budget left the third above-the-fold image lazy.
                priority={props.index < 3 && idx === 0}
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
            // Above every photo layer. The crossfade now uses 1 to 3, where it previously
            // used 0 and -1, so this had to move up with it or the scrim would sit under
            // the images and the title would lose its backing.
            zIndex: 4,
          }}
        />

        {/*
          Matching scrim at the top.

          The badges, the source chip and the photo credit all sit up here over whatever
          the photograph happens to be, and against a bright one (a lit shopfront sign, a
          pale thali) the credit line in particular was unreadable. Much lighter than the
          bottom gradient, since it only has to lift small text off the image rather than
          carry a headline.
        */}
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: "22%",
            background: "linear-gradient(to bottom, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0) 100%)",
            zIndex: 4,
            pointerEvents: "none",
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
            // The buttons carry 10px of vertical padding for the touch target, so the
            // container starts at 0 to keep the bars themselves at the original 10px.
            top: 0,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 6
          }}
        >
          {/*
            Real buttons, not decorative bars.

            They already looked like carousel controls, so people tried to tap them and
            nothing happened. Each one now selects its photo, which doubles as the way to
            stop the card auto-advancing.

            The visible bar stays 4px tall, but the button around it is padded out to a
            28px touch target: a 4px tap target fails WCAG 2.5.8 and is simply hard to hit.
          */}
          {thumbnails.map((_, idx) => (
            <Box
              key={idx}
              component="button"
              type="button"
              aria-label={`Show photo ${idx + 1} of ${thumbnails.length}`}
              aria-current={idx === activeIndex}
              onClick={(e: React.MouseEvent) => {
                // The card itself navigates on click; selecting a photo must not.
                e.stopPropagation();
                showPhoto(idx);
              }}
              sx={{
                // Transparent padding is what makes this tappable. The visible bar is 4px
                // tall, which is far below any usable touch target, so the padding carries
                // the hit area and the inner span carries the appearance. A padded button
                // is used rather than an ::before overlay because a pseudo-element does not
                // reliably extend hit testing.
                appearance: "none",
                border: 0,
                background: "none",
                px: "5px",
                py: "10px",
                cursor: "pointer",
                display: "block",
                lineHeight: 0,
                "&:focus-visible": {
                  outline: "2px solid white",
                  outlineOffset: "2px",
                  borderRadius: "2px",
                },
              }}
            >
              <Box
                component="span"
                sx={{
                  display: "block",
                  width: idx === activeIndex ? 20 : 6,
                  height: 4,
                  borderRadius: 2,
                  bgcolor: idx === activeIndex ? "white" : "rgba(255,255,255,0.5)",
                  transition: "all 0.3s ease",
                }}
              />
            </Box>
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
          zIndex: 5,
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

          {/*
            The chip answers "where did this picture come from?".

            It used to read "Place Photo", which is vocabulary from the Google Places API
            (`placePhoto`, `photo_reference`) rather than anything a reader would say, and
            it did not distinguish anything: every image on the card is a photo of the
            place. "Listing photo" versus "Video still" is the distinction that actually
            exists, and it is the one that tells you how much to trust the picture: a
            contributed photo from the business listing, of unknown age, or a frame from
            the review itself.

            Deliberately does not name Google. The credit that Places actually requires is
            the `html_attributions` line rendered below, which is unaffected by this label.

            The icons are a matched pair on purpose: stills camera against video camera,
            which reads at a glance without parsing 0.65rem uppercase text.
          */}
          {thumbnails[activeIndex]?.source && (
            <Chip
              icon={
                thumbnails[activeIndex].source === "place" ? (
                  <PhotoCameraIcon sx={{ fontSize: "0.8rem !important", color: "white !important" }} />
                ) : (
                  <VideocamIcon sx={{ fontSize: "0.8rem !important", color: "white !important" }} />
                )
              }
              label={thumbnails[activeIndex].source === "place" ? "Listing photo" : "Video still"}
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
                "& .MuiChip-label": { px: 0.75 },
                "& .MuiChip-icon": { ml: 0.75, mr: -0.25 },
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

      {/* Bottom Content Overlay. Tighter inset on the desktop tile, which has a fraction
          of the height to work with. */}
      <Box
        sx={{
          position: "absolute",
          bottom: { xs: 40, md: 14 },
          left: { xs: 16, md: 14 },
          right: { xs: 16, md: 14 },
          zIndex: 5,
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
            // Smaller from `md` up, not larger: that breakpoint is the grid tile, which has
            // roughly a fifth of the height a full-bleed phone card does.
            fontSize: { xs: "1.75rem", md: "1.35rem" },
            lineHeight: 1.2,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
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

          {/*
            Two states, and the off state has to look like an invitation.

            Labelling it "Distance" made it read as a disabled field label rather than a
            control, so the one tap that turns on the feature the app is built around went
            unmade. "Show distance" plus a location icon states the action. The on state
            matches the wording used by the nearby cards on a place page ("0.8 km away").

            The `Number.isFinite` guard distinguishes "no location yet" from a genuine 0 km:
            a place you are standing next to used to render as "Distance".
          */}
          {props.useLocation && Number.isFinite(props.displacement) ? (
            <Chip
              icon={<NearMeIcon sx={{ fontSize: "1rem !important", color: "white !important" }} />}
              label={`${props.displacement} km away`}
              sx={{
                bgcolor: "rgba(0,0,0,0.4)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.3)",
                fontWeight: "medium",
                height: "32px",
              }}
            />
          ) : (
            <Chip
              clickable
              icon={<MyLocationIcon sx={{ fontSize: "1rem !important", color: "white !important" }} />}
              label="Show distance"
              onClick={() => props.setUseLocation(true)}
              sx={{
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.4)",
                backdropFilter: "blur(4px)",
                fontWeight: "bold",
                height: "32px",
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            />
          )}
        </Stack>
      </Box>
    </Box>
  );
}
