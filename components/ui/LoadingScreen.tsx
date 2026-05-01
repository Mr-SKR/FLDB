import React from "react";
import { Box, Typography } from "@mui/material";

export const LoadingScreen: React.FC = () => {
  return (
    <Box
      sx={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        bgcolor: "rgba(0, 0, 0, 0.8)",
        backdropFilter: "blur(10px)",
        zIndex: 9999,
        color: "white",
      }}
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          animation: "pulse 2s ease-in-out infinite",
          "@keyframes pulse": {
            "0%, 100%": {
              transform: "scale(1)",
              opacity: 1,
            },
            "50%": {
              transform: "scale(1.05)",
              opacity: 0.8,
            },
          },
        }}
      >
        <Box
          component="img"
          src="/img/logo.png"
          alt="FLDb Logo"
          sx={{
            width: 100,
            height: 100,
            mb: 2,
            filter: "drop-shadow(0 0 20px rgba(255,255,255,0.2))",
          }}
        />
        <Typography
          variant="h4"
          sx={{
            fontWeight: 800,
            letterSpacing: -1,
            background: "linear-gradient(45deg, #fff 30%, #ccc 90%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          FLDb
        </Typography>
        <Typography
          variant="caption"
          sx={{
            mt: 1,
            opacity: 0.6,
            letterSpacing: 2,
            textTransform: "uppercase",
            fontWeight: 500,
          }}
        >
          Food Lovers Database
        </Typography>
      </Box>
    </Box>
  );
};
