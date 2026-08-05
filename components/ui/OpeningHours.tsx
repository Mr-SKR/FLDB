import React, { useEffect, useState } from "react";
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Typography,
} from "@mui/material";
import {
  AccessTime as AccessTimeIcon,
  ExpandMore as ExpandMoreIcon,
} from "@mui/icons-material";
import { PLACES_TIME_ZONE } from "../../config/constants";

/**
 * Today's weekday name in the places' time zone, or null before mount.
 *
 * Null on the server for the same reason `useOpenState` returns null there: the page is
 * cached for an hour, so a day baked in at render time would be wrong for most of the
 * people who see it, and a server/client difference in the markup is a hydration mismatch.
 */
const useTodayName = (): string | null => {
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    // Deliberately after mount: this is client-only state the server could not have
    // rendered, so producing it during render would mismatch on hydration. Same reasoning,
    // and the same suppression, as the sessionStorage restore in `usePlaceFilters`.
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setToday(
      new Intl.DateTimeFormat("en-GB", {
        timeZone: PLACES_TIME_ZONE,
        weekday: "long",
      }).format(new Date())
    );
  }, []);

  return today;
};

/**
 * The weekly opening hours.
 *
 * Still an accordion, because seven lines of schedule is not what most readers came for,
 * but no longer the only place the information exists: the summary row now carries the
 * live open/closed state, so the common question is answered without opening anything.
 * Today's line is emphasised inside, which is the second most common question.
 */
export const OpeningHours: React.FC<{ weekdayText?: string[] }> = ({ weekdayText }) => {
  const today = useTodayName();
  const lines = weekdayText ?? [];

  return (
    <Accordion
      elevation={0}
      sx={{
        border: "1px solid",
        borderColor: "divider",
        borderRadius: "16px !important",
        mb: 4,
        bgcolor: "action.hover",
        overflow: "hidden",
        "&:before": { display: "none" },
      }}
    >
      <AccordionSummary expandIcon={<ExpandMoreIcon />}>
        {/* No open/closed chip here.
            It belongs beside the place name, which is where `PlaceMetaRow` puts it, and
            both are on screen together on a desktop viewport: the same sentence twice
            within one glance reads as a rendering bug rather than as emphasis. What this
            panel uniquely adds is the week, with today picked out below. */}
        <Box display="flex" alignItems="center" gap={1.5} sx={{ pr: 1 }}>
          <AccessTimeIcon sx={{ color: "primary.main" }} />
          <Typography fontWeight="bold">Opening hours</Typography>
        </Box>
      </AccordionSummary>
      <AccordionDetails
        sx={{ bgcolor: "background.paper", borderTop: "1px solid", borderColor: "divider" }}
      >
        {lines.length > 0 ? (
          <Box component="dl" sx={{ m: 0, py: 1 }}>
            {lines.map((line) => {
              // Google formats each line as "Monday: 9:00 AM – 10:00 PM". Splitting on the
              // first colon keeps the day and the hours in separate columns, so the week
              // reads as a table rather than a wall of sentences.
              const separator = line.indexOf(":");
              const day = separator === -1 ? line : line.slice(0, separator).trim();
              const hours = separator === -1 ? "" : line.slice(separator + 1).trim();
              const isToday = today !== null && day === today;

              return (
                <Box
                  key={line}
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: 2,
                    py: 0.75,
                    px: 1,
                    borderRadius: "8px",
                    bgcolor: isToday ? "action.selected" : "transparent",
                  }}
                >
                  <Typography
                    component="dt"
                    variant="body2"
                    sx={{ fontWeight: isToday ? 700 : 500, minWidth: 96 }}
                  >
                    {day}
                    {isToday && (
                      <Box component="span" sx={{ color: "primary.main", ml: 0.75 }}>
                        (today)
                      </Box>
                    )}
                  </Typography>
                  <Typography
                    component="dd"
                    variant="body2"
                    sx={{
                      m: 0,
                      textAlign: "right",
                      fontWeight: isToday ? 700 : 400,
                      color: isToday ? "text.primary" : "text.secondary",
                    }}
                  >
                    {hours}
                  </Typography>
                </Box>
              );
            })}
          </Box>
        ) : (
          <Typography variant="body2" color="text.secondary">
            No hours listed
          </Typography>
        )}
      </AccordionDetails>
    </Accordion>
  );
};
