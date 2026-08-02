import React from "react";
import { IconButton } from "@mui/material";
import {
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  InfoOutlined as InfoOutlinedIcon,
} from "@mui/icons-material";
import { useRouter } from "next/router";
import { useColorScheme } from "@mui/material/styles";

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
        sx={{
          position: "fixed",
          top: 72,
          right: 16,
          zIndex: 110,
          bgcolor: "rgba(0,0,0,0.3)",
          color: resolvedMode === "light" ? "#f1c40f" : "#bd93f9",
          backdropFilter: "blur(8px)",
          "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
          display: { xs: "flex", sm: "none" },
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}
      >
        {resolvedMode === "light" ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </>
  );
};
