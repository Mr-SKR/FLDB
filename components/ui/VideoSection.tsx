import React from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Chip,
  Link as MuiLink,
  Stack,
  Typography,
} from "@mui/material";
import {
  Description as DescriptionIcon,
  ExpandMore as ExpandMoreIcon,
  VideoLibrary as VideoLibraryIcon,
  YouTube as YouTubeIcon,
} from "@mui/icons-material";
import dynamic from "next/dynamic";
import { VideoInterface } from "../../types/types";

/**
 * Client-only, because react-player suspends internally while it resolves the player for a
 * given URL. Rendered on the server that resolves to nothing, so the markup React found on
 * hydration never matched what it expected and the whole tree below was thrown away and
 * re-rendered ("Hydration failed because the server rendered HTML didn't match the client").
 *
 * Nothing is lost by skipping it server-side: an iframe embed carries no text for a crawler,
 * and the video's actual search signal is the `VideoObject` JSON-LD the page already emits.
 */
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

/** "5 Aug 2026", built without `toLocaleDateString` so server and client agree exactly. */
const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

const formatPublished = (value?: string | Date): string | null => {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

/**
 * The reviews themselves.
 *
 * Each video used to render as a bare player above a collapsed description, so the page
 * never said who had reviewed the place or what they called it. Both facts were already in
 * the database and neither appeared anywhere outside the sync admin screen. On a site whose
 * entire premise is "restaurants reviewed by India's best food vloggers", the vlogger's
 * name is not decoration.
 */
export const VideoSection: React.FC<{ videos: VideoInterface[] }> = ({ videos }) => {
  // The heading used to render unconditionally, so a place whose videos had not yet synced
  // showed "Featured in Videos" above nothing at all.
  if (videos.length === 0) return null;

  return (
    <Box component="section" sx={{ mb: 4 }}>
      <Typography
        variant="h6"
        component="h2"
        fontWeight="800"
        gutterBottom
        sx={{
          mt: 6,
          mb: 3,
          display: "flex",
          alignItems: "center",
          gap: 1.5,
          letterSpacing: -0.5,
          fontSize: { xs: "1.25rem", sm: "1.5rem" },
        }}
      >
        <VideoLibraryIcon sx={{ color: "error.main", fontSize: "1.6rem" }} />
        {videos.length === 1 ? "Featured in a video" : `Featured in ${videos.length} videos`}
      </Typography>

      {videos.map((video) => {
        const published = formatPublished(video.publishedAt);

        return (
          <Box key={video.videoId} sx={{ mb: 6 }}>
            <Box
              sx={{
                position: "relative",
                paddingTop: "56.25%",
                width: "100%",
                borderRadius: "20px",
                overflow: "hidden",
                boxShadow: "0 10px 30px rgba(0,0,0,0.1)",
                bgcolor: "black",
                mb: 1.5,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <ReactPlayer
                url={`https://www.youtube.com/watch?v=${video.videoId}`}
                width="100%"
                height="100%"
                style={{ position: "absolute", top: 0, left: 0 }}
                controls
              />
            </Box>

            {video.videoTitle && (
              /* h3 under the section's h2. The player is an opaque iframe, so without this
                 the page had no text at all for the thing it is built around. */
              <Typography
                variant="subtitle1"
                component="h3"
                sx={{ fontWeight: 700, lineHeight: 1.35, mb: 0.75 }}
              >
                <MuiLink
                  href={`https://www.youtube.com/watch?v=${video.videoId}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  color="inherit"
                >
                  {video.videoTitle}
                </MuiLink>
              </Typography>
            )}

            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              flexWrap="wrap"
              useFlexGap
              sx={{ mb: 1.5 }}
            >
              {video.channelTitle && (
                <Chip
                  size="small"
                  icon={<YouTubeIcon sx={{ fontSize: "1.1rem !important", color: "#ff0000 !important" }} />}
                  label={video.channelTitle}
                  variant="outlined"
                  sx={{ fontWeight: 600 }}
                />
              )}
              {published && (
                <Typography variant="caption" color="text.secondary">
                  {published}
                </Typography>
              )}
            </Stack>

            {video.videoDescription && (
              <Accordion
                elevation={0}
                sx={{
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: "16px !important",
                  bgcolor: "action.hover",
                  "&:before": { display: "none" },
                }}
              >
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box display="flex" alignItems="center" gap={1.5}>
                    <DescriptionIcon color="action" sx={{ fontSize: "1.2rem" }} />
                    <Typography variant="body2" fontWeight="bold">
                      Video description
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails
                  sx={{
                    bgcolor: "background.paper",
                    borderTop: "1px solid",
                    borderColor: "divider",
                  }}
                >
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ whiteSpace: "pre-wrap", fontSize: "0.9rem", lineHeight: 1.7 }}
                  >
                    {video.videoDescription}
                  </Typography>
                </AccordionDetails>
              </Accordion>
            )}
          </Box>
        );
      })}
    </Box>
  );
};
