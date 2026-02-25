import { supabase } from "@/integrations/supabase/client";

/**
 * Given a list of artist names, resolves image URLs by:
 * 1. Batch-querying the canonical `artists` table (cheap, no API call)
 * 2. Calling `batch-artist-images` edge function for remaining misses (checks show_artists → Spotify)
 *
 * Returns a Map<lowercaseName, imageUrl>.
 */
export async function enrichArtistImages(
  names: string[]
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (names.length === 0) return result;

  // Dedupe & lowercase
  const unique = [...new Set(names.map((n) => n.trim()))];
  const uniqueLower = unique.map((n) => n.toLowerCase());

  // 1. Canonical artists table lookup (batch by ilike filter)
  try {
    const ilikeFilter = unique
      .map((n) => `name.ilike.${n.replace(/[%_]/g, "")}`)
      .join(",");
    const { data: artistRows } = await supabase
      .from("artists")
      .select("name, image_url")
      .or(ilikeFilter)
      .not("image_url", "is", null)
      .limit(unique.length * 2);

    if (artistRows) {
      for (const row of artistRows) {
        const lower = row.name.toLowerCase();
        if (row.image_url && !result.has(lower)) {
          result.set(lower, row.image_url);
        }
      }
    }
  } catch (e) {
    console.warn("enrich: canonical artists lookup failed", e);
  }

  // 2. For remaining misses, call batch-artist-images edge function in batches of 30
  const stillMissing = unique.filter((n) => !result.has(n.toLowerCase()));
  if (stillMissing.length > 0) {
    const BATCH_SIZE = 30;
    const batches = [];
    for (let i = 0; i < stillMissing.length; i += BATCH_SIZE) {
      batches.push(stillMissing.slice(i, i + BATCH_SIZE));
    }
    // Process up to 3 batches (90 artists max) to avoid excessive API calls
    for (const batch of batches.slice(0, 3)) {
      try {
        const { data, error } = await supabase.functions.invoke(
          "batch-artist-images",
          { body: { names: batch } }
        );
        if (!error && data?.artists) {
          for (const [key, val] of Object.entries(data.artists)) {
            const v = val as { image_url: string; spotify_id: string | null };
            if (v.image_url) {
              result.set(key.toLowerCase(), v.image_url);
            }
          }
        }
      } catch (e) {
        console.warn("enrich: batch-artist-images call failed", e);
        break; // Stop on failure
      }
    }
  }

  return result;
}
