import { PaletteMode } from "@mui/material";
import { createTheme, ThemeOptions } from "@mui/material/styles";

export const getDesignTokens = (mode: PaletteMode): ThemeOptions => ({
  palette: {
    mode,
    ...(mode === "light"
      ? {
          // palette values for light mode
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
        }
      : {
          // palette values for dark mode
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
        }),
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
        variantMapping: {
          h1: "h1",
          h2: "h2",
          h3: "h3",
          h4: "h4",
          h5: "h1",
          h6: "h2",
          subtitle1: "h5",
          subtitle2: "h6",
          body1: "p",
          body2: "p",
        },
      },
    },
  },
});

const customTheme = createTheme(getDesignTokens("light"));

export default customTheme;
