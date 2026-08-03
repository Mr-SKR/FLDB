import { put } from "@vercel/blob";
import { env } from "./env";

/**
 * Blob storage seam.
 *
 * Everything provider-specific lives in this file. Places store an opaque `photoKey`
 * (a stable path) alongside the resolved `photoUrl`, so switching provider later means
 * re-uploading under the same keys and changing only this module.
 *
 * Keys are deliberately stable and derived from place_id rather than content-hashed:
 * a changing URL would re-trigger a Vercel image transformation on every sync and burn
 * the 5,000/month Hobby budget. Cache-busting is done with a `?v=` param instead.
 */

const PLACE_PHOTO_PREFIX = "places";

/** One year; the bytes at a given key+version never change. */
const IMMUTABLE_MAX_AGE = 31_536_000;

export const placePhotoKey = (placeId: string): string =>
  `${PLACE_PHOTO_PREFIX}/${placeId}.webp`;

export interface StoredPhoto {
  key: string;
  url: string;
}

/** Uploads (or overwrites) a place photo and returns its stable key and public URL. */
export const uploadPlacePhoto = async (
  placeId: string,
  body: Buffer
): Promise<StoredPhoto> => {
  const key = placePhotoKey(placeId);

  const result = await put(key, body, {
    access: "public",
    token: env.BLOB_READ_WRITE_TOKEN,
    contentType: "image/webp",
    // Stable path: no random suffix, overwrite in place on re-sync.
    addRandomSuffix: false,
    allowOverwrite: true,
    cacheControlMaxAge: IMMUTABLE_MAX_AGE,
  });

  return { key, url: result.url };
};

/**
 * Builds the URL to render for a stored photo.
 *
 * `version` (the photo's updatedAt timestamp) busts caches only when the underlying
 * image actually changed, leaving the key (and therefore the cached transformation)
 * stable the rest of the time.
 */
export const photoSrc = (
  photoUrl?: string | null,
  version?: string | number | Date | null
): string | undefined => {
  if (!photoUrl) return undefined;
  if (!version) return photoUrl;
  // `photoUpdatedAt` is a Date on the model; collapse it to an epoch millisecond count
  // so the token stays short and stable rather than a locale-formatted date string.
  const token = version instanceof Date ? version.getTime() : version;
  return `${photoUrl}?v=${encodeURIComponent(String(token))}`;
};
