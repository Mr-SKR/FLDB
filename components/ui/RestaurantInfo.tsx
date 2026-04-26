import React from "react";
import {
  Grid,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Link,
} from "@mui/material";
import {
  Grade as GradeIcon,
  Directions as DirectionsIcon,
  LocationOn as LocationOnIcon,
  Phone as PhoneIcon,
} from "@mui/icons-material";
import { VideoInterface } from "../../types/types";

interface RestaurantInfoProps {
  data: VideoInterface;
}

export const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ data }) => {
  return (
    <Grid container spacing={2}>
      <Grid item xs={12} md={6}>
        <List>
          <ListItem>
            <ListItemIcon>
              <GradeIcon />
            </ListItemIcon>
            <ListItemText
              primary={
                data.rating ? (
                  <Link
                    href={`https://search.google.com/local/reviews?placeid=${data.place_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {data.rating} / 5
                  </Link>
                ) : (
                  "N/A"
                )
              }
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <PhoneIcon />
            </ListItemIcon>
            <ListItemText
              primary={
                data.international_phone_number ? (
                  <Link href={`tel:${data.international_phone_number}`}>
                    {data.international_phone_number}
                  </Link>
                ) : (
                  "N/A"
                )
              }
            />
          </ListItem>
        </List>
      </Grid>
      <Grid item xs={12} md={6}>
        <List>
          <ListItem>
            <ListItemIcon>
              <DirectionsIcon />
            </ListItemIcon>
            <ListItemText
              primary={
                data.url ? (
                  <Link href={data.url} target="_blank" rel="noopener noreferrer">
                    Maps Link
                  </Link>
                ) : (
                  "N/A"
                )
              }
            />
          </ListItem>
          <ListItem>
            <ListItemIcon>
              <LocationOnIcon />
            </ListItemIcon>
            <ListItemText primary={data.formatted_address || "N/A"} />
          </ListItem>
        </List>
      </Grid>
    </Grid>
  );
};
