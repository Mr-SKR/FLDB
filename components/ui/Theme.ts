import { experimental_extendTheme as extendTheme } from "@mui/material/styles";

/**
 * CSS-variables theme.
 *
 * Both colour schemes are emitted as CSS custom properties at build time, so the correct
 * one is applied before first paint by `<InitColorSchemeScript />` in `_document.tsx`.
 * The previous approach held the mode in React state and read localStorage in an effect,
 * which meant every visitor saw a flash of the light theme before hydration.
 *
 * NOTE: `experimental_extendTheme` / `Experimental_CssVarsProvider` are the MUI v5 names
 * for this API. It is stable and unprefixed from MUI v6 onwards, so a major upgrade means
 * renaming these imports.
 */
export const theme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        primary: {
          main: "#0984e3", // Vibrant Blue
        },
        secondary: {
          main: "#00b894", // Mint green
        },
        background: {
          default: "#f9f9fb",
          paper: "#ffffff",
        },
        text: {
          primary: "#2d3436",
          secondary: "#636e72",
        },
        divider: "rgba(0, 0, 0, 0.08)",
      },
    },
    dark: {
      palette: {
        primary: {
          main: "#74b9ff", // Lighter Blue
        },
        secondary: {
          main: "#55efc4", // Soft mint
        },
        background: {
          default: "#121212",
          paper: "#1e1e1e",
        },
        text: {
          primary: "#ffffff",
          secondary: "#b2bec3",
        },
        divider: "rgba(255, 255, 255, 0.08)",
      },
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h6: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 700,
    },
    h4: {
      fontWeight: 700,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontWeight: 600,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
        },
      },
    },
    MuiTypography: {
      defaultProps: {
        /**
         * Identity mapping: a variant selects the *visual* scale only, never the document
         * outline. Where a heading level differs from its size, pass `component`.
         *
         * The previous mapping tied the two together (h5 rendered an `<h1>`, h6 an `<h2>`,
         * subtitle1 an `<h5>`), which silently produced a broken outline: the place page
         * emitted two `<h1>`s because "Comments & Discussion" is styled h5, the location
         * dialog nested an `<h1>` inside MUI's own `<h2>`, and the home feed had no `<h1>`
         * at all — only a run of `<h4>` card titles.
         */
        variantMapping: {
          h1: "h1",
          h2: "h2",
          h3: "h3",
          h4: "h4",
          h5: "h5",
          h6: "h6",
          subtitle1: "p",
          subtitle2: "p",
          body1: "p",
          body2: "p",
        },
      },
    },
  },
});

export default theme;
