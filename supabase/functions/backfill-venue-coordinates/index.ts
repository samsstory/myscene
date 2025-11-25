import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.83.0';

const MAPBOX_API_KEY = Deno.env.get('MAPBOX_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Show {
  id: string;
  venue_name: string;
  venue_location: string | null;
}

async function geocodeLocation(location: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${MAPBOX_API_KEY}&limit=1`;
    console.log(`Geocoding: ${location}`);
    
    const response = await fetch(url);
    const data = await response.json();
    
    if (data.features && data.features.length > 0) {
      const [lng, lat] = data.features[0].center;
      console.log(`Geocoded ${location} to: ${lat}, ${lng}`);
      return { lat, lng };
    }
    
    console.log(`No geocoding results for: ${location}`);
    return null;
  } catch (error) {
    console.error(`Error geocoding ${location}:`, error);
    return null;
  }
}

function extractCityAndCountry(location: string): { city: string | null; country: string | null } {
  if (!location) return { city: null, country: null };
  
  const parts = location.split(',').map(p => p.trim());
  
  // Common patterns:
  // "City, Country" or "City, State" or "Venue, City, Country"
  if (parts.length >= 2) {
    const lastPart = parts[parts.length - 1];
    const secondLastPart = parts[parts.length - 2];
    
    // If last part looks like a country (2-3 letters or full country name)
    if (lastPart.length <= 3 || ['United States', 'United Kingdom', 'USA', 'UK'].includes(lastPart)) {
      return {
        city: secondLastPart,
        country: lastPart
      };
    }
    
    // Otherwise assume last part is city
    return {
      city: lastPart,
      country: null
    };
  }
  
  return { city: parts[0], country: null };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Create service role client for admin operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Create regular client to verify user auth
    const supabaseClient = createClient(
      SUPABASE_URL,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    console.log(`Starting backfill for user ${user.id}`);

    // Find all shows without venue_id for this user
    const { data: shows, error: showsError } = await supabaseAdmin
      .from('shows')
      .select('id, venue_name, venue_location')
      .eq('user_id', user.id)
      .is('venue_id', null);

    if (showsError) {
      throw showsError;
    }

    console.log(`Found ${shows?.length || 0} shows without venue_id`);

    const results = {
      total: shows?.length || 0,
      success: 0,
      failed: 0,
      errors: [] as string[]
    };

    if (!shows || shows.length === 0) {
      return new Response(
        JSON.stringify({ 
          message: 'No shows need geocoding',
          results 
        }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200 
        }
      );
    }

    // Process each show
    for (const show of shows as Show[]) {
      try {
        const location = show.venue_location || show.venue_name;
        if (!location) {
          console.log(`Skipping show ${show.id}: no location data`);
          results.failed++;
          results.errors.push(`${show.venue_name}: No location data`);
          continue;
        }

        // Geocode the location
        const coords = await geocodeLocation(location);
        if (!coords) {
          console.log(`Failed to geocode show ${show.id}: ${location}`);
          results.failed++;
          results.errors.push(`${show.venue_name}: Geocoding failed`);
          continue;
        }

        // Extract city and country
        const { city, country } = extractCityAndCountry(location);

        // Check if venue already exists
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
          console.log(`Using existing venue ${venueId} for ${show.venue_name}`);
        } else {
          // Create new venue
          const { data: newVenue, error: venueError } = await supabaseAdmin
            .from('venues')
            .insert({
              name: show.venue_name,
              location: location,
              city: city,
              country: country,
              latitude: coords.lat,
              longitude: coords.lng
            })
            .select('id')
            .single();

          if (venueError) {
            console.error(`Error creating venue for ${show.venue_name}:`, venueError);
            results.failed++;
            results.errors.push(`${show.venue_name}: ${venueError.message}`);
            continue;
          }

          venueId = newVenue.id;
          console.log(`Created new venue ${venueId} for ${show.venue_name}`);
        }

        // Update show with venue_id
        const { error: updateError } = await supabaseAdmin
          .from('shows')
          .update({ venue_id: venueId })
          .eq('id', show.id);

        if (updateError) {
          console.error(`Error updating show ${show.id}:`, updateError);
          results.failed++;
          results.errors.push(`${show.venue_name}: ${updateError.message}`);
          continue;
        }

        console.log(`Successfully linked show ${show.id} to venue ${venueId}`);
        results.success++;

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));

      } catch (error) {
        console.error(`Error processing show ${show.id}:`, error);
        results.failed++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        results.errors.push(`${show.venue_name}: ${errorMessage}`);
      }
    }

    console.log(`Backfill complete: ${results.success} success, ${results.failed} failed`);

    return new Response(
      JSON.stringify({ 
        message: `Geocoding complete: ${results.success}/${results.total} shows fixed`,
        results 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in backfill-venue-coordinates:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
