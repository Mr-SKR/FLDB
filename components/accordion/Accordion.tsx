import React from "react";
import {
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Typography,
} from "@mui/material";
import { ExpandMore as ExpandMoreIcon } from "@mui/icons-material";
import Linkify from "linkify-react";

interface CustomAccordionProps {
  qid: number;
  title: string;
  description: string;
}

export default function CustomAccordion(
  props: CustomAccordionProps
): React.ReactElement {
  return (
    <Grid item xs={12}>
      <Accordion>
        <AccordionSummary
          expandIcon={<ExpandMoreIcon />}
          id={`${props.qid}-accordion`}
        >
          {/* Each FAQ question is a section heading under the page h1, which gives the
              About page a real outline instead of a flat run of paragraphs. */}
          <Typography component="h2" variant="body1" sx={{ fontWeight: 600 }}>
            {props.title}
          </Typography>
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
