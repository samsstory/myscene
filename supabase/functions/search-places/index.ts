import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query } = await req.json();

    if (!query || query.trim().length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    if (!GOOGLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Google Places API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Use Google Places v2 text search — no filtering, just raw results
    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': GOOGLE_KEY,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.addressComponents',
      },
      body: JSON.stringify({
        textQuery: query.trim(),
        maxResultCount: 10,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Google] Error ${response.status}: ${errorText}`);
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const places = data.places || [];

    const results = places.map((p: any) => {
      const components = p.addressComponents || [];
      const getComponent = (type: string) =>
        components.find((c: any) => c.types?.includes(type))?.longText || '';

      const city = getComponent('locality') || getComponent('sublocality') ||
        getComponent('administrative_area_level_2') || '';
      const country = getComponent('country') || '';

      return {
        name: p.displayName?.text || '',
        fullAddress: p.formattedAddress || '',
        city: city || undefined,
        country: country || undefined,
        latitude: p.location?.latitude || 0,
        longitude: p.location?.longitude || 0,
      };
    });

    return new Response(
      JSON.stringify({ results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    console.error('search-places error:', err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
