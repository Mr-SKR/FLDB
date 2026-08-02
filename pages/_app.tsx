import React, { useState, useEffect } from "react";
import { Experimental_CssVarsProvider as CssVarsProvider } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import type { AppProps } from "next/app";
import HEAD from "next/head";
import { useRouter } from "next/router";

import theme from "../components/ui/Theme";
import { LoadingScreen } from "../components/ui/LoadingScreen";

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
      <HEAD>
        <title>FLDB: Food Lovers Database</title>
        <meta charSet="utf-8" />
        <meta
          name="description"
          content="Food Lovers Database (FLDb)"
          key="description"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
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
