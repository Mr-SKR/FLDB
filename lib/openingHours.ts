/**
 * Parsing and interpretation of Google's opening-hours strings.
 *
 * Extracted from `lib/seo.ts`, which owned this only because JSON-LD was the first consumer.
 * The UI now needs the same parse to answer "is this place open right now?", and a client
 * component importing it should not drag every JSON-LD builder into the browser bundle with
 * it. `lib/seo.ts` is now just another caller; this module is the one place to import from.
 *
 * Dependency-free apart from constants, for the same reason `lib/seo.ts` is: both are
 * imported from `getStaticProps` and from client components.
 */

import { PLACES_TIME_ZONE } from "../config/constants";

/**
 * Google returns opening hours only as localised display strings such as
 * `"Tuesday: 6:30 – 11:00 AM, 12:30 – 8:30 PM"`. The structured `periods` array is not
 * stored on our documents (the Mongoose schema omits it), so producing
 * `openingHoursSpecification` means parsing that text.
 *
 * Two properties of the format make this less obvious than it looks, both confirmed by
 * scanning all 4,116 stored lines:
 *
 *  - The opening time frequently carries no meridiem and inherits it from the closing
 *    time. For example, `"6:30 – 11:00 AM"` means 06:30–11:00, while `"12:30 – 8:30 PM"` means
 *    12:30–20:30. Reading a bare `6:30` as 06:30 by default would be wrong half the time.
 *  - The strings contain U+2013 EN DASH, U+2009 THIN SPACE and U+202F NARROW NO-BREAK
 *    SPACE rather than ASCII equivalents.
 *
 * The only non-numeric bodies that occur are "Closed" and "Open 24 hours".
 */
const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

type DayName = (typeof DAY_NAMES)[number];

export interface OpeningHoursSpecification {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string;
  opens: string;
  closes: string;
}

/**
 * Folds the typographic whitespace and dashes Google emits down to ASCII.
 *
 * The non-ASCII characters in the two character classes below are DATA, not prose: they are
 * the exact bytes Google puts in `weekday_text`, and this is the only thing that recognises
 * them. Do not "clean them up" to ASCII equivalents, or every opening-hours range stops
 * parsing and the site silently emits no `openingHoursSpecification` at all.
 */
const normalizeHoursText = (value: string): string =>
  value
    .replace(/[   ]/g, " ")
    .replace(/[‒–—−]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

interface ClockTime {
  hour: number;
  minute: number;
  meridiem: "AM" | "PM" | null;
}

const parseClockTime = (value: string): ClockTime | null => {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(AM|PM)?$/i);
  if (!match) return null;

  const hour = Number(match[1]);
  const minute = match[2] ? Number(match[2]) : 0;
  if (hour > 23 || minute > 59) return null;

  return {
    hour,
    minute,
    meridiem: match[3] ? (match[3].toUpperCase() as "AM" | "PM") : null,
  };
};

/** Converts a 12-hour clock reading to the "HH:MM" that schema.org expects. */
const to24Hour = (time: ClockTime, meridiem: "AM" | "PM"): string => {
  let hour = time.hour % 12;
  if (meridiem === "PM") hour += 12;
  return `${String(hour).padStart(2, "0")}:${String(time.minute).padStart(2, "0")}`;
};

const minutesOf = (value: string): number => {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + m;
};

/**
 * Parses one `weekday_text` entry into zero or more specifications.
 * Returns an empty array for closed days and for anything it cannot parse confidently;
 * omitting a day is always safer than guessing at it.
 */
