import React from "react";
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
import Image from "next/image";

interface FoodCardProps {
  videoId: string;
  height: number;
  thumbnail: string;
  title: string;
  description: string;
  displacement: number;
  hasVeg: boolean;
  useLocation: boolean;
  index: number;
  setUseLocation: React.Dispatch<React.SetStateAction<boolean>>;
}

export default function FoodCard(props: FoodCardProps): JSX.Element {
  return (
    <React.Fragment>
      <Card
        id={props.videoId}
        sx={{ textAlign: "center", marginBottom: "0.5rem" }}
      >
        <CardActionArea href={`/fldb/${props.videoId}`}>
          <CardMedia>
            <div
              style={{
                position: "relative",
                width: "100%",
                height: props.height,
              }}
            >
              <Image
                src={props.thumbnail}
                alt={props.title ? props.title : "No image found"}
                layout="fill"
                objectFit="cover"
                priority={props.index < 2 ? true : false}
              />
            </div>
          </CardMedia>
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
          <Button
            size="medium"
            sx={{ textTransform: "none" }}
            onClick={() => {
              if (!props.useLocation) props.setUseLocation(true);
            }}
          >
            Displacement:{" "}
            {props.displacement
              ? `${props.displacement} Km`
              : "Enable location"}
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
    </React.Fragment>
  );
}
