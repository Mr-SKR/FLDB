import { createTheme } from "@mui/material/styles";
import { green, purple } from "@mui/material/colors";

const customTheme = createTheme({
  palette: {
    primary: {
      main: purple[500],
    },
    secondary: {
      main: green[500],
    },
  },
  components: {
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
  // custom: {
  //   drawerWidth: 240,
  //   appbarHeight: { small: 56, large: 64 },
  // },
});

export default customTheme;
