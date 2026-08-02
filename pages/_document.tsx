import { Html, Head, Main, NextScript } from "next/document";
import InitColorSchemeScript from "@mui/material/InitColorSchemeScript";

export default function Document() {
  return (
    <Html lang="en">
      <Head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/img/logo.png" />
      </Head>
      <body>
        {/* Must be the first thing in <body>: applies the saved colour scheme before
            first paint so dark-mode users never see a flash of the light theme. */}
        <InitColorSchemeScript />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
