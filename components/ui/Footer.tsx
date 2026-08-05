import React from "react";
import { Box, Container, Divider, Link as MuiLink, Stack, Typography } from "@mui/material";
import NextLink from "next/link";
import { SITE_NAME } from "../../config/constants";

const REPO_URL = "https://github.com/Mr-SKR/FLDB";

/**
 * Site footer.
 *
 * The place pages are where most visitors arrive from search, and from one there was no
 * route to anything except the home feed and a neighbouring restaurant: no About, no source
 * code, and no statement of what the site is or who it is not affiliated with. That last
 * point matters here, because the whole catalogue is other people's video reviews.
 *
 * Not rendered on the home feed, which is a fixed-height scroll-snap surface with nothing
 * below the fold to put it in.
 */
export const Footer: React.FC = () => (
  <Box component="footer" sx={{ mt: 6, pb: 4 }}>
    <Container maxWidth="md">
      <Divider sx={{ mb: 3 }} />
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={{ xs: 1.5, sm: 3 }}
        alignItems={{ xs: "flex-start", sm: "center" }}
        justifyContent="space-between"
      >
        <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 460 }}>
          {SITE_NAME} is an independent, ad-free project. It is not affiliated with, sponsored
          by, or endorsed by the creators whose reviews it catalogues.
        </Typography>
        <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
          <MuiLink
            component={NextLink}
            href="/"
            variant="body2"
            underline="hover"
            color="text.secondary"
          >
            Home
          </MuiLink>
          <MuiLink
            component={NextLink}
            href="/about"
            variant="body2"
            underline="hover"
            color="text.secondary"
          >
            About
          </MuiLink>
          <MuiLink
            href={REPO_URL}
            target="_blank"
            rel="noopener noreferrer"
            variant="body2"
            underline="hover"
            color="text.secondary"
          >
            Source
          </MuiLink>
        </Stack>
      </Stack>
    </Container>
  </Box>
);
