import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm } = await req.json();

    if (!searchTerm || searchTerm.trim().length < 2) {
      return new Response(JSON.stringify({ artists: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log('Searching for artist:', searchTerm);

    // Query MusicBrainz API
    const response = await fetch(
      `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(searchTerm)}&fmt=json&limit=10`,
      {
        headers: {
          'User-Agent': 'ConcertLogger/1.0 (https://lovable.dev)',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('MusicBrainz API error:', response.status, await response.text());
      return new Response(JSON.stringify({ artists: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const data = await response.json();
    console.log('MusicBrainz response:', JSON.stringify(data, null, 2));

    // Parse and simplify the response
    const artists = (data.artists || []).map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      disambiguation: artist.disambiguation || '',
      country: artist.country || '',
      type: artist.type || '',
    }));

    return new Response(JSON.stringify({ artists }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in search-artists function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', artists: [] }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
