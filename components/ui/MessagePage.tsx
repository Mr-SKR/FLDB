import React from "react";
import { Box, Button, Container, Stack, Typography } from "@mui/material";
import {
  ArrowBack as ArrowBackIcon,
  Search as SearchIcon,
} from "@mui/icons-material";
import Image from "next/image";
import NextLink from "next/link";
import ResponsiveDrawer from "../headers/Header";
import { Footer } from "./Footer";

interface MessagePageProps {
  /** Large display code, e.g. "404". Omitted for pages where a number would mean nothing. */
  code?: string;
  title: string;
  message: string;
  children?: React.ReactNode;
}

/**
 * The shared layout for pages that exist to explain that something is missing or broken.
 *
 * There was no 404 page and no error page at all, so a stale link to a removed place (the
 * `notFound` branch in the place page's `getStaticProps`) dropped the visitor on Next's
 * default black-on-white "404 This page could not be found" with no header, no styling and
 * no route back into the site. Places are removed by the sync whenever Google reports them
 * permanently closed, so that link is not hypothetical.
 */
export const MessagePage: React.FC<MessagePageProps> = ({ code, title, message, children }) => (
  <Box
    sx={{
      bgcolor: "background.default",
      minHeight: "100dvh",
      display: "flex",
      flexDirection: "column",
    }}
  >
    <ResponsiveDrawer />
    <Container
      component="main"
      maxWidth="sm"
      sx={{
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        py: 8,
      }}
    >
      {/* The GIF has a solid light background baked in, so on a dark page it lands as a
          white rectangle. Rounding and insetting it makes that read as a deliberate tile
          rather than a transparency bug. */}
      <Box
        sx={{
          mb: 3,
          p: 1,
          borderRadius: "20px",
          overflow: "hidden",
          bgcolor: "common.white",
          lineHeight: 0,
        }}
      >
        <Image
          src="/img/walking-chef.gif"
          alt=""
          width={120}
          height={120}
          style={{ borderRadius: "12px", objectFit: "contain" }}
          unoptimized
        />
      </Box>

      {code && (
        <Typography
          variant="h2"
          component="p"
          sx={{ fontWeight: 900, letterSpacing: -2, color: "text.disabled", lineHeight: 1 }}
        >
          {code}
        </Typography>
      )}

      <Typography
        variant="h4"
        component="h1"
        sx={{ fontWeight: 800, letterSpacing: -0.5, mt: 1, mb: 1.5 }}
      >
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 420, mb: 4 }}>
        {message}
      </Typography>

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        <Button
          component={NextLink}
          href="/"
          variant="contained"
          startIcon={<SearchIcon />}
          sx={{ borderRadius: "12px", px: 3, py: 1.25, fontWeight: 700 }}
        >
          Browse restaurants
        </Button>
        <Button
          component={NextLink}
          href="/about"
          variant="text"
          startIcon={<ArrowBackIcon />}
          sx={{ borderRadius: "12px", color: "text.secondary" }}
        >
          About this site
        </Button>
      </Stack>

      {children}
    </Container>
    <Footer />
  </Box>
);
