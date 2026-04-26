import React from "react";
import { Box, Button, Typography, Paper } from "@mui/material";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";

interface PaginationSectionProps {
  currentPage: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
  onNext: () => void;
  onPrev: () => void;
}

export const PaginationSection: React.FC<PaginationSectionProps> = ({
  currentPage,
  totalPages,
  hasNextPage,
  hasPrevPage,
  onNext,
  onPrev,
}) => {
  return (
    <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 2, my: 4 }}>
      <Button
        variant="outlined"
        startIcon={<NavigateBeforeIcon />}
        disabled={!hasPrevPage}
        onClick={onPrev}
        sx={{ borderRadius: "20px", textTransform: "none" }}
      >
        Previous
      </Button>
      
      <Paper 
        elevation={0} 
        sx={{ 
          px: 2, 
          py: 0.5, 
          borderRadius: "15px", 
          border: "1px solid", 
          borderColor: "divider",
          bgcolor: "background.paper",
          color: "text.primary"
        }}
      >
        <Typography variant="body2" sx={{ fontWeight: "bold" }}>
          {currentPage + 1} <Typography component="span" variant="caption" sx={{ color: "text.secondary" }}>of</Typography> {totalPages}
        </Typography>
      </Paper>

      <Button
        variant="outlined"
        endIcon={<NavigateNextIcon />}
        disabled={!hasNextPage}
        onClick={onNext}
        sx={{ borderRadius: "20px", textTransform: "none" }}
      >
        Next
      </Button>
    </Box>
  );
};
