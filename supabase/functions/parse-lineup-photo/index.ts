import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ArtistEntry {
  name: string;
  day?: string | null;
  stage?: string | null;
  image_url?: string | null;
  spotify_id?: string | null;
  matched?: boolean;
  is_b2b?: boolean;
  b2b_artists?: { name: string; image_url?: string | null; spotify_id?: string | null }[];
}

/** Detect B2B/B3B/vs delimiters */
const B2B_REGEX = /\s+(?:b2b|b3b|b4b|back\s+to\s+back|vs\.?)\s+/i;

function detectB2b(name: string): boolean {
  return B2B_REGEX.test(name);
}

function splitB2bNames(name: string): string[] {
  return name.split(B2B_REGEX).map(s => s.trim()).filter(Boolean);
}

interface ExtractedLineup {
  event_name: string;
  year: number;
  date_start?: string | null;
  date_end?: string | null;
  venue_name?: string | null;
  venue_location?: string | null;
  artists: ArtistEntry[];
}

const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    event_name: { type: "string", description: "Festival or event name" },
    year: { type: "integer", description: "Year of the festival" },
    date_start: { type: "string", description: "Start date in YYYY-MM-DD if visible" },
    date_end: { type: "string", description: "End date in YYYY-MM-DD if visible" },
    venue_name: { type: "string", description: "Venue or location name if visible" },
    venue_location: { type: "string", description: "City, state/country if visible" },
    artists: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string", description: "Artist or act name" },
          day: { type: "string", description: "Day label if visible (e.g. 'Friday', 'Day 1')" },
          stage: { type: "string", description: "Stage name if visible" },
        },
        required: ["name"],
      },
    },
  },
  required: ["event_name", "year", "artists"],
};

/* ── Spotify enrichment removed from OCR reconciliation ──
   Image/ID enrichment happens lazily during the claim step
   via batch-artist-images to avoid wasted API calls */

/* ── Reconcile extracted names against canonical artists table + Spotify ── */
async function reconcileArtists(artists: ArtistEntry[]): Promise<ArtistEntry[]> {
  if (!artists.length) return artists;

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) {
    console.warn("No Supabase credentials — skipping reconciliation");
    return artists;
  }

  const supabase = createClient(supabaseUrl, serviceKey);
  const reconciled: ArtistEntry[] = [];

  // Step 1: Batch lookup against canonical artists table using trigram similarity
  // We query all artists at once to minimize DB round-trips
  const names = artists.map((a) => a.name);
  const { data: canonicalRows } = await supabase
    .from("artists")
    .select("name, image_url, spotify_artist_id")
    .not("name", "is", null);

  // Build a lowercase map for exact + near-exact matching
  const canonicalMap = new Map<string, { name: string; image_url: string | null; spotify_id: string | null }>();
  for (const row of canonicalRows || []) {
    canonicalMap.set(row.name.toLowerCase().trim(), {
      name: row.name,
      image_url: row.image_url,
      spotify_id: row.spotify_artist_id,
    });
  }

  const unmatchedForSpotify: number[] = []; // indices into `artists`

  for (let i = 0; i < artists.length; i++) {
    const a = artists[i];
    const key = a.name.toLowerCase().trim();

    // Exact match (case-insensitive)
    const exact = canonicalMap.get(key);
    if (exact) {
      reconciled.push({
        ...a,
        name: exact.name, // Use canonical casing
        image_url: exact.image_url,
        spotify_id: exact.spotify_id,
        matched: true,
      });
      continue;
    }

    // Fuzzy match: try DB trigram similarity (threshold 0.4 — artist names can be short)
    try {
      const { data: fuzzyRows } = await supabase
        .rpc("similarity", undefined as any) // Not available as RPC, use REST query instead
        .select("*");
      // Fallback: simple substring/prefix matching since we can't call similarity() via SDK
    } catch {
      // Expected — similarity() isn't an RPC. Fall through to alternative.
    }

    // Alternative fuzzy: search canonical map for close matches
    let bestMatch: { name: string; image_url: string | null; spotify_id: string | null; score: number } | null = null;
    for (const [canonKey, canonVal] of canonicalMap) {
      const score = jaroWinkler(key, canonKey);
      if (score > 0.88 && (!bestMatch || score > bestMatch.score)) {
        bestMatch = { ...canonVal, score };
      }
    }

    if (bestMatch) {
      reconciled.push({
        ...a,
        name: bestMatch.name,
        image_url: bestMatch.image_url,
        spotify_id: bestMatch.spotify_id,
        matched: true,
      });
    } else {
      // No DB match — queue for Spotify lookup
      reconciled.push({ ...a, matched: false });
      unmatchedForSpotify.push(i);
    }
  }

  // Unmatched artists are left as-is — Spotify enrichment happens later
  // during the claim step (via batch-artist-images) to avoid wasted API calls
  console.log(`DB reconciliation: ${reconciled.filter(a => a.matched).length}/${reconciled.length} matched from canonical artists table`);

  return reconciled;
}

