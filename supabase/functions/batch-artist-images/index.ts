import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ─── Spotify Circuit Breaker ─────────────────────────────────────────
let spotifyBlockedUntil = 0;

function isSpotifyBlocked(): boolean {
  return Date.now() < spotifyBlockedUntil;
}

function tripSpotifyBreaker(retryAfterHeader: string | null) {
  const retryAfterSec = parseInt(retryAfterHeader || '30', 10);
  const cappedSec = Math.min(Math.max(retryAfterSec, 5), 120);
  spotifyBlockedUntil = Date.now() + cappedSec * 1000;
  console.log(`[batch-artist-images] Spotify circuit breaker TRIPPED — blocked for ${cappedSec}s`);
}

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
    const { names } = await req.json();
    if (!Array.isArray(names) || names.length === 0) {
      return new Response(JSON.stringify({ artists: {} }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Cap at 30 to stay within reasonable Spotify rate limits
    const artistNames: string[] = names.slice(0, 20);

    // 1. Check show_artists table first (cheapest)
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    const result: Record<string, { image_url: string; spotify_id: string | null }> = {};

    // Case-insensitive lookup in show_artists
    const ilikeFilter = artistNames
      .map((n) => `artist_name.ilike.${n.replace(/[%_]/g, "")}`)
      .join(",");
    const { data: saRows } = await supabase
      .from("show_artists")
      .select("artist_name, artist_image_url, spotify_artist_id")
      .or(ilikeFilter)
      .not("artist_image_url", "is", null)
      .limit(artistNames.length * 3);

    for (const row of saRows || []) {
      const key = row.artist_name.toLowerCase();
      if (result[key]) continue;
      const url = row.artist_image_url;
      if (url && !url.includes("show-photos") && !url.includes("lovable.app/images/") && !url.includes("lovableproject.com/images/")) {
        result[key] = { image_url: url, spotify_id: row.spotify_artist_id || null };
      }
    }

    // 2. For remaining artists, search Spotify (skip if circuit breaker is open)
    const missing = artistNames.filter((n) => !result[n.toLowerCase()]);
    if (missing.length > 0 && !isSpotifyBlocked()) {
      const token = await getSpotifyToken();
      for (const name of missing) {
        if (isSpotifyBlocked()) break; // Re-check in case we just got rate-limited
        try {
          const resp = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          if (resp.status === 429) {
            tripSpotifyBreaker(resp.headers.get('Retry-After'));
            await resp.text();
            break; // Stop immediately
          }
          if (!resp.ok) { await resp.text(); continue; }
          const data = await resp.json();
          const artist = data.artists?.items?.[0];
          if (artist?.images?.[0]?.url) {
            const imgUrl = artist.images[0].url;
            const spotifyId = artist.id;
            result[name.toLowerCase()] = {
              image_url: imgUrl,
              spotify_id: spotifyId,
            };
            // Fire-and-forget: update show_artists rows
            supabase
              .from("show_artists")
              .update({ artist_image_url: imgUrl, spotify_artist_id: spotifyId })
              .ilike("artist_name", name)
              .is("artist_image_url", null)
              .then(() => {});
            // Fire-and-forget: persist into canonical artists table
            supabase
              .from("artists")
              .insert({
                name: name.trim(),
                image_url: imgUrl,
                spotify_artist_id: spotifyId,
                genres: artist.genres || [],
              })
              .then(({ error: insertErr }) => {
                if (insertErr) {
                  supabase
                    .from("artists")
                    .update({ image_url: imgUrl, spotify_artist_id: spotifyId, genres: artist.genres || [] })
                    .ilike("name", name.trim())
                    .is("image_url", null)
                    .then(() => {});
                }
              });
          }
          // Delay between Spotify calls to avoid rate limiting
          await new Promise((r) => setTimeout(r, 200));
        } catch {
          // Skip this artist
        }
      }
    } else if (missing.length > 0) {
      console.log(`[batch-artist-images] Spotify circuit breaker OPEN — skipping ${missing.length} lookups`);
    }

    return new Response(JSON.stringify({ artists: result }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('batch-artist-images error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', artists: {} }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
