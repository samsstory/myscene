import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
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

    // Verify admin
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabaseClient.auth.getUser(token);
    if (authErr || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: isAdmin } = await supabaseClient.rpc("has_role", {
      _user_id: user.id,
      _role: "admin",
    });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Admin only" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const GOOGLE_KEY = Deno.env.get("GOOGLE_PLACES_API_KEY");
    if (!GOOGLE_KEY) {
      return new Response(JSON.stringify({ error: "Missing GOOGLE_PLACES_API_KEY" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Parse optional limit from body
    let limit = 50;
    try {
      const body = await req.json();
      if (body?.limit) limit = Math.min(body.limit, 200);
    } catch { /* no body is fine */ }

    // Find venues missing city or country
    const { data: venues, error: fetchErr } = await supabaseAdmin
      .from("venues")
      .select("id, name, location, city, country, latitude, longitude")
      .or("city.is.null,country.is.null")
      .not("name", "is", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (fetchErr) throw fetchErr;
    if (!venues || venues.length === 0) {
      return new Response(
        JSON.stringify({ message: "No venues need backfilling", updated: 0, skipped: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[Backfill] Found ${venues.length} venues missing city/country`);

    let updated = 0;
    let skipped = 0;
    const results: Array<{ id: string; name: string; status: string; city?: string; country?: string; location?: string }> = [];

    for (const venue of venues) {
      try {
        // If venue has coordinates, use reverse geocoding. Otherwise use text search.
        let city: string | null = null;
        let country: string | null = null;
        let fullAddress: string | null = null;
        let lat: number | null = venue.latitude ? Number(venue.latitude) : null;
        let lng: number | null = venue.longitude ? Number(venue.longitude) : null;

        // Use Google Places text search with venue name (+ location hint if available)
        const searchQuery = venue.location
          ? `${venue.name} ${venue.location}`
          : lat && lng
            ? `${venue.name}`
            : venue.name;

        const body: any = { textQuery: searchQuery, maxResultCount: 1 };
        if (lat && lng) {
          body.locationBias = { circle: { center: { latitude: lat, longitude: lng }, radius: 5000 } };
        }

        const resp = await fetch("https://places.googleapis.com/v1/places:searchText", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Goog-Api-Key": GOOGLE_KEY,
            "X-Goog-FieldMask": "places.formattedAddress,places.location,places.addressComponents",
          },
          body: JSON.stringify(body),
        });

        const data = await resp.json();
        const place = data.places?.[0];

        if (place) {
          const components = place.addressComponents || [];
          city = getComponentV2(components, "locality") || getComponentV2(components, "sublocality") || getComponentV2(components, "administrative_area_level_2");
          country = getComponentV2(components, "country");
          fullAddress = place.formattedAddress || null;
          if (!lat) lat = place.location?.latitude || null;
          if (!lng) lng = place.location?.longitude || null;
        }

        if (!city && !country) {
          skipped++;
          results.push({ id: venue.id, name: venue.name, status: "no_match" });
          continue;
        }

        // Build update object — only fill in what's missing
        const updates: Record<string, unknown> = {};
        if (!venue.city && city) updates.city = city;
        if (!venue.country && country) updates.country = country;
        if (!venue.location && fullAddress) updates.location = fullAddress;
        if (!venue.latitude && lat) updates.latitude = lat;
        if (!venue.longitude && lng) updates.longitude = lng;

        if (Object.keys(updates).length === 0) {
          skipped++;
          results.push({ id: venue.id, name: venue.name, status: "already_filled" });
          continue;
        }

        const { error: updateErr } = await supabaseAdmin
          .from("venues")
          .update(updates)
          .eq("id", venue.id);

        if (updateErr) {
          console.error(`[Backfill] Error updating ${venue.name}:`, updateErr);
          skipped++;
          results.push({ id: venue.id, name: venue.name, status: "error" });
        } else {
          updated++;
          results.push({
            id: venue.id,
            name: venue.name,
            status: "updated",
            city: (updates.city as string) || venue.city || undefined,
            country: (updates.country as string) || venue.country || undefined,
            location: (updates.location as string) || undefined,
          });
          console.log(`[Backfill] Updated ${venue.name}: city=${updates.city}, country=${updates.country}`);
        }

        // Small delay to avoid hitting rate limits
        await new Promise((r) => setTimeout(r, 200));
      } catch (err) {
        console.error(`[Backfill] Exception for ${venue.name}:`, err);
        skipped++;
        results.push({ id: venue.id, name: venue.name, status: "error" });
      }
    }

    console.log(`[Backfill] Complete: ${updated} updated, ${skipped} skipped`);

    return new Response(
      JSON.stringify({ updated, skipped, total: venues.length, results }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[Backfill] Fatal error:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

// Google Places API v2 format
function getComponentV2(components: Array<{ types: string[]; longText: string }>, type: string): string | null {
  const c = components.find((c) => c.types?.includes(type));
  return c?.longText || null;
}
