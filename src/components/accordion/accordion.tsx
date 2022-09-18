import React from "react";
import {
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Linkify from "linkify-react";

interface CustomAccordionProps {
  qid: number;
  title: string;
  description: string;
}

export default function CustomAccordion(
  props: CustomAccordionProps
): JSX.Element {
  return (
    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          id={`${props.qid}-accordion`}
        >
          <Typography>{props.title}</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Linkify tagName="p">
            {props.description ? String(props.description) : "N/A"}
          </Linkify>
        </AccordionDetails>
      </Accordion>
    </Grid>
  );
}
