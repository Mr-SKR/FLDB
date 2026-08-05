import React from "react";
import { Experimental_CssVarsProvider as CssVarsProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import type { AppProps } from "next/app";
import HEAD from "next/head";

// The theme asks for Roboto (`components/ui/Theme.ts`), but nothing was loading it, so every
// visitor silently got the Helvetica/Arial fallback. These are the weights the theme uses.
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import theme from "../components/ui/Theme";
import { RouteProgress } from "../components/ui/RouteProgress";
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_SHORT_NAME,
} from "../config/constants";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      {/*
        Site-wide fallbacks only. Each page renders <Seo>, whose tags carry matching `key`
        values so next/head replaces these rather than emitting both.
      */}
      <HEAD>
        <title key="title">{`${SITE_NAME} (${SITE_SHORT_NAME})`}</title>
        <meta charSet="utf-8" />
        <meta name="description" content={SITE_DESCRIPTION} key="description" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta property="og:site_name" content={SITE_NAME} key="og:site_name" />
        <meta property="og:locale" content={SITE_LOCALE} key="og:locale" />
        <meta property="og:type" content="website" key="og:type" />
        {/* Tells search engines the preferred display name for the site in results. */}
        <meta name="application-name" content={SITE_NAME} />
        {/* Browser chrome follows the colour scheme, on every page rather than only the
            home feed, which is where these used to live. They track the OS preference
            rather than the in-app toggle, which is as far as the tag goes. */}
        <meta
          name="theme-color"
          media="(prefers-color-scheme: light)"
          content="#f9f9fb"
          key="theme-color-light"
        />
        <meta
          name="theme-color"
          media="(prefers-color-scheme: dark)"
          content="#121212"
          key="theme-color-dark"
        />
      </HEAD>
      {/* defaultMode="system" honours the OS preference until the user picks one;
          the choice is persisted by MUI and replayed pre-paint by InitColorSchemeScript. */}
      <CssVarsProvider theme={theme} defaultMode="system">
        <CssBaseline />
        <RouteProgress />
        <Component {...pageProps} />
      </CssVarsProvider>
    </>
  );
}

export default MyApp;
