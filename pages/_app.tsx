import React from "react";
import { ThemeProvider } from "@mui/system";
import CssBaseline from "@mui/material/CssBaseline";
import type { AppProps } from "next/app";
import HEAD from "next/head";

import customTheme from "../components/ui/Theme";

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <React.Fragment>
      <HEAD>
        <title>FLDB: Food Lovers Database</title>
        <meta charSet="utf-8" />
        <meta
          name="description"
          content="Food Lovers Database (FLDb)"
          key="description"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <meta name="theme-color" content="#000000" />
        <meta name="viewport" content="initial-scale=1.0, width=device-width" />
        {/* <link rel="manifest" href="%PUBLIC_URL%/manifest.json" /> */}
      </HEAD>
      <CssBaseline />
      <ThemeProvider theme={customTheme}>
        <Component {...pageProps} />
      </ThemeProvider>
    </React.Fragment>
  );
}

// Only uncomment this method if you have blocking data requirements for
// every single page in your application. This disables the ability to
// perform automatic static optimization, causing every page in your app to
// be server-side rendered.
//
// MyApp.getInitialProps = async (appContext) => {
//   // calls page's `getInitialProps` and fills `appProps.pageProps`
//   const appProps = await App.getInitialProps(appContext);
//
//   return { ...appProps }
// }

export default MyApp;
