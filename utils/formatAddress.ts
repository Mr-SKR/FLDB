/**
 * Address tidying for display.
 *
 * Google returns a Plus Code as the leading component of `formatted_address` whenever a
 * place has no conventional street number, which is 69 of the 611 stored places. The
 * result reads as noise to a human ("WJF6+CRJ, Chocolate Factory Rd, Tavarekere...") and
 * is the first thing shown on a feed card, so it pushes the part someone can actually
 * navigate by out of the visible two lines.
 */

/**
 * Open Location Code alphabet: digits 2-9 plus CFGHJMPQRVWX. Vowels are excluded by design
 * so codes cannot spell words, which is what makes this safe to match against real street
 * names: no ordinary address component looks like `XH2H+V2R`.
 *
 * Matches the short (4 character) and full (8 character) prefix forms, then the `+` and
 * its 2-3 character suffix. The trailing separator may be a comma or plain whitespace,
 * since both occur in the stored data.
 */
const LEADING_PLUS_CODE = /^[23456789CFGHJMPQRVWX]{4,8}\+[23456789CFGHJMPQRVWX]{2,3}\s*,?\s*/i;

/**
 * Removes a leading Plus Code, keeping the human-readable remainder.
 *
 * Deliberately conservative: if stripping the code would leave nothing, the original is
 * returned intact. A Plus Code is a poor address but it is better than a blank line, and
 * it is still enough for Google Maps to resolve if someone types it in.
 */
export const stripPlusCode = (address?: string | null): string => {
  const value = (address ?? "").trim();
  if (!value) return "";

  const stripped = value.replace(LEADING_PLUS_CODE, "").trim();
  return stripped.length > 0 ? stripped : value;
};
