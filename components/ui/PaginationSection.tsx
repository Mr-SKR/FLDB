import React from "react";
import { Box, ToggleButton, ToggleButtonGroup } from "@mui/material";

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
    <Box sx={{ display: "flex", justifyContent: "center", my: 2 }}>
      <ToggleButtonGroup exclusive>
        <ToggleButton value="prev" disabled={!hasPrevPage} onClick={onPrev}>
          PREV
        </ToggleButton>
        <ToggleButton value="page" disabled sx={{ textTransform: "none" }}>
          {currentPage + 1} / {totalPages}
        </ToggleButton>
        <ToggleButton value="next" disabled={!hasNextPage} onClick={onNext}>
          NEXT
        </ToggleButton>
      </ToggleButtonGroup>
    </Box>
  );
};
