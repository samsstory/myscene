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

// Global rate-limit flag — once we hit a 429, stop all Spotify calls
let spotifyRateLimited = false;

async function resolveArtistImageFromSpotify(artistName: string, token: string): Promise<string | null> {
  if (spotifyRateLimited) return null;
  try {
    const resp = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=3`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    if (resp.status === 429) {
      console.warn(`Spotify rate limited — stopping all Spotify calls`);
      spotifyRateLimited = true;
      await resp.text();
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

        // Backfill missing images on cache hit — LOCAL DB ONLY (no Spotify to avoid blocking)
        try {
          const { data: missingImages } = await supabase
            .from("edmtrain_events")
            .select("edmtrain_id, artists, event_name, festival_ind")
            .eq("location_key", locationKey)
            .is("artist_image_url", null)
            .limit(50);

          if (missingImages && missingImages.length > 0) {
            let filled = 0;
            for (const row of missingImages) {
              const artistList = (typeof row.artists === 'string' ? JSON.parse(row.artists) : row.artists) || [];
              // Only check local DB, no Spotify calls on cache hit
              for (const artist of artistList) {
                const localUrl = localArtistCache[(artist.name || '').toLowerCase()];
                if (localUrl) {
                  await supabase
                    .from("edmtrain_events")
                    .update({ artist_image_url: localUrl })
                    .eq("edmtrain_id", row.edmtrain_id);
                  filled++;
                  break;
                }
              }
            }
            if (filled > 0) console.log(`Backfilled ${filled} images from local DB`);
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

    // STEP 1: Resolve images from local DB only (instant, no API calls)
    const eventImages: Record<number, string | null> = {};
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

    // STEP 2: Upsert ALL events immediately (with whatever images we have from local DB)
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

    if (rows.length > 0) {
      const { error: upsertError } = await supabase
        .from("edmtrain_events")
        .upsert(rows, { onConflict: "edmtrain_id" });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        throw new Error(`Failed to cache events: ${upsertError.message}`);
      }
      console.log(`Upserted ${rows.length} events`);
    }

    // STEP 3: Spotify image resolution as best-effort UPDATE pass (won't block data availability)
    const unresolved = events.filter((e: any) => !eventImages[e.id] && (e.artistList || []).length > 0);
    let spotifyResolved = 0;

    if (unresolved.length > 0) {
      let token: string | null = null;
      try {
        token = await getSpotifyToken();
      } catch (err) {
        console.warn("Spotify auth failed:", err);
      }

      if (token) {
        const spotifyCache: Record<string, string | null> = {};
        let callCount = 0;
        const MAX_CALLS = 80; // Conservative budget to avoid rate limits + timeout
        const startTime = Date.now();
        const TIME_BUDGET_MS = 15000; // 15 seconds max for Spotify

        console.log(`Resolving ${unresolved.length} remaining via Spotify (budget: ${MAX_CALLS} calls, 15s)`);

        for (const e of unresolved) {
          if (callCount >= MAX_CALLS || (Date.now() - startTime) > TIME_BUDGET_MS) break;

          const artistList = (e.artistList || []).map((a: any) => ({ name: a.name }));
          // Only try the first artist to conserve budget
          const firstArtist = artistList[0];
          if (!firstArtist) continue;

          const key = firstArtist.name.toLowerCase();
          let url: string | null = null;

          if (spotifyCache[key] !== undefined) {
            url = spotifyCache[key];
          } else {
            callCount++;
            url = await resolveArtistImageFromSpotify(firstArtist.name, token);
            spotifyCache[key] = url;
          }

          if (url) {
            spotifyResolved++;
            await supabase
              .from("edmtrain_events")
              .update({ artist_image_url: url })
              .eq("edmtrain_id", e.id);
          }
        }
        console.log(`Spotify: resolved ${spotifyResolved}, calls used: ${callCount}/${MAX_CALLS}`);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        cached: false,
        count: events.length,
        localResolved,
        spotifyResolved,
        locationKey,
      }),
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