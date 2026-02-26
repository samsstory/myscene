import { supabase } from "@/integrations/supabase/client";

// Module-level in-memory cache shared across all callers (useEdmtrainEvents, useDiscoverEvents)
// Persists for the lifetime of the SPA session — prevents redundant DB + edge function calls
const imageCache = new Map<string, string>();       // lowercaseName → imageUrl
const pendingLookups = new Map<string, Promise<Map<string, string>>>(); // dedup in-flight requests

/**
 * Given a list of artist names, resolves image URLs by:
 * 1. Checking the module-level in-memory cache (free, no network)
 * 2. Batch-querying the canonical `artists` table (cheap, no API call)
 * 3. Calling `batch-artist-images` edge function for remaining misses (checks show_artists → Spotify)
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

  // 0. Serve from module-level cache first (free)
  const uncached: string[] = [];
  for (const name of unique) {
    const lower = name.toLowerCase();
    const cached = imageCache.get(lower);
    if (cached) {
      result.set(lower, cached);
    } else {
      uncached.push(name);
    }
  }

  // All resolved from cache — skip network entirely
  if (uncached.length === 0) return result;

  // Dedup concurrent in-flight requests: if another caller is already
  // resolving the same set, piggyback on that promise
  const cacheKey = uncached.map((n) => n.toLowerCase()).sort().join("|");
  const pending = pendingLookups.get(cacheKey);
  if (pending) {
    const resolved = await pending;
    for (const [k, v] of resolved) result.set(k, v);
    return result;
  }

  const lookupPromise = _resolveImages(uncached);
  pendingLookups.set(cacheKey, lookupPromise);

  try {
    const resolved = await lookupPromise;
    for (const [k, v] of resolved) {
      result.set(k, v);
      imageCache.set(k, v); // persist to module cache
    }
  } finally {
    pendingLookups.delete(cacheKey);
  }

  return result;
}

/** Internal: actually hits DB + edge function. Callers should go through enrichArtistImages. */
async function _resolveImages(names: string[]): Promise<Map<string, string>> {
  const result = new Map<string, string>();

  // 1. Canonical artists table lookup
  try {
    const ilikeFilter = names
      .map((n) => `name.ilike.${n.replace(/[%_]/g, "")}`)
      .join(",");
    const { data: artistRows } = await supabase
      .from("artists")
      .select("name, image_url")
      .or(ilikeFilter)
      .not("image_url", "is", null)
      .limit(names.length * 2);

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

  // 2. For remaining misses, send a single call to batch-artist-images (up to 50 names)
  const stillMissing = names.filter((n) => !result.has(n.toLowerCase())).slice(0, 50);
  if (stillMissing.length > 0) {
    try {
      const { data, error } = await supabase.functions.invoke(
        "batch-artist-images",
        { body: { names: stillMissing } }
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
    }
  }

  return result;
}
