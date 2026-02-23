import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EDMTRAIN_BASE = "https://edmtrain.com/api/events";

// Spotify Client Credentials token cache (per invocation)
let cachedSpotifyToken: string | null = null;
let tokenExpiry = 0;

async function getSpotifyToken(): Promise<string> {
  if (cachedSpotifyToken && Date.now() < tokenExpiry) return cachedSpotifyToken;
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
  cachedSpotifyToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return cachedSpotifyToken!;
}

async function resolveArtistImageFromSpotify(artistName: string, token: string): Promise<string | null> {
  try {
    const resp = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (resp.status === 429) {
      console.warn(`Spotify rate limited, waiting...`);
      await new Promise(r => setTimeout(r, 2000));
      return null;
    }
    if (!resp.ok) {
      await resp.text(); // consume body
      return null;
    }
    const data = await resp.json();
    const items = data.artists?.items || [];
    const exactMatch = items.find((i: any) => i.name.toLowerCase() === artistName.toLowerCase() && i.images?.length > 0);
    if (exactMatch) return exactMatch.images[0].url;
    const withImage = items.find((i: any) => i.images?.length > 0);
    return withImage?.images?.[0]?.url || null;
  } catch {
    return null;
  }
}

// Build a lookup map from our own show_artists table (known artist images)
async function buildLocalArtistImageCache(supabase: any): Promise<Record<string, string>> {
  const localCache: Record<string, string> = {};
  try {
    const { data } = await supabase
      .from("show_artists")
      .select("artist_name, artist_image_url")
      .not("artist_image_url", "is", null)
      .like("artist_image_url", "https://i.scdn.co/%"); // Only use Spotify URLs (not user uploads)
    
    if (data) {
      for (const row of data) {
        localCache[row.artist_name.toLowerCase()] = row.artist_image_url;
      }
    }
    console.log(`Loaded ${Object.keys(localCache).length} artist images from local DB`);
  } catch (err) {
    console.warn("Failed to load local artist cache:", err);
  }
  return localCache;
}

