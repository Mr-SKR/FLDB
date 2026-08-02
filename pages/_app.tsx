import React, { useState, useEffect } from "react";
import { Experimental_CssVarsProvider as CssVarsProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import type { AppProps } from "next/app";
import HEAD from "next/head";
import { useRouter } from "next/router";

// The theme asks for Roboto (`components/ui/Theme.ts`), but nothing was loading it, so every
// visitor silently got the Helvetica/Arial fallback. These are the weights the theme uses.
import "@fontsource/roboto/300.css";
import "@fontsource/roboto/400.css";
import "@fontsource/roboto/500.css";
import "@fontsource/roboto/700.css";

import theme from "../components/ui/Theme";
import { LoadingScreen } from "../components/ui/LoadingScreen";
import {
  SITE_DESCRIPTION,
  SITE_LOCALE,
  SITE_NAME,
  SITE_SHORT_NAME,
} from "../config/constants";

function MyApp({ Component, pageProps }: AppProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Router loading state
  useEffect(() => {
    const handleStart = (url: string) => {
      if (url !== router.asPath) {
        setLoading(true);
      }
    };
    const handleComplete = () => setLoading(false);

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router]);

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
      </HEAD>
      {/* defaultMode="system" honours the OS preference until the user picks one;
          the choice is persisted by MUI and replayed pre-paint by InitColorSchemeScript. */}
      <CssVarsProvider theme={theme} defaultMode="system">
        <CssBaseline />
        {loading && <LoadingScreen />}
        <Component {...pageProps} />
      </CssVarsProvider>
    </>
  );
}

export default MyApp;
