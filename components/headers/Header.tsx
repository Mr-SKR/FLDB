import * as React from "react";
import { AppBar, Box, Toolbar, Typography, IconButton } from "@mui/material";
import {
  InfoOutlined as InfoOutlinedIcon,
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
} from "@mui/icons-material";
import { useRouter } from "next/router";
import { useColorScheme } from "@mui/material/styles";

interface HeaderProps {
  showThemeToggle?: boolean;
  showAbout?: boolean;
}

export default function SearchAppBar({ showThemeToggle = true, showAbout = true }: HeaderProps) {
  const router = useRouter();
  const { mode, systemMode, setMode } = useColorScheme();

  // `mode` is "system" until the user picks explicitly, and undefined until mounted.
  const resolvedMode = mode === "system" ? systemMode : mode;
  const toggleColorMode = () => setMode(resolvedMode === "dark" ? "light" : "dark");

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
            <IconButton
              sx={{ ml: 1 }}
              onClick={toggleColorMode}
              color="inherit"
              aria-label={resolvedMode === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {resolvedMode === "dark" ? <Brightness7Icon /> : <Brightness4Icon />}
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
