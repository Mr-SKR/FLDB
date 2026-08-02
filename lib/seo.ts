/**
 * SEO helpers: canonical URLs, SERP copy, and schema.org JSON-LD builders.
 *
 * Deliberately dependency-free apart from types and constants — this module is imported by
 * both `getStaticProps` and client components, so it must not pull in `lib/env` (which
 * throws at import time without a database URL) or anything Node-only.
 *
 * Guiding rule for the JSON-LD builders: never emit a property we cannot substantiate.
 * Structured data that claims more than the data supports is worse than none — Google
 * rejects invalid markup and repeated violations put rich results at risk for the whole
 * site. Every optional field below is therefore conditional on the data actually existing.
 */

import { PlaceInterface, VideoInterface } from "../types/types";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_URL,
} from "../config/constants";

/**
 * Canonical origin for the current deployment, without a trailing slash.
 *
 * Server-side only in practice: `process.env.HOST` is undefined in the browser, which is
 * fine because every caller resolves this during `getStaticProps` and passes the result
 * down as a prop.
 */
export const getSiteUrl = (): string =>
  (process.env.HOST || SITE_URL).replace(/\/+$/, "");

/** Joins a path onto the site origin, producing the absolute URL canonical tags require. */
export const absoluteUrl = (siteUrl: string, path: string): string =>
  `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;

/**
 * Trims text to a length search engines will display without cutting mid-word.
 * Returns the text unchanged when it already fits.
 */
export const truncateAtWord = (text: string, max: number): string => {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max - 1);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > max * 0.6 ? cut.slice(0, lastSpace) : cut).replace(/[,;:.\-–]$/, "")}…`;
};

const TITLE_MAX = 60;
const DESCRIPTION_MAX = 158;

/**
 * Builds a place page title.
 *
 * Adds an intent-bearing qualifier ("Reviews & Directions") when the restaurant name is
 * short enough to leave room, since that is what people actually search for alongside a
 * restaurant name. Long names keep the brand suffix and drop the qualifier rather than
 * being truncated into meaninglessness.
 */
export const buildPlaceTitle = (name: string): string => {
  const suffix = ` | ${SITE_SHORT_NAME}`;
  const qualifier = " — Reviews & Directions";

  if (`${name}${qualifier}${suffix}`.length <= TITLE_MAX) {
    return `${name}${qualifier}${suffix}`;
  }
  if (`${name}${suffix}`.length <= TITLE_MAX) return `${name}${suffix}`;
  return `${truncateAtWord(name, TITLE_MAX - suffix.length)}${suffix}`;
};

/**
 * Reduces a full Google address to the city/region tail people actually search by.
 *
 * A `formatted_address` is typically ~100 characters — "1004, 26th Main Rd, 4th T Block
 * East, Jayanagara 9th Block, Jayanagar, Bengaluru, Karnataka 560041, India" — which on its
 * own consumes the entire meta description budget and pushes out the rating and review
 * count that actually earn the click. The street number belongs in the structured data,
 * not the snippet.
 *
 * Works from the end of the string: drops the country, strips postcodes, and keeps the last
 * two meaningful segments, which across Indian addresses lands on "City, State".
 */
export const shortLocality = (formattedAddress?: string): string | undefined => {
  if (!formattedAddress) return undefined;

  const segments = formattedAddress
    .split(",")
    .map((segment) => segment.trim())
    // Strip trailing postcodes: "Karnataka 560041" -> "Karnataka".
    .map((segment) => segment.replace(/\s*\b\d{5,6}\b\s*/g, " ").trim())
    .filter(Boolean)
    // Drop anything that was only a postcode, and the trailing country.
    .filter((segment) => !/^\d+$/.test(segment) && !/^india$/i.test(segment));

  if (!segments.length) return undefined;
  return segments.slice(-2).join(", ");
};

/**
 * Builds a place page meta description from the fields we genuinely hold.
 *
 * The previous description was "Explore {name} on Food Lovers Database (FLDb)" for every
 * one of the 600+ place pages — near-duplicate boilerplate that gives a search engine no
 * reason to rank one page over another and gives a searcher no reason to click.
 */
