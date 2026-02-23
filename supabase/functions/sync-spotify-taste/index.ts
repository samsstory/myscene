import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub;

    // Get the user's Spotify connection
    const { data: conn, error: connErr } = await supabase
      .from("spotify_connections")
      .select("access_token, refresh_token, expires_at")
      .eq("user_id", userId)
      .single();

    if (connErr || !conn) {
      return new Response(JSON.stringify({ error: "No Spotify connection found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let accessToken = conn.access_token;

    // Refresh if expired
    if (new Date(conn.expires_at) <= new Date()) {
      const clientId = Deno.env.get("SPOTIFY_CLIENT_ID")!;
      const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET")!;

      const refreshRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
        },
        body: new URLSearchParams({
          grant_type: "refresh_token",
          refresh_token: conn.refresh_token,
        }),
      });

      if (!refreshRes.ok) {
        return new Response(JSON.stringify({ error: "Failed to refresh Spotify token" }), {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const refreshData = await refreshRes.json();
      accessToken = refreshData.access_token;

      await supabase
        .from("spotify_connections")
        .update({
          access_token: refreshData.access_token,
          refresh_token: refreshData.refresh_token || conn.refresh_token,
          expires_at: new Date(Date.now() + refreshData.expires_in * 1000).toISOString(),
        })
        .eq("user_id", userId);
    }

    // Fetch top artists for both time ranges
    const timeRanges = ["medium_term", "long_term"] as const;
    const allArtists: any[] = [];

    for (const timeRange of timeRanges) {
      const res = await fetch(
        `https://api.spotify.com/v1/me/top/artists?time_range=${timeRange}&limit=50`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );

      if (!res.ok) {
        console.error(`Spotify API error for ${timeRange}:`, await res.text());
        continue;
      }

      const data = await res.json();
      const items = data.items || [];

      for (let i = 0; i < items.length; i++) {
        const artist = items[i];
        allArtists.push({
          user_id: userId,
          artist_name: artist.name.toLowerCase(),
          spotify_artist_id: artist.id,
          genres: artist.genres || [],
          popularity: artist.popularity || 0,
          time_range: timeRange,
          rank_position: i + 1,
          synced_at: new Date().toISOString(),
        });
      }
    }

    if (allArtists.length > 0) {
      // Delete old entries and insert fresh
      await supabase
        .from("spotify_top_artists")
        .delete()
        .eq("user_id", userId);

      await supabase.from("spotify_top_artists").insert(allArtists);
    }

    // Update last_synced_at
    await supabase
      .from("spotify_connections")
      .update({ last_synced_at: new Date().toISOString() })
      .eq("user_id", userId);

    return new Response(
      JSON.stringify({ synced: allArtists.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sync-spotify-taste error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
