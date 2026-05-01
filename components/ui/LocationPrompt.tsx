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
import MyLocationIcon from "@mui/icons-material/MyLocation";
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
          <Typography variant="h5" sx={{ fontWeight: "bold" }}>
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
          <b>Privacy:</b> Your location is processed only on your device. We never store or share it.
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
