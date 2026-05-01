import React from "react";
import { IconButton } from "@mui/material";
import {
  Brightness4 as Brightness4Icon,
  Brightness7 as Brightness7Icon,
  InfoOutlined as InfoOutlinedIcon,
} from "@mui/icons-material";
import { useRouter } from "next/router";
import { useTheme } from "@mui/material/styles";

interface MobileControlsProps {
  onToggleColorMode: () => void;
}

export const MobileControls: React.FC<MobileControlsProps> = ({ onToggleColorMode }) => {
  const router = useRouter();
  const theme = useTheme();

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
        onClick={onToggleColorMode}
        sx={{
          position: "fixed",
          top: 72,
          right: 16,
          zIndex: 110,
          bgcolor: "rgba(0,0,0,0.3)",
          color: theme.palette.mode === "light" ? "#f1c40f" : "#bd93f9",
          backdropFilter: "blur(8px)",
          "&:hover": { bgcolor: "rgba(0,0,0,0.5)" },
          display: { xs: "flex", sm: "none" },
          boxShadow: "0 2px 8px rgba(0,0,0,0.5)",
        }}
      >
        {theme.palette.mode === "light" ? <Brightness7Icon /> : <Brightness4Icon />}
      </IconButton>
    </>
  );
};
