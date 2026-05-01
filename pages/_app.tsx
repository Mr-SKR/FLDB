import React, { createContext, useMemo, useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import type { AppProps } from "next/app";
import HEAD from "next/head";
import { PaletteMode } from "@mui/material";
import { useRouter } from "next/router";

import { getDesignTokens } from "../components/ui/Theme";
import { LoadingScreen } from "../components/ui/LoadingScreen";

export const ColorModeContext = createContext({ toggleColorMode: () => {
  // Default implementation
} });

function MyApp({ Component, pageProps }: AppProps) {
  const [mode, setMode] = useState<PaletteMode>("light");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Persist theme choice in localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("colorMode") as PaletteMode;
    const systemMode = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const modeToSet = savedMode || systemMode;

    if (modeToSet !== mode) {
      queueMicrotask(() => {
        setMode(modeToSet);
      });
    }
  }, [mode]);

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

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => {
          const newMode = prevMode === "light" ? "dark" : "light";
          localStorage.setItem("colorMode", newMode);
          return newMode;
        });
      },
    }),
    []
  );

  const theme = useMemo(() => createTheme(getDesignTokens(mode)), [mode]);

  return (
    <ColorModeContext.Provider value={colorMode}>
      <HEAD>
        <title>FLDB: Food Lovers Database</title>
        <meta charSet="utf-8" />
        <meta
          name="description"
          content="Food Lovers Database (FLDb)"
          key="description"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
      </HEAD>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {loading && <LoadingScreen />}
        <Component {...pageProps} />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default MyApp;