const parseWeekdayLine = (line: string): OpeningHoursSpecification[] => {
  const normalized = normalizeHoursText(line);
  const separator = normalized.indexOf(":");
  if (separator === -1) return [];

  const day = normalized.slice(0, separator).trim();
  if (!DAY_NAMES.includes(day as DayName)) return [];

  const body = normalized.slice(separator + 1).trim();
  if (/^closed$/i.test(body)) return [];
  if (/^open 24 hours$/i.test(body)) {
    return [
      { "@type": "OpeningHoursSpecification", dayOfWeek: day, opens: "00:00", closes: "23:59" },
    ];
  }

  const specs: OpeningHoursSpecification[] = [];

  for (const range of body.split(",")) {
    const [rawOpen, rawClose] = range.split("-");
    if (!rawOpen || !rawClose) continue;

    const open = parseClockTime(rawOpen);
    const close = parseClockTime(rawClose);
    // The closing time must carry a meridiem; it is the anchor the opening time inherits.
    if (!open || !close || !close.meridiem) continue;

    /*
      A midnight close is written as the *end* of the day, not the start of it.

      "9:00 AM – 12:00 AM" parses to a closing time of 00:00, which is numerically before
      every opening time it can pair with. `Open 24 hours` in the branch above already
      settled the convention for this, using 23:59; matching it here keeps the two paths
      from describing the same wall-clock moment two different ways.

      Normalised before the straddle check below, not after, so the comparison sees the
      real end of the interval. With the raw 00:00 a bare-meridiem opening such as
      "9:00 – 12:00 AM" looked like it ran backwards and was flipped to 21:00, turning a
      full day of trading into a three-hour evening. It also makes "12:00 – 12:00 AM"
      resolve to 00:00–23:59, which is what a full day either side of midnight means.

      Genuine overnight ranges ("6:00 PM – 2:00 AM") are untouched: a closing time past
      midnight but before noon is left to wrap, which is the form Google documents.
    */
    const closes = to24Hour(close, close.meridiem) === "00:00"
      ? "23:59"
      : to24Hour(close, close.meridiem);
    let opens = to24Hour(open, open.meridiem ?? close.meridiem);

    // An inherited meridiem that puts opening after closing means the range straddles
    // noon: "11:30 - 12:30 PM" opens in the morning. Flip it back.
    if (!open.meridiem && minutesOf(opens) > minutesOf(closes)) {
      opens = to24Hour(open, close.meridiem === "PM" ? "AM" : "PM");
    }

    specs.push({ "@type": "OpeningHoursSpecification", dayOfWeek: day, opens, closes });
  }

  return specs;
};

export const buildOpeningHoursSpecification = (
  weekdayText?: string[]
): OpeningHoursSpecification[] =>
  (weekdayText ?? []).flatMap(parseWeekdayLine);

/* -------------------------------------------------------------------------- */
/* Open right now                                                             */
/* -------------------------------------------------------------------------- */

/**
 * The state of a place at a given instant.
 *
 * "unknown" is a first-class outcome rather than a fallback to "closed". A place with no
 * usable hours is not shut; saying so would send someone away from an open restaurant, and
 * that is a worse failure than saying nothing.
 */
export type OpenState =
  | { status: "open"; closesAt: string; closingSoon: boolean }
  | { status: "closed"; opensAt?: string; opensDay?: DayName }
  | { status: "unknown" };

/** Minutes before closing at which "Open" becomes "Closing soon". */
const CLOSING_SOON_MINUTES = 60;

const MINUTES_PER_DAY = 24 * 60;

interface Interval {
  /** Day the interval starts on, as an index into DAY_NAMES. */
  day: number;
  start: number;
  /** Minutes from the start of `day`. Exceeds 1440 for a range that runs past midnight. */
  end: number;
}

/**
 * Flattens the parsed specifications into intervals on a weekly timeline.
 *
 * A range whose closing time is numerically before its opening time runs past midnight
 * ("6:00 PM – 2:00 AM"), and is represented by letting `end` overflow into the next day
 * rather than splitting it in two. That keeps "closes at 2 am" answerable from the single
 * interval the reader is currently inside.
 */
const toIntervals = (specs: OpeningHoursSpecification[]): Interval[] =>
  specs.flatMap((spec) => {
    const day = DAY_NAMES.indexOf(spec.dayOfWeek as DayName);
    if (day === -1) return [];

    const start = minutesOf(spec.opens);
    const rawEnd = minutesOf(spec.closes);
    const end = rawEnd <= start ? rawEnd + MINUTES_PER_DAY : rawEnd;

    return [{ day, start, end }];
  });

