import * as React from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import CardActions from "@mui/material/CardActions";
import CardMedia from "@mui/material/CardMedia";
import Divider from "@mui/material/Divider";
import Typography from "@mui/material/Typography";
import { CardActionArea } from "@mui/material";

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
        <CardActions sx={{ textAlign: "center", justifyContent: "center" }}>
          <Typography gutterBottom variant="h7" component="div">
            Displacement:{" "}
            {props.displacement ? `${props.displacement} Km` : "N/A"}
          </Typography>
        </CardActions>
      </Card>
      <Divider />
    </>
  );
}
