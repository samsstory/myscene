import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

let spotifyToken: string | null = null;
let tokenExpiry = 0;

async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && Date.now() < tokenExpiry) return spotifyToken;
  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Spotify credentials not configured');

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  if (!resp.ok) throw new Error(`Spotify auth failed: ${resp.status}`);
  const data = await resp.json();
  spotifyToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return spotifyToken!;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // === STALENESS CHECK: validate existing image URLs ===
    const { data: existingArtists, error: staleError } = await supabase
      .from('show_artists')
      .select('id, artist_name, artist_image_url, spotify_artist_id')
      .not('artist_image_url', 'is', null)
      .limit(200);

    let staleCount = 0;
    if (!staleError && existingArtists && existingArtists.length > 0) {
      // Sample up to 50 for HEAD checks to stay within time limits
      const sample = existingArtists
        .sort(() => Math.random() - 0.5)
        .slice(0, 50);

      console.log(`Staleness check: validating ${sample.length} existing image URLs`);

      for (const artist of sample) {
        try {
          const headResp = await fetch(artist.artist_image_url!, { method: 'HEAD', redirect: 'follow' });
          if (!headResp.ok) {
            console.log(`Stale URL for "${artist.artist_name}": ${headResp.status}`);
            await supabase
              .from('show_artists')
              .update({ artist_image_url: null })
              .eq('id', artist.id);
            staleCount++;
          }
          // Tiny delay to avoid hammering CDN
          await new Promise(r => setTimeout(r, 100));
        } catch {
          console.log(`Unreachable URL for "${artist.artist_name}", marking stale`);
          await supabase
            .from('show_artists')
            .update({ artist_image_url: null })
            .eq('id', artist.id);
          staleCount++;
        }
      }
      console.log(`Staleness check complete: ${staleCount} stale URLs cleared`);
    }

    // === BACKFILL: Get all show_artists missing image or spotify ID ===
    const { data: artists, error } = await supabase
      .from('show_artists')
      .select('id, artist_name, spotify_artist_id')
      .or('artist_image_url.is.null,spotify_artist_id.is.null')
      .limit(500);

    if (error) throw error;
    if (!artists || artists.length === 0) {
      return new Response(JSON.stringify({ message: 'No artists to backfill', staleCleared: staleCount, updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Backfilling ${artists.length} artists`);

    // Deduplicate by name to avoid redundant Spotify calls
    const uniqueNames = [...new Set(artists.map(a => a.artist_name))];
    const spotifyCache: Record<string, { id: string; imageUrl: string | null }> = {};

    const token = await getSpotifyToken();
    console.log(`Got Spotify token, processing ${uniqueNames.length} unique names`);

    // Check if any artists already have spotify IDs — use direct lookup (separate rate limit)
    const artistsWithIds = artists.filter(a => a.spotify_artist_id);
    const uniqueIdsMap = new Map<string, string>();
    for (const a of artistsWithIds) {
      if (a.spotify_artist_id && !uniqueIdsMap.has(a.artist_name)) {
        uniqueIdsMap.set(a.artist_name, a.spotify_artist_id);
      }
    }

    // First pass: direct artist lookup by ID (different rate limit bucket)
    for (const [name, spotifyId] of uniqueIdsMap) {
      try {
        const resp = await fetch(
          `https://api.spotify.com/v1/artists/${spotifyId}`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (!resp.ok) {
          console.error(`Spotify artist lookup failed for "${name}" (${spotifyId}): ${resp.status}`);
          await resp.text();
          if (resp.status === 429) {
            await new Promise(r => setTimeout(r, 2000));
          }
          continue;
        }
        const artist = await resp.json();
        if (artist) {
          spotifyCache[name] = { id: artist.id, imageUrl: artist.images?.[0]?.url || null };
          console.log(`Direct lookup "${name}": ${artist.images?.[0]?.url}`);
        }
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`Error looking up "${name}":`, err);
      }
    }

    // Second pass: search for artists without a known spotify ID
    for (const name of uniqueNames) {
      if (spotifyCache[name]) continue; // Already resolved via direct lookup
      try {
        const resp = await fetch(
          `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
          { headers: { 'Authorization': `Bearer ${token}` } }
        );
        if (!resp.ok) {
          console.error(`Spotify search failed for "${name}": ${resp.status}`);
          await resp.text();
          if (resp.status === 429) {
            await new Promise(r => setTimeout(r, 2000));
          }
          continue;
        }
        const data = await resp.json();
        const artist = data.artists?.items?.[0];
        if (artist) {
          spotifyCache[name] = { id: artist.id, imageUrl: artist.images?.[0]?.url || null };
          console.log(`Found "${name}": ${artist.name}`);
        } else {
          console.log(`No match for "${name}"`);
        }
        await new Promise(r => setTimeout(r, 200));
      } catch (err) {
        console.error(`Error searching "${name}":`, err);
      }
    }

    // Update all matching records
    let updated = 0;
    for (const artist of artists) {
      const spotify = spotifyCache[artist.artist_name];
      if (!spotify) continue;

      const { error: updateError } = await supabase
        .from('show_artists')
        .update({
          spotify_artist_id: spotify.id,
          artist_image_url: spotify.imageUrl,
        })
        .eq('id', artist.id);

      if (!updateError) updated++;
    }

    console.log(`Backfill complete: ${updated}/${artists.length} updated, ${staleCount} stale cleared`);

    return new Response(JSON.stringify({ updated, total: artists.length, staleCleared: staleCount }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Backfill error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