export const buildPlaceDescription = (place: PlaceInterface, videoCount: number): string => {
  const locality = shortLocality(place.formatted_address);
  const lead = locality ? `${place.name} in ${locality}.` : `${place.name}.`;

  const facts: string[] = [];
  if (typeof place.rating === "number") facts.push(`Rated ${place.rating}/5 on Google`);
  if (videoCount > 0) {
    facts.push(
      videoCount === 1 ? "featured in 1 food vlog" : `featured in ${videoCount} food vlogs`
    );
  }
  const factSentence = facts.length ? `${facts.join(", ")}.` : "";

  /**
   * Assembled by dropping whole clauses until it fits, rather than concatenating
   * everything and cutting the result to length. Truncating mid-clause left most
   * descriptions ending in a severed phrase ("…check opening…"), which reads as broken
   * in a search result; losing the least important clause intact reads as written.
   * Ordered most- to least- expendable.
   */
  const candidates: [veg: boolean, cta: boolean][] = [
    [true, true],
    [false, true],
    [true, false],
    [false, false],
  ];

  const assemble = (veg: boolean, cta: boolean): string =>
    [
      lead,
      factSentence,
      veg && place.hasVeg ? "Veg-friendly." : "",
      cta ? "See photos, hours and directions." : "",
    ]
      .filter(Boolean)
      .join(" ");

  for (const [veg, cta] of candidates) {
    const candidate = assemble(veg, cta);
    if (candidate.length <= DESCRIPTION_MAX) return candidate;
  }

  return truncateAtWord(assemble(false, false), DESCRIPTION_MAX);
};

/* -------------------------------------------------------------------------- */
/* Opening hours                                                              */
/* -------------------------------------------------------------------------- */

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
 *    time — `"6:30 – 11:00 AM"` means 06:30–11:00, while `"12:30 – 8:30 PM"` means
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

export interface OpeningHoursSpecification {
  "@type": "OpeningHoursSpecification";
  dayOfWeek: string;
  opens: string;
  closes: string;
}

/** Folds the typographic whitespace and dashes Google emits down to ASCII. */
const normalizeHoursText = (value: string): string =>
  value
    .replace(/[   ]/g, " ")
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
 * Returns an empty array for closed days and for anything it cannot parse confidently —
 * omitting a day is always safer than guessing at it.
 */
