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

    // Get all show_artists missing image or spotify ID
    const { data: artists, error } = await supabase
      .from('show_artists')
      .select('id, artist_name')
      .or('artist_image_url.is.null,spotify_artist_id.is.null')
      .limit(500);

    if (error) throw error;
    if (!artists || artists.length === 0) {
      return new Response(JSON.stringify({ message: 'No artists to backfill', updated: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Backfilling ${artists.length} artists`);

    // Deduplicate by name to avoid redundant Spotify calls
    const uniqueNames = [...new Set(artists.map(a => a.artist_name))];
    const spotifyCache: Record<string, { id: string; imageUrl: string | null }> = {};

    const token = await getSpotifyToken();

    // Process in batches of 5 to avoid rate limits
    for (let i = 0; i < uniqueNames.length; i += 5) {
      const batch = uniqueNames.slice(i, i + 5);
      await Promise.all(batch.map(async (name) => {
        try {
          const resp = await fetch(
            `https://api.spotify.com/v1/search?q=${encodeURIComponent(name)}&type=artist&limit=1`,
            { headers: { 'Authorization': `Bearer ${token}` } }
          );
          if (!resp.ok) return;
          const data = await resp.json();
          const artist = data.artists?.items?.[0];
          if (artist) {
            spotifyCache[name] = {
              id: artist.id,
              imageUrl: artist.images?.[0]?.url || null,
            };
          }
        } catch { /* skip */ }
      }));
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

    console.log(`Backfill complete: ${updated}/${artists.length} updated`);

    return new Response(JSON.stringify({ updated, total: artists.length }), {
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
