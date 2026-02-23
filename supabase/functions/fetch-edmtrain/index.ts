import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const EDMTRAIN_BASE = "https://edmtrain.com/api/events";

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
    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "latitude and longitude are required" }),
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
      client: EDMTRAIN_API_KEY,
    });
    if (state) params.set("state", state);

    console.log(`Fetching Edmtrain events for ${locationKey}`);
    const edmResponse = await fetch(`${EDMTRAIN_BASE}?${params}`);
    const edmData = await edmResponse.json();

    if (!edmData.success) {
      console.error("Edmtrain API error:", edmData.message);
      return new Response(
        JSON.stringify({ error: edmData.message || "Edmtrain API error" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const events = edmData.data || [];
    console.log(`Received ${events.length} events from Edmtrain`);

    // Step 1: Delete stale data for this location + any past events globally
    const today = new Date().toISOString().split("T")[0];
    await supabase.from("edmtrain_events").delete().eq("location_key", locationKey);
    await supabase.from("edmtrain_events").delete().lt("event_date", today);

    // Step 2: Upsert fresh events
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
