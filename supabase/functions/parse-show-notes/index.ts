import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Spotify token cache
let spotifyToken: string | null = null;
let tokenExpiry = 0;

async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && Date.now() < tokenExpiry) return spotifyToken;

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Spotify credentials not configured');

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) throw new Error(`Spotify auth failed: ${resp.status}`);
  const data = await resp.json();
  spotifyToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return spotifyToken!;
}

async function searchSpotifyArtist(artistName: string): Promise<{ id: string; imageUrl: string | null; genres: string[] } | null> {
  try {
    const token = await getSpotifyToken();
    const resp = await fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(artistName)}&type=artist&limit=1`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
    if (!resp.ok) return null;
    const data = await resp.json();
    const artist = data.artists?.items?.[0];
    if (!artist) return null;
    return {
      id: artist.id,
      imageUrl: artist.images?.[0]?.url || null,
      genres: artist.genres?.slice(0, 3) || [],
    };
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { text } = await req.json();
    if (!text || text.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No text provided', shows: [] }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    console.log('Parsing show notes, text length:', text.length);

    // Phase 1: AI Extraction via tool calling
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-3-flash-preview',
        messages: [
          {
            role: 'system',
            content: `You are a concert/show data extractor. Given messy text (from notes, messages, lists), extract individual shows/concerts.

Rules:
- Each line or comma-separated entry is typically one show
- Artist names should be properly capitalized (e.g., "bicep" → "Bicep", "fred again" → "Fred Again..")
- Recognize common venue abbreviations (e.g., "ally pally" = "Alexandra Palace", "printworks" = "Printworks London", "hï" or "hi ibiza" = "Hï Ibiza")
- Parse dates in any format and return ISO strings (YYYY-MM-DD). For partial dates like "summer 2023", use "2023-07-01". For "dec 2023", use "2023-12-01"
- Handle "b2b" or "&" as multi-artist shows — return as comma-separated in the artist field (e.g., "Bicep b2b Hammer" → "Bicep, Hammer")
- "@" typically separates artist from venue
- Confidence: "high" = all fields clearly present, "medium" = some inference needed, "low" = significant guessing
- Extract as many shows as you can find. Skip lines that don't look like show data.`
          },
          {
            role: 'user',
            content: text,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_shows',
              description: 'Extract structured show/concert data from text',
              parameters: {
                type: 'object',
                properties: {
                  shows: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        artist: { type: 'string', description: 'Artist or act name (properly capitalized). For multi-artist shows, comma-separate names.' },
                        venue: { type: 'string', description: 'Venue name if mentioned, properly formatted. Empty string if not found.' },
                        date: { type: 'string', description: 'Date in ISO format YYYY-MM-DD if mentioned. Empty string if not found.' },
                        confidence: { type: 'string', enum: ['high', 'medium', 'low'], description: 'How confident the extraction is' },
                      },
                      required: ['artist', 'confidence'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['shows'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_shows' } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.', shows: [] }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.', shows: [] }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiResponse.text();
      console.error('AI gateway error:', status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();
    console.log('AI response received');

    // Extract the tool call result
    let parsedShows: Array<{ artist: string; venue?: string; date?: string; confidence: string }> = [];
    
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        parsedShows = args.shows || [];
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }

    if (parsedShows.length === 0) {
      return new Response(JSON.stringify({ shows: [], message: 'No shows could be extracted from the text.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Extracted ${parsedShows.length} shows, enriching with Spotify...`);

    // Phase 2: Spotify enrichment (parallel, non-fatal)
    const enrichedShows = await Promise.all(
      parsedShows.map(async (show) => {
        // For multi-artist shows, search for the first artist
        const primaryArtist = show.artist.split(',')[0].trim();
        const spotify = await searchSpotifyArtist(primaryArtist);
        return {
          artist: show.artist,
          venue: show.venue || '',
          date: show.date || '',
          confidence: show.confidence,
          spotify: spotify ? {
            id: spotify.id,
            imageUrl: spotify.imageUrl,
            genres: spotify.genres,
          } : null,
        };
      })
    );

    console.log('Enrichment complete, returning', enrichedShows.length, 'shows');

    return new Response(JSON.stringify({ shows: enrichedShows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('parse-show-notes error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', shows: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
