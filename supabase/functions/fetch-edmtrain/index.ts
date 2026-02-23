import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EDMTRAIN_BASE = "https://edmtrain.com/api/events";

// Spotify Client Credentials token cache (per invocation)
let spotifyToken: string | null = null;
let tokenExpiry = 0;

async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && Date.now() < tokenExpiry) return spotifyToken;
  const clientId = Deno.env.get("SPOTIFY_CLIENT_ID");
  const clientSecret = Deno.env.get("SPOTIFY_CLIENT_SECRET");
  if (!clientId || !clientSecret) throw new Error("Spotify credentials not configured");

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!resp.ok) throw new Error(`Spotify auth failed: ${resp.status}`);
  const data = await resp.json();
  spotifyToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return spotifyToken!;
}

async function resolveArtistImage(artistName: string, token: string): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const items = data.artists?.items || [];
    // Try exact match first, then fall back to first result with images
    const exactMatch = items.find((i: any) => i.name.toLowerCase() === artistName.toLowerCase() && i.images?.length > 0);
    if (exactMatch) return exactMatch.images[0].url;
    const withImage = items.find((i: any) => i.images?.length > 0);
    return withImage?.images?.[0]?.url || null;
  } catch {
    return null;
  }
}

// Try multiple artist names from the event to find an image
async function resolveEventImage(
  artistList: { name: string }[],
  eventName: string | null,
  isFestival: boolean,
  token: string,
  cache: Record<string, string | null>
): Promise<string | null> {
  // Try each artist in order (headliner first)
  for (const artist of artistList.slice(0, 5)) {
    if (cache[artist.name] !== undefined) {
      if (cache[artist.name]) return cache[artist.name];
      continue; // Already tried and failed
    }
    const url = await resolveArtistImage(artist.name, token);
    cache[artist.name] = url;
    if (url) return url;
  }
  // For festivals, try the event name itself as artist search
  if (isFestival && eventName) {
    const cleanName = eventName.replace(/\d{4}/g, '').replace(/\s+(festival|fest|music|presents)\s*/gi, ' ').trim();
    if (cleanName && cache[cleanName] === undefined) {
      const url = await resolveArtistImage(cleanName, token);
      cache[cleanName] = url;
      if (url) return url;
    }
  }
  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const EDMTRAIN_API_KEY = Deno.env.get("EDMTRAIN_API_KEY");
    if (!EDMTRAIN_API_KEY) {
      throw new Error("EDMTRAIN_API_KEY is not configured");
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Auth check — only authenticated users can trigger a fetch
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: claimsData, error: claimsError } = await anonClient.auth.getClaims(
      authHeader.replace("Bearer ", "")
    );
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { latitude, longitude, state } = await req.json();
    if (!latitude || !longitude || !state) {
      return new Response(
        JSON.stringify({ error: "latitude, longitude, and state are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Round coords to create a location key for cache grouping
    const locationKey = `lat:${Number(latitude).toFixed(1)},lng:${Number(longitude).toFixed(1)}`;

    // Check if we have fresh data for this location (< 12 hours old)
    const { data: existing } = await supabase
      .from("edmtrain_events")
      .select("fetched_at")
      .eq("location_key", locationKey)
      .order("fetched_at", { ascending: false })
      .limit(1);

    if (existing && existing.length > 0) {
      const fetchedAt = new Date(existing[0].fetched_at);
      const hoursAgo = (Date.now() - fetchedAt.getTime()) / (1000 * 60 * 60);
      if (hoursAgo < 12) {
        console.log(`Cache hit for ${locationKey}, ${hoursAgo.toFixed(1)}h old`);

        // Backfill missing images on cache hit
        try {
          const { data: missingImages } = await supabase
            .from("edmtrain_events")
            .select("edmtrain_id, artists, event_name, festival_ind")
            .eq("location_key", locationKey)
            .is("artist_image_url", null)
            .limit(20);

          if (missingImages && missingImages.length > 0) {
            console.log(`Backfilling ${missingImages.length} events missing images`);
            const token = await getSpotifyToken();
            const imgCache: Record<string, string | null> = {};

            for (const row of missingImages) {
              const artistList = (typeof row.artists === 'string' ? JSON.parse(row.artists) : row.artists) || [];
              const url = await resolveEventImage(artistList, row.event_name, row.festival_ind, token, imgCache);
              if (url) {
                await supabase
                  .from("edmtrain_events")
                  .update({ artist_image_url: url })
                  .eq("edmtrain_id", row.edmtrain_id);
              }
            }
          }
        } catch (err) {
          console.warn("Image backfill failed:", err);
        }

        return new Response(
          JSON.stringify({ success: true, cached: true, locationKey }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch from Edmtrain Nearby Events API
    const params = new URLSearchParams({
      latitude: String(latitude),
      longitude: String(longitude),
      state: state,
      client: EDMTRAIN_API_KEY,
    });

    console.log(`Fetching Edmtrain events for ${locationKey}`);
    const edmUrl = `${EDMTRAIN_BASE}?${params}`;
    console.log(`Edmtrain URL: ${edmUrl}`);
    const edmResponse = await fetch(edmUrl);

    const responseText = await edmResponse.text();
    console.log(`Edmtrain response status: ${edmResponse.status}, content-type: ${edmResponse.headers.get('content-type')}, body preview: ${responseText.substring(0, 200)}`);

    if (!edmResponse.ok || responseText.startsWith('<!') || responseText.startsWith('<html')) {
      console.error("Edmtrain returned non-JSON response");
      return new Response(
        JSON.stringify({ error: "Edmtrain API returned an error page. The API key may be invalid or expired.", status: edmResponse.status }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let edmData;
    try {
      edmData = JSON.parse(responseText);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse Edmtrain response" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!edmData.success) {
      console.error("Edmtrain API error:", edmData.message);
      return new Response(
        JSON.stringify({ error: edmData.message || "Edmtrain API error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const events = edmData.data || [];
    console.log(`Received ${events.length} events from Edmtrain`);

    // Resolve images via Spotify (try multiple artists per event)
    let spotifyImageCache: Record<string, string | null> = {};
    let spotifyToken: string | null = null;
    try {
      spotifyToken = await getSpotifyToken();
    } catch (err) {
      console.warn("Spotify auth failed, continuing without images:", err);
    }

    // Step 1: Delete stale data for this location + any past events globally
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("edmtrain_events").delete().eq("location_key", locationKey);
    await supabase.from("edmtrain_events").delete().lt("event_date", today);

    // Step 2: Resolve images per event (trying multiple artists)
    const eventImages: Record<number, string | null> = {};
    if (spotifyToken && events.length > 0) {
      console.log(`Resolving images for ${events.length} events via Spotify`);
      // Process in batches of 5 events
      for (let i = 0; i < events.length; i += 5) {
        const batch = events.slice(i, i + 5);
        await Promise.all(
          batch.map(async (e: any) => {
            const artistList = (e.artistList || []).map((a: any) => ({ name: a.name }));
            const url = await resolveEventImage(
              artistList,
              e.name || null,
              e.festivalInd || false,
              spotifyToken!,
              spotifyImageCache
            );
            eventImages[e.id] = url;
          })
        );
      }
    }

    // Step 3: Upsert fresh events
    if (events.length > 0) {
      const rows = events.map((e: any) => {
        return {
          edmtrain_id: e.id,
          event_name: e.name || null,
          event_link: e.link,
          event_date: e.date,
          festival_ind: e.festivalInd || false,
          ages: e.ages || null,
          venue_name: e.venue?.name || null,
          venue_location: e.venue?.location || null,
          venue_address: e.venue?.address || null,
          venue_latitude: e.venue?.latitude || null,
          venue_longitude: e.venue?.longitude || null,
          artists: JSON.stringify(
            (e.artistList || []).map((a: any) => ({
              id: a.id,
              name: a.name,
              link: a.link,
              b2b: a.b2bInd || false,
            }))
          ),
          artist_image_url: eventImages[e.id] ?? null,
          fetched_at: new Date().toISOString(),
          location_key: locationKey,
        };
      });

      const { error: upsertError } = await supabase
        .from("edmtrain_events")
        .upsert(rows, { onConflict: "edmtrain_id" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        throw new Error(`Failed to cache events: ${upsertError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, cached: false, count: events.length, locationKey }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("fetch-edmtrain error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
