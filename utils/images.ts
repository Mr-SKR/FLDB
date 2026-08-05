import { PlaceInterface } from "../types/types";

/**
 * YouTube thumbnails are already well-compressed JPEGs on Google's own CDN, which serves
 * them for free. Routing them through Vercel's optimizer would spend a hard-capped resource
 * (5,000 image transformations/month on Hobby, shared with the place photos) for very little
 * gain, so they are rendered as-is. Place photos from blob storage stay optimised.
 *
 * Keyed on the host rather than the `source` field, since the single-thumbnail fallback
 * path carries no source.
 */
export const isYouTubeThumbnail = (url: string): boolean => url.includes("i.ytimg.com");

/** The named entities Google actually emits in `html_attributions`. */
const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};

/**
 * Turns the escaped text inside an attribution back into the characters it stands for.
 *
 * Stripping the tags is not enough on its own: the anchor's *text* is HTML-escaped too, so
 * a business with an apostrophe in its name was credited as "AGNI&#39;S - BURGER • SEAFOOD"
 * in the photo caption. Decoded here rather than by assigning to `innerHTML`, which would
 * hand third-party markup to the parser purely to unescape a credit line.
 */
const decodeEntities = (value: string): string =>
  value.replace(/&(#x?[0-9a-f]+|[a-z]+);/gi, (match, entity: string) => {
    if (entity[0] === "#") {
      const codePoint = entity[1]?.toLowerCase() === "x"
        ? parseInt(entity.slice(2), 16)
        : parseInt(entity.slice(1), 10);
      // An out-of-range or unparseable reference is left exactly as it was found; a stray
      // "&#99999999;" in a caption is a smaller problem than throwing here.
      return Number.isFinite(codePoint) && codePoint > 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }
    return NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });

/**
 * Google returns attributions as HTML anchors. Render the text only. Injecting third-party
 * HTML into the page is not worth the XSS surface for a credit line.
 */
export const attributionText = (attributions?: string[]): string =>
  (attributions ?? [])
    .map((a) => decodeEntities(a.replace(/<[^>]*>/g, "")).trim())
    .filter(Boolean)
    .join(", ");

export interface PlaceImage {
  url: string;
  source?: "place" | "youtube";
}

/**
 * Every usable image for a place, in the order the sync stored them (place photo first).
 *
 * Empty URLs must never reach `next/image`, which throws on `src=""`, and duplicates would
 * render as two gallery slots showing the same picture. Both are filtered here rather than
 * at each call site, since the feed card and the place page were doing this separately and
 * only one of them handled the single-thumbnail fallback.
 */
export const collectPlaceImages = (place: {
  allThumbnails?: PlaceInterface["allThumbnails"];
  thumbnail?: PlaceInterface["thumbnail"];
}): PlaceImage[] => {
  /*
    `source` is omitted rather than set to `undefined` when a thumbnail does not carry one.

    This list is returned from `getStaticProps`, and Next refuses to serialize an explicit
    `undefined` ("cannot be serialized as JSON"), which fails the build for the whole route
    rather than the one page: the first place whose photo predates the `source` field took
    down the export at 154 pages of 616.
  */
  const fromAll = (place.allThumbnails ?? [])
    .map((thumb) => ({
      url: thumb.large || thumb.small || "",
      ...(thumb.source ? { source: thumb.source } : {}),
    }))
    .filter((thumb) => thumb.url !== "");

  const images: PlaceImage[] = fromAll.length > 0
    ? fromAll
    : [{ url: place.thumbnail?.large || place.thumbnail?.small || "" }]
        .filter((thumb) => thumb.url !== "");

  const seen = new Set<string>();
  return images.filter((image) => {
    if (seen.has(image.url)) return false;
    seen.add(image.url);
    return true;
  });
};
