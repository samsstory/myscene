import { useState, useEffect, useRef, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface ArtistSearchResult {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
  subtitle?: string;
}

interface UseArtistSearchOptions {
  /** Minimum characters before searching (default: 3) */
  minChars?: number;
  /** Debounce delay in ms (default: 500) */
  debounceMs?: number;
  /** Max results to return (default: 6) */
  maxResults?: number;
}

// Module-level cache shared across all hook instances
const searchCache = new Map<string, { results: ArtistSearchResult[]; ts: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): ArtistSearchResult[] | null {
  const entry = searchCache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.results;
  if (entry) searchCache.delete(key);
  return null;
}

function setCache(key: string, results: ArtistSearchResult[]) {
  // Cap cache size
  if (searchCache.size > 100) {
    const oldest = searchCache.keys().next().value;
    if (oldest) searchCache.delete(oldest);
  }
  searchCache.set(key, { results, ts: Date.now() });
}

/**
 * Shared artist search hook with:
 * - 500ms debounce (configurable)
 * - 3-char minimum (configurable)
 * - Client-side result caching (5 min TTL)
 * - DB-first strategy: queries local artists table first,
 *   only hits Spotify via edge function if < 3 local matches
 */
export function useArtistSearch(
  searchTerm: string,
  options: UseArtistSearchOptions = {}
) {
  const { minChars = 3, debounceMs = 500, maxResults = 6 } = options;

  const [results, setResults] = useState<ArtistSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [spotifyUnavailable, setSpotifyUnavailable] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const trimmed = searchTerm.trim().toLowerCase();

    if (trimmed.length < minChars) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    // Check cache immediately
    const cached = getCached(trimmed);
    if (cached) {
      setResults(cached.slice(0, maxResults));
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    const timer = setTimeout(async () => {
      // Abort previous in-flight request
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        // Step 1: DB-first — query local artists table
        const { data: localData } = await supabase
          .from("artists")
          .select("id, name, image_url, genres, spotify_artist_id")
          .ilike("name", `%${trimmed}%`)
          .limit(maxResults);

        if (controller.signal.aborted) return;

        const localResults: ArtistSearchResult[] = (localData || []).map((a) => ({
          id: a.spotify_artist_id || a.id,
          name: a.name,
          imageUrl: a.image_url || undefined,
          genres: a.genres?.slice(0, 2) || undefined,
        }));

        // If we have enough local results, use them and skip Spotify
        if (localResults.length >= 3) {
          const final = localResults.slice(0, maxResults);
          setResults(final);
          setCache(trimmed, final);
          setIsSearching(false);
          return;
        }

        // Step 2: Not enough local results — call unified-search for Spotify
        const { data, error } = await supabase.functions.invoke("unified-search", {
          body: { searchTerm: searchTerm.trim(), searchType: "artist" },
        });

        if (controller.signal.aborted) return;

        if (error) throw error;

        // Track whether Spotify was unavailable for this search
        if (data?.spotifyUnavailable) {
          setSpotifyUnavailable(true);
        } else {
          setSpotifyUnavailable(false);
        }

        const remoteResults: ArtistSearchResult[] = (data?.results || [])
          .filter((r: any) => r.type === "artist")
          .map((r: any) => ({
            id: r.id,
            name: r.name,
            imageUrl: r.imageUrl || undefined,
            genres: r.subtitle ? r.subtitle.split(", ") : undefined,
            subtitle: r.subtitle,
          }));

        // Merge: local first, then remote (deduped)
        const seen = new Set(localResults.map((r) => r.name.toLowerCase()));
        const merged = [...localResults];
        for (const r of remoteResults) {
          if (!seen.has(r.name.toLowerCase())) {
            seen.add(r.name.toLowerCase());
            merged.push(r);
          }
        }

        const final = merged.slice(0, maxResults);
        setResults(final);
        setCache(trimmed, final);
      } catch (err) {
        if (controller.signal.aborted) return;
        console.error("Artist search error:", err);
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setIsSearching(false);
      }
    }, debounceMs);

    return () => {
      clearTimeout(timer);
      abortRef.current?.abort();
    };
  }, [searchTerm, minChars, debounceMs, maxResults]);

  const clearResults = useCallback(() => {
    setResults([]);
    setIsSearching(false);
  }, []);

  return { results, isSearching, spotifyUnavailable, clearResults };
}
