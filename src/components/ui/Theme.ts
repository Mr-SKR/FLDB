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
  // custom: {
  //   drawerWidth: 240,
  //   appbarHeight: { small: 56, large: 64 },
  // },
});

export default customTheme;
