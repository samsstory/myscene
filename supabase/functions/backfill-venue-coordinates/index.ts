import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const MAPBOX_API_KEY = Deno.env.get('MAPBOX_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_ELAPSED_MS = 50_000; // 50s guard – return partial results before platform timeout
const BATCH_SIZE = 3;

interface Show {
  id: string;
  venue_name: string;
  venue_location: string | null;
}

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${MAPBOX_API_KEY}&limit=1`;
    const response = await fetch(url);
    const data = await response.json();
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      return { lat, lng };
    }
    return null;
  } catch (error) {
    console.error(`Error geocoding ${location}:`, error);
    return null;
  }
}

function extractCityAndCountry(location: string): { city: string | null; country: string | null } {
  if (!location) return { city: null, country: null };
  const parts = location.split(',').map(p => p.trim());
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];
    if (lastPart.length <= 3 || ['United States', 'United Kingdom', 'USA', 'UK'].includes(lastPart)) {
      return { city: secondLastPart, country: lastPart };
    }
    return { city: lastPart, country: null };
  }
  return { city: parts[0], country: null };
}

async function processShow(
  show: Show,
  supabaseAdmin: ReturnType<typeof createClient>,
): Promise<{ success: boolean; error?: string }> {
  const location = show.venue_location || show.venue_name;
  if (!location) return { success: false, error: `${show.venue_name}: No location data` };

  const coords = await geocodeLocation(location);
  if (!coords) return { success: false, error: `${show.venue_name}: Geocoding failed` };

  const { city, country } = extractCityAndCountry(location);

  const { data: existingVenue } = await supabaseAdmin
    .from('venues')
    .select('id')
    .eq('name', show.venue_name)
    .eq('latitude', coords.lat)
    .eq('longitude', coords.lng)
    .maybeSingle();

  let venueId: string;

  if (existingVenue) {
    venueId = existingVenue.id;
  } else {
    const { data: newVenue, error: venueError } = await supabaseAdmin
      .from('venues')
      .insert({ name: show.venue_name, location, city, country, latitude: coords.lat, longitude: coords.lng })
      .select('id')
      .single();
    if (venueError) return { success: false, error: `${show.venue_name}: ${venueError.message}` };
    venueId = newVenue.id;
  }

  const { error: updateError } = await supabaseAdmin
    .from('shows')
    .update({ venue_id: venueId })
    .eq('id', show.id);

  if (updateError) return { success: false, error: `${show.venue_name}: ${updateError.message}` };
  return { success: true };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('Missing authorization header');

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    const supabaseClient = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    const { data: shows, error: showsError } = await supabaseAdmin
      .from('shows')
      .select('id, venue_name, venue_location')
      .eq('user_id', user.id)
      .is('venue_id', null);

    if (showsError) throw showsError;

    const results = { total: shows?.length || 0, success: 0, failed: 0, errors: [] as string[] };

    if (!shows || shows.length === 0) {
      return new Response(
        JSON.stringify({ message: 'No shows need geocoding', results, partial: false }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const startTime = Date.now();
    let partial = false;

    // Process in batches of BATCH_SIZE concurrently
    for (let i = 0; i < shows.length; i += BATCH_SIZE) {
      if (Date.now() - startTime > MAX_ELAPSED_MS) {
        partial = true;
        console.log(`Time guard hit at ${i}/${shows.length} shows`);
        break;
      }

      const batch = (shows as Show[]).slice(i, i + BATCH_SIZE);
      const batchResults = await Promise.all(
        batch.map(show => processShow(show, supabaseAdmin))
      );

      for (const r of batchResults) {
        if (r.success) {
          results.success++;
        } else {
          results.failed++;
          if (r.error) results.errors.push(r.error);
        }
      }
    }

    return new Response(
      JSON.stringify({
        message: `Geocoding ${partial ? 'partially ' : ''}complete: ${results.success}/${results.total} shows fixed`,
        results,
        partial,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in backfill-venue-coordinates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
