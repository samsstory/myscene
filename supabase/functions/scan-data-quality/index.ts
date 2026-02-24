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
    // --- Auth: verify caller is admin ---
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsErr } =
      await anonClient.auth.getClaims(token);
    if (claimsErr || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = claimsData.claims.sub as string;

    // Use service role for data operations
    const sb = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin role
    const { data: roleRow } = await sb
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // --- Clear old pending suggestions ---
    await sb.from("data_suggestions").delete().eq("status", "pending");

    const suggestions: Array<{
      entity_type: string;
      entity_id: string | null;
      suggestion_type: string;
      title: string;
      details: Record<string, unknown>;
    }> = [];

    // ========== 1. Duplicate Venues ==========
    const { data: venues } = await sb
      .from("venues")
      .select("id, name, latitude, longitude, city, country, location");

    if (venues) {
      const groups = new Map<string, typeof venues>();
      for (const v of venues) {
        const key = v.name.toLowerCase().trim();
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(v);
      }
      for (const [normName, group] of groups) {
        if (group.length < 2) continue;
        // Score each by metadata completeness
        const scored = group.map((v) => ({
          ...v,
          score:
            (v.latitude ? 1 : 0) +
            (v.city ? 1 : 0) +
            (v.country ? 1 : 0) +
            (v.location ? 1 : 0),
        }));
        scored.sort((a, b) => b.score - a.score);
        const canonical = scored[0];
        const duplicates = scored.slice(1);
        suggestions.push({
          entity_type: "venue",
          entity_id: canonical.id,
          suggestion_type: "duplicate",
          title: `${group.length} duplicate venues: "${canonical.name}"`,
          details: {
            canonical: {
              id: canonical.id,
              name: canonical.name,
              city: canonical.city,
              country: canonical.country,
              location: canonical.location,
              latitude: canonical.latitude,
              longitude: canonical.longitude,
            },
            duplicates: duplicates.map((v) => ({
              id: v.id,
              name: v.name,
              city: v.city,
              country: v.country,
              location: v.location,
              latitude: v.latitude,
              longitude: v.longitude,
            })),
            normalized_name: normName,
          },
        });
      }
    }
    const duplicateVenues = suggestions.length;

    // ========== 2. Venues Missing Metadata ==========
    // Get venue IDs referenced by shows
    const { data: showVenueIds } = await sb
      .from("shows")
      .select("venue_id")
      .not("venue_id", "is", null);

    const referencedIds = new Set(
      (showVenueIds || []).map((s) => s.venue_id).filter(Boolean)
    );

    if (venues) {
      const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");
      
      for (const v of venues) {
        if (!referencedIds.has(v.id)) continue;
        
        // Auto-backfill coordinates from location address if available
        if ((!v.latitude || !v.longitude) && v.location && googleApiKey) {
          try {
            const query = `${v.name} ${v.location}`;
            const url = `https://maps.googleapis.com/maps/api/place/findplacefromtext/json?input=${encodeURIComponent(query)}&inputtype=textquery&fields=geometry,formatted_address,address_components&key=${googleApiKey}`;
            const resp = await fetch(url);
            const json = await resp.json();
            const candidate = json.candidates?.[0];
            if (candidate?.geometry?.location) {
              const updates: Record<string, unknown> = {
                latitude: candidate.geometry.location.lat,
                longitude: candidate.geometry.location.lng,
              };
              // Also backfill city/country if missing
              if (candidate.address_components) {
                for (const comp of candidate.address_components) {
                  if (!v.city && comp.types?.includes("locality")) updates.city = comp.long_name;
                  if (!v.country && comp.types?.includes("country")) updates.country = comp.long_name;
                }
              }
              await sb.from("venues").update(updates).eq("id", v.id);
              // Update local copy so we don't flag it
              v.latitude = updates.latitude as number;
              v.longitude = updates.longitude as number;
              if (updates.city) v.city = updates.city as string;
              if (updates.country) v.country = updates.country as string;
            }
          } catch (e) {
            console.error(`Auto-backfill failed for ${v.name}:`, e);
          }
        }
        
        const missing: string[] = [];
        if (!v.latitude || !v.longitude) missing.push("coordinates");
        if (!v.city) missing.push("city");
        if (!v.country) missing.push("country");
        if (missing.length === 0) continue;
        suggestions.push({
          entity_type: "venue",
          entity_id: v.id,
          suggestion_type: "missing_data",
          title: `"${v.name}" missing: ${missing.join(", ")}`,
          details: {
            venue_id: v.id,
            venue_name: v.name,
            missing_fields: missing,
          },
        });
      }
    }
    const missingMetadata = suggestions.length - duplicateVenues;

    // ========== 3. Artist Name Variants ==========
    const { data: artistRows } = await sb
      .from("show_artists")
      .select("artist_name, id");

    if (artistRows) {
      // 3a. Exact case mismatches
      const caseGroups = new Map<string, Map<string, number>>();
      for (const a of artistRows) {
        const key = a.artist_name.toLowerCase().trim();
        if (!caseGroups.has(key)) caseGroups.set(key, new Map());
        const variants = caseGroups.get(key)!;
        variants.set(
          a.artist_name,
          (variants.get(a.artist_name) || 0) + 1
        );
      }
      const caseMatchKeys = new Set<string>();
      for (const [normName, variants] of caseGroups) {
        if (variants.size < 2) continue;
        caseMatchKeys.add(normName);
        const variantList = Array.from(variants.entries()).map(
          ([name, count]) => ({ name, count })
        );
        suggestions.push({
          entity_type: "artist",
          entity_id: null,
          suggestion_type: "name_mismatch",
          title: `Case variants: ${variantList.map((v) => `"${v.name}"`).join(" vs ")}`,
          details: {
            normalized_name: normName,
            variants: variantList,
            match_type: "exact_case",
          },
        });
      }

      // 3b. Fuzzy trigram matches between distinct normalized names
      const distinctNames = Array.from(caseGroups.keys());
      const fuzzyPairs = new Set<string>();
      for (let i = 0; i < distinctNames.length; i++) {
        for (let j = i + 1; j < distinctNames.length; j++) {
          const a = distinctNames[i];
          const b = distinctNames[j];
          if (caseMatchKeys.has(a) && a === b) continue;
          // Simple trigram-like similarity in JS for small dataset
          const sim = trigramSimilarity(a, b);
          if (sim >= 0.7 && sim < 1.0) {
            const pairKey = [a, b].sort().join("||");
            if (fuzzyPairs.has(pairKey)) continue;
            fuzzyPairs.add(pairKey);
            const aVariants = caseGroups.get(a)!;
            const bVariants = caseGroups.get(b)!;
            const aName = Array.from(aVariants.keys())[0];
            const bName = Array.from(bVariants.keys())[0];
            const aCount = Array.from(aVariants.values()).reduce(
              (s, c) => s + c,
              0
            );
            const bCount = Array.from(bVariants.values()).reduce(
              (s, c) => s + c,
              0
            );
            suggestions.push({
              entity_type: "artist",
              entity_id: null,
              suggestion_type: "name_mismatch",
              title: `Fuzzy match: "${aName}" ≈ "${bName}" (${Math.round(sim * 100)}%)`,
              details: {
                name_a: aName,
                name_b: bName,
                similarity: Math.round(sim * 100),
                count_a: aCount,
                count_b: bCount,
                match_type: "fuzzy",
              },
            });
          }
        }
      }
    }
    const artistVariants =
      suggestions.length - duplicateVenues - missingMetadata;

    // ========== 4. Unlinked Shows ==========
    const { data: unlinkedShows } = await sb
      .from("shows")
      .select("id, venue_name, venue_location")
      .is("venue_id", null)
      .not("venue_name", "is", null);

    if (unlinkedShows && venues) {
      // Build a lookup of normalized venue names -> venue records
      const venueLookup = new Map<string, (typeof venues)[0]>();
      for (const v of venues) {
        venueLookup.set(v.name.toLowerCase().trim(), v);
      }

      for (const show of unlinkedShows) {
        const normName = show.venue_name.toLowerCase().trim();
        const match = venueLookup.get(normName);
        if (match) {
          suggestions.push({
            entity_type: "show",
            entity_id: show.id,
            suggestion_type: "missing_data",
            title: `Unlinked show at "${show.venue_name}" → venue "${match.name}"`,
            details: {
              show_id: show.id,
              venue_name: show.venue_name,
              candidate_venue_id: match.id,
              candidate_venue_name: match.name,
            },
          });
        }
      }
    }
    const unlinkedShowsCount =
      suggestions.length -
      duplicateVenues -
      missingMetadata -
      artistVariants;

    // --- Insert all suggestions ---
    if (suggestions.length > 0) {
      const { error: insertErr } = await sb
        .from("data_suggestions")
        .insert(suggestions);
      if (insertErr) {
        console.error("Insert error:", insertErr);
        return new Response(
          JSON.stringify({ error: "Failed to insert suggestions" }),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    return new Response(
      JSON.stringify({
        duplicateVenues,
        missingMetadata,
        artistVariants,
        unlinkedShows: unlinkedShowsCount,
        total: suggestions.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("Scan error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

/** Simple trigram similarity (Jaccard) matching pg_trgm behavior */
function trigrams(s: string): Set<string> {
  const padded = `  ${s} `;
  const result = new Set<string>();
  for (let i = 0; i < padded.length - 2; i++) {
    result.add(padded.slice(i, i + 3));
  }
  return result;
}

function trigramSimilarity(a: string, b: string): number {
  const ta = trigrams(a);
  const tb = trigrams(b);
  let intersection = 0;
  for (const t of ta) {
    if (tb.has(t)) intersection++;
  }
  const union = ta.size + tb.size - intersection;
  return union === 0 ? 0 : intersection / union;
}
