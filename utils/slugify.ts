/**
 * Converts a display name into a URL-safe slug.
 *
 * Accented characters are folded to their ASCII base (é -> e) rather than dropped, so
 * "Café Coffee Day" becomes "cafe-coffee-day" instead of "caf-coffee-day".
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // strip combining diacritical marks
    .toLowerCase()
    .trim()
    .replace(/\s+/g, "-") // spaces -> -
    .replace(/[^\w-]+/g, "") // drop remaining non-word chars
    .replace(/-{2,}/g, "-") // collapse runs of -
    .replace(/^-+|-+$/g, ""); // trim leading/trailing -
}

/**
 * Short, stable suffix derived from a Google place_id.
 *
 * Used to disambiguate two genuinely different restaurants that share a name (common
 * for chains). Deterministic, so re-syncing the same place always produces the same
 * slug rather than minting a new URL each time.
 */
export function slugSuffix(placeId: string): string {
  let hash = 0;
  for (let i = 0; i < placeId.length; i += 1) {
    hash = (Math.imul(31, hash) + placeId.charCodeAt(i)) | 0;
  }
  return Math.abs(hash).toString(36).slice(0, 6);
}
