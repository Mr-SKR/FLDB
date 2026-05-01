import React from "react";
import {
  Button,
  Typography,
  Box,
  Chip,
  Rating,
  Stack,
} from "@mui/material";
import Image from "next/image";
import { useRouter } from "next/router";
import {
  Restaurant as RestaurantIcon,
  LocationOn as LocationOnIcon,
  Directions as DirectionsIcon,
} from "@mui/icons-material";

interface FoodCardProps {
  slug: string;
  height: string | number;
  thumbnail: string;
  title: string;
  address: string;
  displacement: number;
  hasVeg: boolean;
  useLocation: boolean;
  index: number;
  setUseLocation: (force?: boolean) => Promise<boolean>;
  rating?: number | string;
  url?: string;
}

export default function FoodCard(props: FoodCardProps): React.ReactElement {
  const router = useRouter();
  const ratingValue = typeof props.rating === "string" ? parseFloat(props.rating) : props.rating;

  const handleCardClick = (e: React.MouseEvent) => {
    // Only navigate if the user didn't click an interactive element (button/chip/link)
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest(".MuiChip-root")) {
      return;
    }
    router.push(`/place/${props.slug}`);
  };

  return (
    <Box
      id={props.slug}
      onClick={handleCardClick}
      sx={{
        height: "100dvh",
        width: "100%",
        position: "relative",
        scrollSnapAlign: "start",
        overflow: "hidden",
        bgcolor: "black",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
      }}
    >
      {/* Background Image */}
      <Box sx={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}>
        <Image
          src={props.thumbnail}
          alt={props.title}
          fill
          style={{ objectFit: "cover" }}
          priority={props.index < 2}
        />
        {/* Dark Gradient Overlay */}
        <Box
          sx={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: "60%",
            background: "linear-gradient(to top, rgba(0,0,0,0.9) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0) 100%)",
            zIndex: 1,
          }}
        />
      </Box>

      {/* Top Badges */}
      <Box
        sx={{
          position: "absolute",
          top: 20,
          left: 16,
          right: 16,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          zIndex: 2,
        }}
      >
        {props.hasVeg && (
          <Chip
            icon={<RestaurantIcon sx={{ fontSize: "1rem !important", color: "white !important" }} />}
            label="Veg Friendly"
            size="small"
            sx={{
              bgcolor: "success.main",
              color: "white",
              fontWeight: "bold",
              boxShadow: 3,
            }}
          />
        )}
      </Box>

      {/* Bottom Content Overlay */}
      <Box
        sx={{
          position: "absolute",
          bottom: 40,
          left: 16,
          right: 16, // Use full width now that side actions are gone
          zIndex: 2,
          color: "white",
          textAlign: "left",
        }}
      >
        <Typography
          variant="h4"
          sx={{
            fontWeight: "bold",
            mb: 0.5,
            textShadow: "0 2px 4px rgba(0,0,0,0.5)",
            fontSize: { xs: "1.75rem", sm: "2.25rem" },
            lineHeight: 1.2,
          }}
        >
          {props.title}
        </Typography>

        {ratingValue && (
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
            <Rating value={ratingValue} readOnly precision={0.1} size="small" />
            <Typography variant="body2" sx={{ fontWeight: "bold", opacity: 0.9 }}>
              {ratingValue}
            </Typography>
          </Stack>
        )}

        <Box sx={{ display: "flex", alignItems: "flex-start", mb: 2, opacity: 0.9 }}>
          <LocationOnIcon sx={{ fontSize: "1.1rem", mr: 0.5, mt: 0.3 }} />
          <Typography
            variant="body2"
            sx={{
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {props.address}
          </Typography>
        </Box>
        
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {props.url && (
            <Button
              size="small"
              variant="contained"
              href={props.url}
              target="_blank"
              rel="noopener noreferrer"
              startIcon={<DirectionsIcon />}
              sx={{
                borderRadius: "20px",
                bgcolor: "rgba(255,255,255,0.2)",
                color: "white",
                backdropFilter: "blur(4px)",
                textTransform: "none",
                fontWeight: "bold",
                px: 2,
                "&:hover": { bgcolor: "rgba(255,255,255,0.3)" },
              }}
            >
              Directions
            </Button>
          )}

          <Chip
            label={props.displacement ? `${props.displacement} Km` : "Distance"}
            onClick={() => !props.useLocation && props.setUseLocation(true)}
            sx={{
              bgcolor: "rgba(0,0,0,0.4)",
              color: "white",
              border: "1px solid rgba(255,255,255,0.3)",
              fontWeight: "medium",
              height: "32px",
            }}
          />
        </Stack>
      </Box>
    </Box>
  );
}