/**
 * Reads the wall clock in the time zone the places are in, not the visitor's.
 *
 * Everything catalogued here is in India, so a visitor in another zone asking whether a
 * Bengaluru restaurant is open wants Bengaluru's clock. Using the device's own zone would
 * quietly report the wrong answer for exactly the travellers this site is built for.
 */
const nowInPlacesZone = (now: Date): { day: number; minutes: number } => {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PLACES_TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const lookup = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  const day = DAY_NAMES.indexOf(lookup("weekday") as DayName);
  const minutes = Number(lookup("hour")) * 60 + Number(lookup("minute"));

  return { day: day === -1 ? 0 : day, minutes };
};

/** Renders "21:30" as "9:30 pm", and drops ":00" so "18:00" reads as "6 pm". */
const formatClockTime = (value: string): string => {
  const total = minutesOf(value) % MINUTES_PER_DAY;
  const hour24 = Math.floor(total / 60);
  const minute = total % 60;
  const meridiem = hour24 < 12 ? "am" : "pm";
  const hour = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minute === 0
    ? `${hour} ${meridiem}`
    : `${hour}:${String(minute).padStart(2, "0")} ${meridiem}`;
};

/** "HH:MM" for a minute offset that may have overflowed past midnight. */
const clockAt = (minutes: number): string => {
  const wrapped = ((minutes % MINUTES_PER_DAY) + MINUTES_PER_DAY) % MINUTES_PER_DAY;
  return `${String(Math.floor(wrapped / 60)).padStart(2, "0")}:${String(wrapped % 60).padStart(2, "0")}`;
};

/**
 * Answers "is this place open right now?" from the stored `weekday_text`.
 *
 * Deliberately not read from `opening_hours.open_now`, which the sync also stores. That
 * field is a boolean snapshot of the moment the place was last synced, so a page rendered
 * from it would state a fact that was true days ago and is wrong most of the time. The
 * weekday strings, by contrast, are a schedule, and a schedule stays true.
 *
 * Must be called on the client only (see `useOpenState`). Calling it during a static
 * render would bake one instant's answer into a page cached for an hour.
 */
export const getOpenState = (weekdayText?: string[], now: Date = new Date()): OpenState => {
  const intervals = toIntervals(buildOpeningHoursSpecification(weekdayText));
  if (intervals.length === 0) return { status: "unknown" };

  const { day, minutes } = nowInPlacesZone(now);

  // Today's intervals, plus yesterday's, since one of those may still be running past
  // midnight and is what "open now" means at 1 am.
  const yesterday = (day + 6) % 7;
  for (const interval of intervals) {
    const offset = interval.day === day ? 0 : interval.day === yesterday ? -MINUTES_PER_DAY : null;
    if (offset === null) continue;

    const start = interval.start + offset;
    const end = interval.end + offset;
    if (minutes < start || minutes >= end) continue;

    return {
      status: "open",
      closesAt: formatClockTime(clockAt(interval.end)),
      closingSoon: end - minutes <= CLOSING_SOON_MINUTES,
    };
  }

  // Closed. Find the next opening within the week, so the reader is told when to come back
  // rather than just being turned away.
  for (let ahead = 0; ahead < 7; ahead += 1) {
    const candidateDay = (day + ahead) % 7;
    const upcoming = intervals
      .filter((interval) => interval.day === candidateDay)
      .map((interval) => interval.start)
      .filter((start) => ahead > 0 || start > minutes)
      .sort((a, b) => a - b);

    if (upcoming.length === 0) continue;

    return {
      status: "closed",
      opensAt: formatClockTime(clockAt(upcoming[0])),
      opensDay: DAY_NAMES[candidateDay],
    };
  }

  return { status: "closed" };
};
