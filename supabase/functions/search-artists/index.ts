import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
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
    const { searchTerm } = await req.json();

    if (!searchTerm || searchTerm.trim().length < 2) {
      return new Response(JSON.stringify({ artists: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Searching Spotify for artist:', searchTerm);

    let token = await getSpotifyToken();
    let response = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=artist&limit=10`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );

    // Handle 429 rate limit — wait and retry once
    if (response.status === 429) {
      const retryAfterRaw = response.headers.get('Retry-After');
      const retryAfter = parseInt(retryAfterRaw || '5', 10);
      const waitMs = Math.min(retryAfter * 1000, 10000);
      console.log('Spotify 429, Retry-After:', retryAfterRaw, 'waiting', waitMs, 'ms');
      await new Promise(resolve => setTimeout(resolve, waitMs));
      response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=artist&limit=10`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
    }

    // Handle 401 — refresh token
    if (response.status === 401) {
      spotifyToken = null;
      tokenExpiry = 0;
      token = await getSpotifyToken();
      response = await fetch(
        `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=artist&limit=10`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );
    }

    if (!response.ok) {
      console.error('Spotify API error:', response.status);
      // Fallback to local artists DB
      const artists = await searchLocalArtists(searchTerm);
      return new Response(JSON.stringify({ artists }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    const artists = (data.artists?.items || []).map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images?.[0]?.url || null,
      imageSmall: artist.images?.[artist.images.length - 1]?.url || null,
      genres: artist.genres?.slice(0, 3) || [],
      popularity: artist.popularity || 0,
    }));

    return new Response(JSON.stringify({ artists }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in search-artists function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', artists: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function searchLocalArtists(searchTerm: string) {
  try {
    console.log('Falling back to local artists DB for:', searchTerm);
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data } = await supabaseAdmin
      .from('artists')
      .select('id, name, image_url, genres, spotify_artist_id')
      .ilike('name', `%${searchTerm.trim()}%`)
      .limit(10);
    return (data || []).map((a: any) => ({
      id: a.spotify_artist_id || a.id,
      name: a.name,
      imageUrl: a.image_url || null,
      imageSmall: a.image_url || null,
      genres: a.genres?.slice(0, 3) || [],
      popularity: 0,
    }));
  } catch (e) {
    console.error('Local artist fallback failed:', e);
    return [];
  }
}
