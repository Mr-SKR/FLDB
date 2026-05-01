import * as React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import IconButton from "@mui/material/IconButton";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness7";
import { useRouter } from "next/router";
import { useTheme } from "@mui/material/styles";
import { ColorModeContext } from "../../pages/_app";

interface HeaderProps {
  showThemeToggle?: boolean;
  showAbout?: boolean;
}

export default function SearchAppBar({ showThemeToggle = true, showAbout = true }: HeaderProps) {
  const router = useRouter();
  const theme = useTheme();
  const colorMode = React.useContext(ColorModeContext);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider", bgcolor: "background.paper", color: "text.primary" }}>
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <IconButton
              size="large"
              edge="start"
              color="inherit"
              aria-label="FLDb"
              sx={{
                mr: 2,
                "&.MuiButtonBase-root:hover": {
                  bgcolor: "transparent",
                },
              }}
              onClick={() => {
                router.push("/");
              }}
            >
              <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 800, letterSpacing: -0.5 }}>
                Food Lovers Database
              </Typography>
            </IconButton>
          </Box>

          {showThemeToggle && (
            <IconButton sx={{ ml: 1 }} onClick={colorMode.toggleColorMode} color="inherit">
              {theme.palette.mode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
            </IconButton>
          )}

          {showAbout && (
            <IconButton
              size="large"
              edge="end"
              color="inherit"
              aria-label="about"
              sx={{
                ml: 1,
                "&.MuiButtonBase-root:hover": {
                  bgcolor: "transparent",
                },
              }}
              onClick={() => {
                router.push("/about");
              }}
            >
              <InfoOutlinedIcon />
            </IconButton>
          )}
        </Toolbar>
      </AppBar>
    </Box>
  );
}
