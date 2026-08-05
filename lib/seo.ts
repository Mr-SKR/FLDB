/**
 * SEO helpers: canonical URLs, SERP copy, and schema.org JSON-LD builders.
 *
 * Deliberately dependency-free apart from types and constants, because this module is imported by
 * both `getStaticProps` and client components, so it must not pull in `lib/env` (which
 * throws at import time without a database URL) or anything Node-only.
 *
 * Guiding rule for the JSON-LD builders: never emit a property we cannot substantiate.
 * Structured data that claims more than the data supports is worse than none. Google
 * rejects invalid markup and repeated violations put rich results at risk for the whole
 * site. Every optional field below is therefore conditional on the data actually existing.
 */

import { PlaceInterface, VideoInterface } from "../types/types";
import { buildOpeningHoursSpecification } from "./openingHours";
import {
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_SHORT_NAME,
  SITE_URL,
} from "../config/constants";

/**
 * Canonical origin for the current deployment, without a trailing slash.
 *
 * Prefer `NEXT_PUBLIC_SITE_URL`. `HOST` is still read for compatibility with existing
 * deployments, but it is a dangerous name to depend on: on many Node hosts and process
 * managers `HOST` is the *bind address*, so a platform setting `HOST=0.0.0.0` would
 * silently rewrite every canonical tag, `og:url`, sitemap entry and Disqus thread URL to
 * `0.0.0.0/…`, an SEO failure that throws no error and looks fine locally.
 *
 * Server-side only in practice, since every caller resolves this during `getStaticProps`
 * and passes the result down as a prop. `NEXT_PUBLIC_` is nonetheless the correct prefix:
 * it makes the value available if a client component ever needs it, which the bare name
 * would not.
 */
export const getSiteUrl = (): string =>
  (process.env.NEXT_PUBLIC_SITE_URL || process.env.HOST || SITE_URL).replace(/\/+$/, "");

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
  const qualifier = ": Reviews & Directions";

  if (`${name}${qualifier}${suffix}`.length <= TITLE_MAX) {
    return `${name}${qualifier}${suffix}`;
  }
  if (`${name}${suffix}`.length <= TITLE_MAX) return `${name}${suffix}`;
  return `${truncateAtWord(name, TITLE_MAX - suffix.length)}${suffix}`;
};

/**
 * Reduces a full Google address to the city/region tail people actually search by.
 *
 * A `formatted_address` is typically ~100 characters ("1004, 26th Main Rd, 4th T Block
 * East, Jayanagara 9th Block, Jayanagar, Bengaluru, Karnataka 560041, India"), which on its
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
 * one of the 600+ place pages: near-duplicate boilerplate that gives a search engine no
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
 * Opening-hours parsing lives in `lib/openingHours.ts`.
 *
 * It moved out when the UI began asking the same question ("open right now?") that the
 * JSON-LD builder below asks, so that a client component could import the parser without
 * pulling every builder in this file into the browser bundle. Imported at the top of this
 * file; not re-exported, since the new module is the one place to import it from.
 */

/* -------------------------------------------------------------------------- */
/* JSON-LD                                                                    */
/* -------------------------------------------------------------------------- */

export type JsonLd = Record<string, unknown>;

/**
 * `Restaurant` markup for a place page, the highest-value structured data on the site,
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
  // is for: it helps search engines reconcile this page with the known business.
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
