import {
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Linkify from "linkify-react";

export default function CustomAccordion(props) {
  return (
    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          id={`${props.title}-accordion`}
        >
          <Typography>{props.title}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Linkify tagName="p">
            <Typography textAlign="center">
              {props.description ? String(props.description) : "N/A"}
            </Typography>
          </Linkify>
        </AccordionDetails>
      </Accordion>
    </Grid>
  );
}
