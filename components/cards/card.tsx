import React from "react";
import {
  CardActionArea,
  Button,
  Typography,
  CardMedia,
  CardActions,
  CardContent,
  Card,
  Box,
  Chip,
} from "@mui/material";
import Image from "next/image";
import RestaurantIcon from "@mui/icons-material/Restaurant";
import LocationOnIcon from "@mui/icons-material/LocationOn";

interface FoodCardProps {
  slug: string;
  height: number;
  thumbnail: string;
  title: string;
  address: string;
  displacement: number;
  hasVeg: boolean;
  useLocation: boolean;
  index: number;
  setUseLocation: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function FoodCard(props: FoodCardProps): JSX.Element {
  return (
    <Card
      id={props.slug}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        transition: "transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out",
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 6,
        },
      }}
    >
      <CardActionArea
        href={`/place/${props.slug}`}
        sx={{ display: "flex", flexDirection: "column", flexGrow: 1, alignItems: "stretch" }}
      >
        <CardMedia sx={{ position: "relative" }}>
          <Box
            style={{
              position: "relative",
              width: "100%",
              height: props.height,
              backgroundColor: "action.hover", // Placeholder color for slow loading
            }}
          >
            <Image
              src={props.thumbnail}
              alt={props.title ? props.title : "No image found"}
              layout="fill"
              objectFit="cover"
              priority={props.index < 2 ? true : false}
            />
            {props.hasVeg && (
              <Chip
                icon={<RestaurantIcon sx={{ fontSize: "1rem !important", color: "white !important" }} />}
                label="Veg Friendly"
                size="small"
                color="success"
                sx={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  fontWeight: "bold",
                  boxShadow: 2,
                }}
              />
            )}
          </Box>
        </CardMedia>
        <CardContent sx={{ flexGrow: 1, textAlign: "left", pb: 1 }}>
          <Typography
            gutterBottom
            variant="h6"
            component="div"
            sx={{
              fontWeight: "bold",
              lineHeight: 1.2,
              height: "2.4em", // Fixed height for 2 lines
              overflow: "hidden",
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              color: "text.primary",
            }}
          >
            {props.title ? props.title : "No title"}
          </Typography>
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{
              overflow: "hidden",
              textOverflow: "ellipsis",
              display: "-webkit-box",
              WebkitLineClamp: 1,
              WebkitBoxOrient: "vertical",
            }}
          >
            {props.address ? props.address : "No address"}
          </Typography>
        </CardContent>
      </CardActionArea>

      <CardActions sx={{ px: 2, pb: 2, pt: 0, justifyContent: "space-between" }}>
        <Button
          size="small"
          variant="outlined"
          startIcon={<LocationOnIcon />}
          sx={{
            textTransform: "none",
            borderRadius: "20px",
            borderColor: props.displacement ? "primary.main" : "divider",
            color: props.displacement ? "primary.main" : "text.secondary",
          }}
          onClick={() => {
            if (!props.useLocation) props.setUseLocation(true);
          }}
        >
          {props.displacement ? `${props.displacement} Km` : "Distance"}
        </Button>
        <Button
          href={`/place/${props.slug}`}
          size="small"
          variant="contained"
          sx={{
            textTransform: "none",
            borderRadius: "20px",
            boxShadow: 0,
          }}
        >
          View Details
        </Button>
      </CardActions>
    </Card>
  );
}
