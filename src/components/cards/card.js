import * as React from "react";
import {
  CardActionArea,
  Button,
  Typography,
  Divider,
  CardMedia,
  CardActions,
  CardContent,
  Card,
} from "@mui/material";

export default function FoodCard(props) {
  return (
    <>
      <Card
        id={props.videoId}
        sx={{ textAlign: "center", marginBottom: "0.5rem" }}
      >
        <CardActionArea href={`/fldb/${props.videoId}`}>
          <CardMedia
            component="img"
            height={props.height}
            image={props.thumbnail}
            alt={props.title ? props.title : "No image found"}
          />
          <CardContent>
            <Typography gutterBottom variant="h6" component="div">
              {props.title ? props.title : "No title"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {props.description ? props.description : "No description"}
            </Typography>
          </CardContent>
        </CardActionArea>
        <CardActions sx={{ justifyContent: "center" }}>
          <Button size="medium" sx={{ textTransform: "none" }}>
            Displacement:{" "}
            {props.displacement ? `${props.displacement} Km` : "N/A"}
          </Button>
          {props.hasVeg && (
            <Button
              size="medium"
              color="secondary"
              sx={{ textTransform: "none" }}
            >
              Veg Friendly
            </Button>
          )}
        </CardActions>
      </Card>
      <Divider />
    </>
  );
}
