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

async function searchSpotifyArtist(artistName: string): Promise<string | null> {
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
    return artist.images?.[0]?.url || null;
  } catch {
    return null;
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { input } = await req.json();
    if (!input || input.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'No input provided', events: [] }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('LOVABLE_API_KEY is not configured');

    console.log('Parsing upcoming show input, length:', input.length);

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
            content: `You are an upcoming concert event extractor. Given a URL, Instagram caption, or plain text, extract structured event data for future concerts.

Rules:
- Extract the primary headliner artist name (properly capitalized)
- Venue name: extract if clearly mentioned, otherwise leave empty
- Venue location: city and/or country if present
- Show date: ISO YYYY-MM-DD format if found; leave empty if not found
- Ticket URL: only include if a URL is explicitly present in the input (Ticketmaster, RA, etc.)
- Confidence: "high" = all fields clearly present, "medium" = some inference needed, "low" = significant guessing
- If multiple events are present (e.g. a tour), extract each as a separate event
- Artist names like "fred again" → "Fred Again..", "bicep" → "Bicep"`,
          },
          {
            role: 'user',
            content: input,
          },
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'extract_upcoming_events',
              description: 'Extract structured upcoming concert/event data',
              parameters: {
                type: 'object',
                properties: {
                  events: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        artist_name: { type: 'string', description: 'Primary headliner artist name, properly capitalized.' },
                        venue_name: { type: 'string', description: 'Venue name if mentioned. Empty string if not found.' },
                        venue_location: { type: 'string', description: 'City and/or country. Empty string if not found.' },
                        show_date: { type: 'string', description: 'ISO date YYYY-MM-DD. Empty string if not found.' },
                        ticket_url: { type: 'string', description: 'Ticket purchase URL if explicitly present. Empty string otherwise.' },
                        confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
                      },
                      required: ['artist_name', 'venue_name', 'venue_location', 'show_date', 'ticket_url', 'confidence'],
                      additionalProperties: false,
                    },
                  },
                },
                required: ['events'],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: 'function', function: { name: 'extract_upcoming_events' } },
      }),
    });

    if (!aiResponse.ok) {
      const status = aiResponse.status;
      if (status === 429) {
        return new Response(JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.', events: [] }), {
          status: 429,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      if (status === 402) {
        return new Response(JSON.stringify({ error: 'AI credits exhausted. Please add credits to continue.', events: [] }), {
          status: 402,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const errText = await aiResponse.text();
      console.error('AI gateway error:', status, errText);
      throw new Error(`AI gateway error: ${status}`);
    }

    const aiData = await aiResponse.json();

    let parsedEvents: Array<{
      artist_name: string;
      venue_name: string;
      venue_location: string;
      show_date: string;
      ticket_url: string;
      confidence: string;
    }> = [];

    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (toolCall?.function?.arguments) {
      try {
        const args = JSON.parse(toolCall.function.arguments);
        parsedEvents = args.events || [];
      } catch (e) {
        console.error('Failed to parse tool call arguments:', e);
      }
    }

    if (parsedEvents.length === 0) {
      return new Response(JSON.stringify({ events: [], message: 'No events could be extracted from the input.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Extracted ${parsedEvents.length} events, enriching with Spotify...`);

    // Enrich with Spotify artist images (parallel, non-fatal)
    const enrichedEvents = await Promise.all(
      parsedEvents.map(async (event) => {
        const artistImageUrl = await searchSpotifyArtist(event.artist_name);
        return {
          ...event,
          artist_image_url: artistImageUrl,
        };
      })
    );

    console.log('Enrichment complete, returning', enrichedEvents.length, 'events');

    return new Response(JSON.stringify({ events: enrichedEvents }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('parse-upcoming-show error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', events: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
