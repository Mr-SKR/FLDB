import React, { createContext, useMemo, useState, useEffect } from "react";
import { ThemeProvider, createTheme } from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import type { AppProps } from "next/app";
import HEAD from "next/head";
import { PaletteMode } from "@mui/material";

import { getDesignTokens } from "../components/ui/Theme";

export const ColorModeContext = createContext({ toggleColorMode: () => {
  // Default implementation
} });

function MyApp({ Component, pageProps }: AppProps) {
  const [mode, setMode] = useState<PaletteMode>("light");

  // Persist theme choice in localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("colorMode") as PaletteMode;
    if (savedMode) {
      setMode(savedMode);
    } else if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setMode("dark");
    }
  }, []);

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
        <Component {...pageProps} />
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}

export default MyApp;
