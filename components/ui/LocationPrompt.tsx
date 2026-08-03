import React from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  Button,
  Box,
  Typography,
} from "@mui/material";
import { MyLocation as MyLocationIcon } from "@mui/icons-material";
import { alpha } from "@mui/material/styles";

interface LocationPromptProps {
  open: boolean;
  onAllow: () => void;
  onContinue: () => void;
}

export const LocationPrompt: React.FC<LocationPromptProps> = ({
  open,
  onAllow,
  onContinue,
}) => {
  return (
    <Dialog
      open={open}
      PaperProps={{
        sx: {
          borderRadius: "20px",
          padding: 1,
          maxWidth: "400px",
        },
      }}
    >
      <DialogTitle sx={{ textAlign: "center", pt: 3 }}>
        <Box
          sx={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              bgcolor: "background.paper",
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              color: "primary.main",
              boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
              border: "1px solid",
              borderColor: "divider",
              mb: 1
            }}
          >
            <MyLocationIcon sx={{ fontSize: 32 }} />
          </Box>
          {/* DialogTitle already renders the heading element; this is only its text, so
              it must not introduce a second heading nested inside it. */}
          <Typography variant="h5" component="span" sx={{ fontWeight: "bold" }}>
            Enable Location
          </Typography>
        </Box>
      </DialogTitle>
      <DialogContent>
        <DialogContentText sx={{ textAlign: "center", px: 2, mb: 2, color: "text.primary", fontWeight: 500 }}>
          Enable location to see live distances and find restaurants nearest to you.
        </DialogContentText>
        <Typography
          variant="caption"
          display="block"
          sx={{ 
            textAlign: "center", 
            color: "success.main", 
            bgcolor: (theme) => alpha(theme.palette.success.main, 0.05),
            py: 1,
            px: 2,
            borderRadius: "10px",
            border: "1px dashed",
            borderColor: (theme) => alpha(theme.palette.success.main, 0.3)
          }}
        >
          {/*
            Must not claim the coordinates stay on the device: they are sent to our search
            API to rank results, which is why the original "processed only on your device"
            was replaced. Saying what the location is for, and that nothing outlives the
            tab, reassures without the false claim.
          */}
          {/* Explicit {" "}: a line break after </b> would make JSX strip the leading
              whitespace, silently closing the gap to "Privacy:Used". */}
          <b>Privacy:</b>{" "}
          Used only to show you what&apos;s nearest. No ads, no tracking, no profile.
          Gone when you close the tab.
        </Typography>
      </DialogContent>
      <DialogActions sx={{ flexDirection: "column", gap: 1, px: 3, pb: 3 }}>
        <Button
          fullWidth
          variant="contained"
          onClick={onAllow}
          sx={{
            borderRadius: "12px",
            py: 1.5,
            textTransform: "none",
            fontSize: "1rem",
            fontWeight: "bold",
          }}
        >
          Allow Location
        </Button>
        <Button
          fullWidth
          variant="text"
          onClick={onContinue}
          sx={{
            borderRadius: "12px",
            py: 1,
            textTransform: "none",
            color: "text.secondary",
          }}
        >
          Continue Without
        </Button>
      </DialogActions>
    </Dialog>
  );
};
