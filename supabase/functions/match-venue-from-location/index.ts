import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VenueSuggestion {
  id?: string;
  externalPlaceId?: string;
  name: string;
  address: string;
  city?: string;
  distanceMeters: number;
}

interface VenueMatchResult {
  primaryVenue: VenueSuggestion | null;
  alternativeVenues: VenueSuggestion[];
  matchSource: 'database' | 'places_api' | 'none';
}

// Haversine formula to calculate distance between two points
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// Music venue types to include
const MUSIC_VENUE_TYPES = [
  'night_club',
  'bar',
  'stadium',
  'performing_arts_theater',
  'concert_hall',
  'event_venue',
  'park',
  'amusement_park',
  'casino',
  'convention_center',
  'cultural_center',
];

// Types to exclude even if they match
const EXCLUDED_TYPES = [
  'lodging',
  'hotel',
  'motel',
  'gas_station',
  'grocery_store',
  'supermarket',
  'convenience_store',
  'bank',
  'atm',
  'hospital',
  'pharmacy',
  'dentist',
  'doctor',
  'school',
  'university',
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { latitude, longitude } = await req.json();

    console.log(`Matching venue for coordinates: ${latitude}, ${longitude}`);

    if (!latitude || !longitude) {
      return new Response(
        JSON.stringify({ error: "Missing latitude or longitude" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const googleApiKey = Deno.env.get("GOOGLE_PLACES_API_KEY");

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Step 1: Check local database for venues within 400m
    const { data: localVenues, error: dbError } = await supabase
      .from('venues')
      .select('id, name, location, city, latitude, longitude, metadata')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null);

    if (dbError) {
      console.error('Database query error:', dbError);
    }

    console.log(`Found ${localVenues?.length || 0} venues with coordinates in DB`);

    const nearbyLocalVenues: VenueSuggestion[] = [];
    
    if (localVenues && localVenues.length > 0) {
      for (const venue of localVenues) {
        if (venue.latitude && venue.longitude) {
          const distance = calculateDistance(
            latitude, 
            longitude, 
            Number(venue.latitude), 
            Number(venue.longitude)
          );
          
          if (distance <= 400) {
            console.log(`Found nearby venue: ${venue.name} at ${distance.toFixed(0)}m`);
            nearbyLocalVenues.push({
              id: venue.id,
              externalPlaceId: venue.metadata?.google_place_id,
              name: venue.name,
              address: venue.location || '',
              city: venue.city || undefined,
              distanceMeters: Math.round(distance),
            });
          }
        }
      }
      
      // Sort by distance
      nearbyLocalVenues.sort((a, b) => a.distanceMeters - b.distanceMeters);
    }

    console.log(`Found ${nearbyLocalVenues.length} venues within 400m from DB`);

    // If we found local matches, return them
    if (nearbyLocalVenues.length > 0) {
      const result: VenueMatchResult = {
        primaryVenue: nearbyLocalVenues[0],
        alternativeVenues: nearbyLocalVenues.slice(1, 3),
        matchSource: 'database',
      };
      
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 2: If no local matches, call Google Places API
    if (!googleApiKey) {
      console.error('GOOGLE_PLACES_API_KEY not configured');
      return new Response(
        JSON.stringify({
          primaryVenue: null,
          alternativeVenues: [],
          matchSource: 'none',
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use Google Places Nearby Search API (New)
    const placesUrl = `https://places.googleapis.com/v1/places:searchNearby`;
    
    const placesResponse = await fetch(placesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': googleApiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.types,places.location,places.primaryType',
      },
      body: JSON.stringify({
        locationRestriction: {
          circle: {
            center: { latitude, longitude },
            radius: 400.0,
          },
        },
        includedTypes: MUSIC_VENUE_TYPES,
        maxResultCount: 10,
        rankPreference: 'DISTANCE',
      }),
    });

    if (!placesResponse.ok) {
      const errorText = await placesResponse.text();
      console.error('Google Places API error:', errorText);
      
      return new Response(
        JSON.stringify({
          primaryVenue: null,
          alternativeVenues: [],
          matchSource: 'none',
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const placesData = await placesResponse.json();
    const places = placesData.places || [];

    // Filter out excluded types
    const filteredPlaces = places.filter((place: any) => {
      const types = place.types || [];
      return !types.some((type: string) => EXCLUDED_TYPES.includes(type));
    });

    if (filteredPlaces.length === 0) {
      return new Response(
        JSON.stringify({
          primaryVenue: null,
          alternativeVenues: [],
          matchSource: 'none',
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map places to our format with distance
    const venueSuggestions: VenueSuggestion[] = filteredPlaces.map((place: any) => {
      const placeLat = place.location?.latitude;
      const placeLng = place.location?.longitude;
      const distance = placeLat && placeLng 
        ? calculateDistance(latitude, longitude, placeLat, placeLng)
        : 0;

      // Extract city from formatted address
      const addressParts = (place.formattedAddress || '').split(', ');
      const city = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : undefined;

      return {
        externalPlaceId: place.id,
        name: place.displayName?.text || 'Unknown Venue',
        address: place.formattedAddress || '',
        city,
        distanceMeters: Math.round(distance),
      };
    });

    // Sort by distance
    venueSuggestions.sort((a, b) => a.distanceMeters - b.distanceMeters);

    // Cache the primary venue in our database for future lookups
    const primaryVenue = venueSuggestions[0];
    if (primaryVenue) {
      const placeLat = filteredPlaces[0].location?.latitude;
      const placeLng = filteredPlaces[0].location?.longitude;
      
      // Check if venue already exists by Google Place ID
      const { data: existingVenue } = await supabase
        .from('venues')
        .select('id')
        .eq('metadata->>google_place_id', primaryVenue.externalPlaceId)
        .maybeSingle();

      if (!existingVenue) {
        // Insert new venue
        const { data: newVenue, error: insertError } = await supabase
          .from('venues')
          .insert({
            name: primaryVenue.name,
            location: primaryVenue.address,
            city: primaryVenue.city,
            latitude: placeLat,
            longitude: placeLng,
            metadata: { google_place_id: primaryVenue.externalPlaceId },
          })
          .select('id')
          .single();

        if (!insertError && newVenue) {
          primaryVenue.id = newVenue.id;
        }
      } else {
        primaryVenue.id = existingVenue.id;
      }
    }

    const result: VenueMatchResult = {
      primaryVenue: venueSuggestions[0] || null,
      alternativeVenues: venueSuggestions.slice(1, 3),
      matchSource: 'places_api',
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Error in match-venue-from-location:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
