import React from "react";
import { IconButton } from "@mui/material";
import {
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  InfoOutlined as InfoOutlinedIcon,
} from "@mui/icons-material";
import { useRouter } from "next/router";
import { useColorScheme } from "@mui/material/styles";
import { showInDarkOnly, showInLightOnly } from "./Theme";

export const MobileControls: React.FC = () => {
  const router = useRouter();
  const { mode, systemMode, setMode } = useColorScheme();

  // `mode` is "system" until the user picks explicitly, and undefined until mounted.
  const resolvedMode = mode === "system" ? systemMode : mode;
  const toggleColorMode = () => setMode(resolvedMode === "dark" ? "light" : "dark");

  return (
    <>
      {/* Mobile Info Button */}
      <IconButton
        onClick={() => router.push("/about")}
        aria-label="About FLDb"
        sx={{
          position: "fixed",
          top: 16,
          right: 16,
          zIndex: 110,
          bgcolor: "rgba(0,0,0,0.3)",
          color: "white",
          backdropFilter: "blur(8px)",
          "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
          display: { xs: "flex", sm: "none" },
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}
      >
        <InfoOutlinedIcon />
      </IconButton>

      {/* Mobile Theme Toggle */}
      <IconButton
        onClick={toggleColorMode}
        // See `showInDarkOnly`: the resolved scheme is not known until after hydration, so
        // anything derived from it here rendered differently on the server and mismatched.
        aria-label="Toggle light and dark mode"
        sx={{
          position: "fixed",
          top: 72,
          right: 16,
          zIndex: 110,
          bgcolor: "rgba(0,0,0,0.3)",
          // Tint follows the scheme in CSS, for the same reason the icon does.
          color: "#f1c40f",
          '[data-mui-color-scheme="dark"] &': { color: "#bd93f9" },
          backdropFilter: "blur(8px)",
          "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
          display: { xs: "flex", sm: "none" },
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}
      >
        {/* Both are rendered; CSS shows one. The icon indicates the mode being switched
            *to*, matching the desktop header. The two used to disagree: this one showed the
            current mode, so the same tap was illustrated by opposite glyphs depending on
            the width of the window. */}
        <Brightness7Icon sx={showInDarkOnly} />
        <Brightness4Icon sx={showInLightOnly} />
      </IconButton>
    </>
  );
};
