const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ExtractedLineup {
  event_name: string;
  year: number;
  date_start?: string | null;
  date_end?: string | null;
  venue_name?: string | null;
  venue_location?: string | null;
  artists: { name: string; day?: string | null; stage?: string | null }[];
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
                text: "Extract the complete lineup from this festival/event poster. Include every artist name, the event name, year, and any venue or date information visible.",
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

    console.log(`Extracted: "${parsed.event_name}" ${parsed.year} — ${parsed.artists?.length ?? 0} artists`);

    // Deduplicate artists by lowercase name
    const seen = new Set<string>();
    parsed.artists = (parsed.artists || []).filter((a) => {
      const key = a.name.toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });

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