// Resolve an image for an event: check local DB first, then Spotify
async function resolveEventImage(
  artistList: { name: string }[],
  eventName: string | null,
  isFestival: boolean,
  token: string,
  localCache: Record<string, string>,
  spotifyCache: Record<string, string | null>
): Promise<string | null> {
  // 1. Check local DB cache first (all artists)
  for (const artist of artistList) {
    const localUrl = localCache[artist.name.toLowerCase()];
    if (localUrl) return localUrl;
  }

  // 2. Try Spotify for top 3 artists only (to limit API calls)
  for (const artist of artistList.slice(0, 3)) {
    const key = artist.name.toLowerCase();
    if (spotifyCache[key] !== undefined) {
      if (spotifyCache[key]) return spotifyCache[key];
      continue;
    }
    const url = await resolveArtistImageFromSpotify(artist.name, token);
    spotifyCache[key] = url;
    if (url) return url;
  }

  // 3. For festivals, try event name as artist search
  if (isFestival && eventName) {
    const cleanName = eventName.replace(/\d{4}/g, '').replace(/\s+(festival|fest|music|presents)\s*/gi, ' ').trim();
    const key = cleanName.toLowerCase();
    if (cleanName && spotifyCache[key] === undefined) {
      const url = await resolveArtistImageFromSpotify(cleanName, token);
      spotifyCache[key] = url;
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

    // Load local artist image cache from our DB
    const localArtistCache = await buildLocalArtistImageCache(supabase);

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

        // Backfill missing images on cache hit using local DB + limited Spotify
        try {
          const { data: missingImages } = await supabase
            .from("edmtrain_events")
            .select("edmtrain_id, artists, event_name, festival_ind")
            .eq("location_key", locationKey)
            .is("artist_image_url", null)
            .limit(30);

          if (missingImages && missingImages.length > 0) {
            console.log(`Backfilling ${missingImages.length} events missing images`);
            const token = await getSpotifyToken();
            const spotifyCache: Record<string, string | null> = {};

            for (const row of missingImages) {
              const artistList = (typeof row.artists === 'string' ? JSON.parse(row.artists) : row.artists) || [];
              const url = await resolveEventImage(artistList, row.event_name, row.festival_ind, token, localArtistCache, spotifyCache);
              if (url) {
                await supabase
                  .from("edmtrain_events")
                  .update({ artist_image_url: url })
                  .eq("edmtrain_id", row.edmtrain_id);
              }
            }
            console.log(`Backfill complete`);
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
    const edmResponse = await fetch(`${EDMTRAIN_BASE}?${params}`);

    const responseText = await edmResponse.text();
    console.log(`Edmtrain response status: ${edmResponse.status}, body preview: ${responseText.substring(0, 200)}`);

    if (!edmResponse.ok || responseText.startsWith('<!') || responseText.startsWith('<html')) {
      console.error("Edmtrain returned non-JSON response");
      return new Response(
        JSON.stringify({ error: "Edmtrain API returned an error page.", status: edmResponse.status }),
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

    // Delete stale data for this location + any past events globally
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("edmtrain_events").delete().eq("location_key", locationKey);
    await supabase.from("edmtrain_events").delete().lt("event_date", today);

    // Resolve images: local DB first, then Spotify (with budget)
    let token: string | null = null;
    try {
      token = await getSpotifyToken();
    } catch (err) {
      console.warn("Spotify auth failed, continuing without Spotify images:", err);
    }

    const spotifyCache: Record<string, string | null> = {};
    let spotifyCallCount = 0;
    const MAX_SPOTIFY_CALLS = 150; // Budget to stay within timeout

    const eventImages: Record<number, string | null> = {};

    // First pass: resolve from local DB (instant, no API calls)
    for (const e of events) {
      const artistList = (e.artistList || []) as { name: string }[];
      for (const artist of artistList) {
        const localUrl = localArtistCache[artist.name.toLowerCase()];
        if (localUrl) {
          eventImages[e.id] = localUrl;
          break;
        }
      }
    }

    const localResolved = Object.values(eventImages).filter(Boolean).length;
    console.log(`Resolved ${localResolved}/${events.length} images from local DB`);

    // Second pass: resolve remaining from Spotify (with budget)
    if (token) {
      const unresolved = events.filter((e: any) => !eventImages[e.id]);
      console.log(`Resolving ${unresolved.length} remaining events via Spotify (budget: ${MAX_SPOTIFY_CALLS})`);

      for (let i = 0; i < unresolved.length && spotifyCallCount < MAX_SPOTIFY_CALLS; i += 5) {
        const batch = unresolved.slice(i, i + 5);
        await Promise.all(
          batch.map(async (e: any) => {
            if (spotifyCallCount >= MAX_SPOTIFY_CALLS) return;
            const artistList = (e.artistList || []).map((a: any) => ({ name: a.name }));
            // Only try top 2 artists per event to conserve budget
            for (const artist of artistList.slice(0, 2)) {
              if (spotifyCallCount >= MAX_SPOTIFY_CALLS) break;
              const key = artist.name.toLowerCase();
              if (spotifyCache[key] !== undefined) {
                if (spotifyCache[key]) { eventImages[e.id] = spotifyCache[key]; break; }
                continue;
              }
              spotifyCallCount++;
              const url = await resolveArtistImageFromSpotify(artist.name, token!);
              spotifyCache[key] = url;
              if (url) { eventImages[e.id] = url; break; }
            }
          })
        );
      }
      console.log(`Spotify calls used: ${spotifyCallCount}/${MAX_SPOTIFY_CALLS}`);
    }

    const totalResolved = Object.values(eventImages).filter(Boolean).length;
    console.log(`Total resolved: ${totalResolved}/${events.length}`);

    // Upsert fresh events
    if (events.length > 0) {
      const rows = events.map((e: any) => ({
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
      }));

      const { error: upsertError } = await supabase
        .from("edmtrain_events")
        .upsert(rows, { onConflict: "edmtrain_id" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        throw new Error(`Failed to cache events: ${upsertError.message}`);
      }
    }

    return new Response(
      JSON.stringify({ success: true, cached: false, count: events.length, resolved: totalResolved, locationKey }),
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