/* ── Jaro-Winkler similarity (in-process, no DB needed) ── */
function jaroWinkler(s1: string, s2: string): number {
  if (s1 === s2) return 1;
  const len1 = s1.length;
  const len2 = s2.length;
  if (len1 === 0 || len2 === 0) return 0;

  const matchDist = Math.max(Math.floor(Math.max(len1, len2) / 2) - 1, 0);
  const s1Matches = new Array(len1).fill(false);
  const s2Matches = new Array(len2).fill(false);

  let matches = 0;
  let transpositions = 0;

  for (let i = 0; i < len1; i++) {
    const start = Math.max(0, i - matchDist);
    const end = Math.min(i + matchDist + 1, len2);
    for (let j = start; j < end; j++) {
      if (s2Matches[j] || s1[i] !== s2[j]) continue;
      s1Matches[i] = true;
      s2Matches[j] = true;
      matches++;
      break;
    }
  }

  if (matches === 0) return 0;

  let k = 0;
  for (let i = 0; i < len1; i++) {
    if (!s1Matches[i]) continue;
    while (!s2Matches[k]) k++;
    if (s1[i] !== s2[k]) transpositions++;
    k++;
  }

  const jaro = (matches / len1 + matches / len2 + (matches - transpositions / 2) / matches) / 3;

  // Winkler boost for common prefix (up to 4 chars)
  let prefix = 0;
  for (let i = 0; i < Math.min(4, Math.min(len1, len2)); i++) {
    if (s1[i] === s2[i]) prefix++;
    else break;
  }

  return jaro + prefix * 0.1 * (1 - jaro);
}

/* ── Main handler ── */
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { image_base64, mime_type } = await req.json();

    if (!image_base64) {
      return new Response(
        JSON.stringify({ success: false, error: "image_base64 is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({ success: false, error: "LOVABLE_API_KEY not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const mediaType = mime_type || "image/jpeg";
    console.log("Sending lineup photo to Gemini Flash for OCR extraction...");

    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an expert at reading festival and concert lineup posters. Extract EVERY artist name you can read from the image. Also extract the festival/event name, year, dates, venue, and any day/stage labels. Be thorough — include ALL artists even if the text is small or stylized. For artist names, use their commonly known capitalization (e.g. 'ODESZA', 'deadmau5', 'Above & Beyond').",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract the complete lineup from this festival/event poster. Include every artist name, the event name, year, and any venue or date information visible. IMPORTANT: If artists are listed as a B2B, B3B, or 'vs' set (e.g. 'Pete Tong b2b Ahmed Spins'), keep them as a single entry with the full string — do NOT split them into separate artists.",
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:${mediaType};base64,${image_base64}`,
                },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "extract_lineup",
              description: "Extract structured lineup data from a festival poster image",
              parameters: EXTRACTION_SCHEMA,
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "extract_lineup" } },
      }),
    });

    if (!resp.ok) {
      const errText = await resp.text();
      console.error("Gemini error:", resp.status, errText);

      if (resp.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: "Rate limited — please try again in a moment" }),
          { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
      if (resp.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: "AI credits exhausted" }),
          { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: `OCR extraction failed (${resp.status})` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const data = await resp.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];

    if (!toolCall) {
      return new Response(
        JSON.stringify({ success: false, error: "Could not extract lineup data from this image" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let parsed: ExtractedLineup;
    try {
      parsed = JSON.parse(toolCall.function.arguments);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Failed to parse extracted data" }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Deduplicate artists by lowercase name
    const seen = new Set<string>();
    parsed.artists = (parsed.artists || []).filter((a) => {
      const key = a.name.toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Detect B2B sets in extracted artist names and flag them
    parsed.artists = parsed.artists.map((a) => {
      if (detectB2b(a.name)) {
        const individualNames = splitB2bNames(a.name);
        return {
          ...a,
          is_b2b: true,
          b2b_artists: individualNames.map(n => ({ name: n })),
        };
      }
      return { ...a, is_b2b: false };
    });

    console.log(`OCR extracted: "${parsed.event_name}" ${parsed.year} — ${parsed.artists.length} artists`);

    // Reconcile against canonical artists DB + Spotify
    console.log("Reconciling artist names against database and Spotify...");
    parsed.artists = await reconcileArtists(parsed.artists);

    const matchedCount = parsed.artists.filter((a) => a.matched).length;
    console.log(`Reconciliation complete: ${matchedCount}/${parsed.artists.length} matched`);

    return new Response(
      JSON.stringify({ success: true, data: parsed }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error) {
    console.error("parse-lineup-photo error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ success: false, error: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
