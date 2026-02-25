/**
 * Utilities for detecting, parsing, and displaying B2B / B3B / vs performances.
 *
 * A B2B set is stored as one `shows` row with `show_type = 'b2b'`
 * and multiple `show_artists` rows each marked `is_b2b = true`.
 */

/** Regex that matches common B2B delimiters (case-insensitive) */
const B2B_DELIMITERS = /\s+(?:b2b|b3b|b4b|back\s+to\s+back|vs\.?)\s+/i;

/**
 * Returns true if a raw string contains a B2B-style delimiter.
 */
export function containsB2bDelimiter(input: string): boolean {
  return B2B_DELIMITERS.test(input);
}

/**
 * Split a raw B2B string into individual artist names.
 * e.g. "Pete Tong b2b Ahmed Spins" → ["Pete Tong", "Ahmed Spins"]
 * e.g. "A b2b B b2b C" → ["A", "B", "C"]
 */
export function splitB2bNames(input: string): string[] {
  return input
    .split(B2B_DELIMITERS)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Build the canonical display name for a B2B set from individual artist names.
 * e.g. ["Pete Tong", "Ahmed Spins"] → "Pete Tong b2b Ahmed Spins"
 */
export function buildB2bDisplayName(names: string[]): string {
  return names.join(" b2b ");
}

/**
 * Given a Show's artists array, return the display name.
 * For B2B shows (show_type === 'b2b'), join headliners with " b2b ".
 * For regular shows, return the headliner name.
 */
export function getShowDisplayName(
  artists: { name: string; isHeadliner: boolean }[],
  showType?: string
): string {
  if (showType === "b2b") {
    const b2bArtists = artists.filter((a) => a.isHeadliner);
    if (b2bArtists.length > 1) {
      return buildB2bDisplayName(b2bArtists.map((a) => a.name));
    }
  }
  const headliner = artists.find((a) => a.isHeadliner) || artists[0];
  return headliner?.name || "Unknown Artist";
}

/**
 * Calculate the font size class for B2B names to ensure they fit.
 * Returns a Tailwind text-size class.
 */
export function getB2bTextSize(artistCount: number): string {
  if (artistCount >= 4) return "text-xs";
  if (artistCount >= 3) return "text-sm";
  return "text-base";
}
