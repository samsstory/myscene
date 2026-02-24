const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface ArtistEntry {
  name: string;
  day?: string | null;
  stage?: string | null;
}

interface ScrapeResult {
  event_name: string;
  year: number;
  date_start?: string | null;
  date_end?: string | null;
  venue_name?: string | null;
  venue_location?: string | null;
  source_url: string;
  artists: ArtistEntry[];
  venue_id?: string | null;
}

const FIRECRAWL_SCHEMA = {
  type: "object",
  properties: {
    event_name: { type: "string", description: "Name of the festival or event" },
    year: { type: "integer", description: "Year of the festival" },
    date_start: { type: "string", description: "Start date in YYYY-MM-DD format" },
    date_end: { type: "string", description: "End date in YYYY-MM-DD format" },
    venue_name: { type: "string", description: "Venue or location name" },
    venue_location: { type: "string", description: "City, state/country of venue" },
    artists: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          day: { type: "string", description: "Day or date the artist performs" },
          stage: { type: "string", description: "Stage name if available" },
        },
        required: ["name"],
      },
    },
  },
  required: ["event_name", "year", "artists"],
};

async function scrapeWithFirecrawl(url: string, apiKey: string) {
  console.log("Attempting Firecrawl extraction for:", url);

  // Step 1: Get markdown content
  const resp = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url,
      formats: ["markdown"],
      onlyMainContent: true,
    }),
  });

  const data = await resp.json();
  if (!resp.ok) {
    console.error("Firecrawl API error:", JSON.stringify(data));
    throw new Error(`Firecrawl error: ${data.error || resp.status}`);
  }

  const markdown = data.data?.markdown || data.markdown || null;

  // Step 2: Try Firecrawl /extract endpoint for structured data
  let json = null;
  try {
    const extractResp = await fetch("https://api.firecrawl.dev/v1/scrape", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        url,
        formats: ["extract"],
        extract: { schema: FIRECRAWL_SCHEMA },
      }),
    });
    if (extractResp.ok) {
      const extractData = await extractResp.json();
      json = extractData.data?.extract || extractData.extract || null;
      console.log("Firecrawl extract result:", JSON.stringify(json)?.slice(0, 200));
    }
  } catch (e) {
    console.log("Firecrawl extract failed, will use LLM fallback:", e);
  }

  return { json, markdown };
}

async function extractWithLLM(markdown: string, url: string): Promise<ScrapeResult | null> {
  console.log("Falling back to LLM extraction");

  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not configured");

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
            "Extract festival lineup data from the provided webpage content. Return structured data using the provided tool.",
        },
        {
          role: "user",
          content: `Extract the festival name, year, dates, venue, and complete artist lineup from this page:\n\nURL: ${url}\n\n${markdown.slice(0, 30000)}`,
        },
      ],
      tools: [
        {
          type: "function",
          function: {
            name: "extract_festival",
            description: "Extract structured festival lineup data",
            parameters: FIRECRAWL_SCHEMA,
          },
        },
      ],
      tool_choice: { type: "function", function: { name: "extract_festival" } },
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    console.error("LLM error:", resp.status, errText);
    throw new Error(`LLM extraction failed (${resp.status})`);
  }

  const data = await resp.json();
  const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!toolCall) return null;

  try {
    return JSON.parse(toolCall.function.arguments);
  } catch {
    console.error("Failed to parse LLM tool call arguments");
    return null;
  }
}

async function fuzzyMatchVenue(
  venueName: string | null | undefined,
  supabaseUrl: string,
  serviceKey: string,
): Promise<{ venue_id: string; name: string; location: string } | null> {
  if (!venueName) return null;

  const resp = await fetch(
    `${supabaseUrl}/rest/v1/rpc/similarity`,
    {
      method: "POST",
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        "Content-Type": "application/json",
      },
      // We'll use a direct query instead
    },
  );
  // Use a direct PostgREST query with trigram similarity
  const query = `${supabaseUrl}/rest/v1/venues?select=id,name,location&name=ilike.*${encodeURIComponent(venueName.slice(0, 50))}*&limit=5`;
  const venueResp = await fetch(query, {
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
    },
  });

  if (!venueResp.ok) return null;

  const venues = await venueResp.json();
  if (!venues.length) return null;

  // Find best match by simple substring similarity
  const lower = venueName.toLowerCase().trim();
  const best = venues.reduce(
    (best: any, v: any) => {
      const name = (v.name || "").toLowerCase().trim();
      // Exact match gets highest score
      if (name === lower) return { ...v, score: 1 };
      // Contains match
      if (name.includes(lower) || lower.includes(name)) {
        const score = Math.min(name.length, lower.length) / Math.max(name.length, lower.length);
        return score > (best?.score || 0) ? { ...v, score } : best;
      }
      return best;
    },
    null,
  );

  if (best && best.score > 0.4) {
    return { venue_id: best.id, name: best.name, location: best.location };
  }

  return null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ success: false, error: "URL is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firecrawlKey = Deno.env.get("FIRECRAWL_API_KEY");
    if (!firecrawlKey) {
      return new Response(
        JSON.stringify({ success: false, error: "Firecrawl connector not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Format URL
    let formattedUrl = url.trim();
    if (!formattedUrl.startsWith("http://") && !formattedUrl.startsWith("https://")) {
      formattedUrl = `https://${formattedUrl}`;
    }

    // Step 1: Scrape with Firecrawl JSON schema
    const { json: firecrawlJson, markdown } = await scrapeWithFirecrawl(formattedUrl, firecrawlKey);

    let result: ScrapeResult | null = null;

    // Step 2: Check quality of Firecrawl extraction
    if (firecrawlJson?.event_name && firecrawlJson?.artists?.length >= 3) {
      console.log(`Firecrawl extracted ${firecrawlJson.artists.length} artists — using directly`);
      result = firecrawlJson;
    } else if (markdown) {
      // Step 3: Fallback to LLM
      console.log(
        `Firecrawl JSON had ${firecrawlJson?.artists?.length ?? 0} artists — falling back to LLM`,
      );
      result = await extractWithLLM(markdown, formattedUrl);
    }

    if (!result || !result.event_name || !result.artists?.length) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Could not extract lineup data from this page. Try a page with a clear artist list.",
        }),
        { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 4: Fuzzy match venue
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && serviceKey && result.venue_name) {
      const match = await fuzzyMatchVenue(result.venue_name, supabaseUrl, serviceKey);
      if (match) {
        console.log(`Matched venue: "${result.venue_name}" → "${match.name}" (${match.venue_id})`);
        result.venue_id = match.venue_id;
        // Prefer canonical venue name/location
        result.venue_name = match.name;
        if (match.location) result.venue_location = match.location;
      }
    }

    result.source_url = formattedUrl;

    return new Response(JSON.stringify({ success: true, data: result }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("scrape-festival-lineup error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ success: false, error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