const parseWeekdayLine = (line: string): OpeningHoursSpecification[] => {
  const normalized = normalizeHoursText(line);
  const separator = normalized.indexOf(":");
  if (separator === -1) return [];

  const day = normalized.slice(0, separator).trim();
  if (!DAY_NAMES.includes(day as (typeof DAY_NAMES)[number])) return [];

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

    const closes = to24Hour(close, close.meridiem);
    let opens = to24Hour(open, open.meridiem ?? close.meridiem);

    // An inherited meridiem that puts opening after closing means the range straddles
    // noon — "11:30 - 12:30 PM" opens in the morning. Flip it back.
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
/* JSON-LD                                                                    */
/* -------------------------------------------------------------------------- */

export type JsonLd = Record<string, unknown>;

/**
 * `Restaurant` markup for a place page — the highest-value structured data on the site,
 * since it is what lets a restaurant page qualify for local and rich results.
 *
 * Two properties are deliberately conditional:
 *
 *  - `aggregateRating` requires `ratingCount`/`reviewCount` to be valid, and no stored
 *    place currently has a review count. It is therefore emitted only once
 *    `user_ratings_total` has been captured by a re-sync. Emitting a rating without its
 *    count would be invalid markup.
 *  - `subjectOf` VideoObjects require `uploadDate`, which likewise only exists on videos
 *    written after the sync started capturing `publishedAt`.
 */
export const buildRestaurantJsonLd = ({
  place,
  videos,
  pageUrl,
  imageUrls,
}: {
  place: PlaceInterface;
  videos: VideoInterface[];
  pageUrl: string;
  imageUrls: string[];
}): JsonLd => {
  const jsonLd: JsonLd = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": pageUrl,
    name: place.name,
    url: pageUrl,
  };

  if (imageUrls.length) jsonLd.image = imageUrls;

  if (place.formatted_address) {
    jsonLd.address = {
      "@type": "PostalAddress",
      streetAddress: place.formatted_address,
    };
  }

  const lat = place.geometry?.location?.lat;
  const lng = place.geometry?.location?.lng;
  if (typeof lat === "number" && typeof lng === "number") {
    jsonLd.geo = { "@type": "GeoCoordinates", latitude: lat, longitude: lng };
  }

  if (place.international_phone_number) {
    jsonLd.telephone = place.international_phone_number;
  }

  // The Google Maps listing is the same real-world entity, which is exactly what `sameAs`
  // is for — it helps search engines reconcile this page with the known business.
  if (place.url) jsonLd.sameAs = [place.url];

  const openingHours = buildOpeningHoursSpecification(place.opening_hours?.weekday_text);
  if (openingHours.length) jsonLd.openingHoursSpecification = openingHours;

  if (place.business_status === "CLOSED_TEMPORARILY") {
    jsonLd.publicAccess = false;
  }

  if (typeof place.rating === "number" && typeof place.user_ratings_total === "number" && place.user_ratings_total > 0) {
    jsonLd.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: place.rating,
      ratingCount: place.user_ratings_total,
      bestRating: 5,
      worstRating: 1,
    };
  }

  const videoObjects = videos
    .filter((video) => Boolean(video.publishedAt))
    .map((video) => {
      const object: JsonLd = {
        "@type": "VideoObject",
        name: video.videoTitle,
        uploadDate: new Date(video.publishedAt as string | Date).toISOString(),
        embedUrl: `https://www.youtube.com/embed/${video.videoId}`,
        contentUrl: `https://www.youtube.com/watch?v=${video.videoId}`,
      };
      if (video.thumbnail?.large || video.thumbnail?.small) {
        object.thumbnailUrl = [video.thumbnail.large || video.thumbnail.small];
      }
      if (video.videoDescription) {
        object.description = truncateAtWord(video.videoDescription, 300);
      }
      return object;
    });

  if (videoObjects.length) jsonLd.subjectOf = videoObjects;

  return jsonLd;
};

/** Breadcrumb trail, which search engines render in place of a bare URL in results. */
export const buildBreadcrumbJsonLd = (
  items: { name: string; url: string }[]
): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});

/**
 * Site-level identity markup.
 *
 * Intentionally omits `potentialAction`/`SearchAction`: it exists to produce the sitelinks
 * search box, which Google deprecated, and the site has no crawlable URL that renders
 * search results for a query anyway. Claiming one would be markup that does not match
 * the page.
 */
export const buildWebSiteJsonLd = (siteUrl: string): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "WebSite",
  "@id": `${siteUrl}/#website`,
  url: siteUrl,
  name: SITE_NAME,
  alternateName: SITE_SHORT_NAME,
  description: SITE_DESCRIPTION,
  inLanguage: "en",
});

/** FAQ markup for the About page, which is a genuine question-and-answer document. */
export const buildFaqJsonLd = (
  faqs: { title: string; description: string }[]
): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((faq) => ({
    "@type": "Question",
    name: faq.title,
    acceptedAnswer: { "@type": "Answer", text: faq.description },
  })),
});

/**
 * `ItemList` for the home feed. Gives search engines an explicit, ordered manifest of the
 * places linked from the page rather than leaving them to infer it from markup.
 */
export const buildItemListJsonLd = (
  places: { name: string; slug: string }[],
  siteUrl: string
): JsonLd => ({
  "@context": "https://schema.org",
  "@type": "ItemList",
  itemListElement: places.map((place, index) => ({
    "@type": "ListItem",
    position: index + 1,
    name: place.name,
    url: absoluteUrl(siteUrl, `/place/${place.slug}`),
  })),
});
