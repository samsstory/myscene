import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

// Declare EdgeRuntime for background tasks
declare const EdgeRuntime: {
  waitUntil: (promise: Promise<unknown>) => void;
};

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Background task to cache more venues in discovered cities
async function cacheVenuesInCity(
  city: string,
  supabaseUrl: string,
  supabaseServiceKey: string,
  googleApiKey: string,
  userLat?: number,
  userLon?: number
) {
  try {
    console.log(`[Background] Caching venues in ${city}...`);
    
    // Build location bias
    let locationBias = '';
    if (userLat && userLon) {
      locationBias = `&location=${userLat},${userLon}&radius=50000`; // 50km radius
    }
    
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=music+venues+in+${encodeURIComponent(city)}&type=night_club|bar${locationBias}&key=${googleApiKey}`;
    
    const response = await fetch(url);
    
    if (!response.ok) {
      console.error(`[Background] Cache error: ${response.status}`);
      return;
    }

    const data = await response.json();
    
    if (data.results && Array.isArray(data.results) && data.results.length > 0) {
      // Use service role key for background caching
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      const venuesToCache = [];

      for (const place of data.results.slice(0, 30)) { // Limit to 30 venues
        const venueName = place.name;
        const venueAddress = place.formatted_address || '';
        
        // Extract city and state from address
        const addressParts = venueAddress.split(', ');
        const venueCity = addressParts.length > 1 ? addressParts[addressParts.length - 3] || '' : '';
        const state = addressParts.length > 2 ? addressParts[addressParts.length - 2] || '' : '';
        
        let location = '';
        if (venueCity && state) {
          location = `${venueCity}, ${state}`;
        } else if (venueAddress) {
          location = venueAddress;
        }

        // Check if venue already exists
        const { data: existing } = await supabase
          .from('venues')
          .select('id')
          .eq('name', venueName)
          .eq('city', venueCity)
          .maybeSingle();

        if (!existing && venueName) {
          venuesToCache.push({
            name: venueName,
            location: location,
            city: venueCity || null,
            latitude: place.geometry?.location?.lat || null,
            longitude: place.geometry?.location?.lng || null,
          });
        }
      }

      if (venuesToCache.length > 0) {
        const { error } = await supabase.from('venues').insert(venuesToCache);
        if (error) {
          console.error('[Background] Insert error:', error);
        } else {
          console.log(`[Background] Cached ${venuesToCache.length} venues in ${city}`);
        }
      }
    }
  } catch (error) {
    console.error('[Background] Caching error:', error);
  }
}

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  types: string[];
}

interface VenueSuggestion {
  id?: string;
  name: string;
  location: string;
  user_show_count: number;
  scene_users_count: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm } = await req.json();

    if (!searchTerm || searchTerm.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Search term must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const payload = JSON.parse(atob(token.split('.')[1]));
    const userId = payload.sub;

    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's JWT token for RLS-protected queries
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      }
    );

    // Use service role key for caching operations (bypasses RLS)
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Searching venues for: ${searchTerm}`);

    // 1. Search user's own shows - search across all words in the venue name
    const searchWords = searchTerm.trim().toLowerCase().split(/\s+/);
    let userShows: any[] = [];
    
    try {
      const { data, error } = await supabaseClient
        .from('shows')
        .select('venue_name, venue_location, venue_id')
        .eq('user_id', userId)
        .order('venue_name');

      if (error) {
        console.error('Error fetching user shows:', error);
      } else if (data) {
        // Filter in memory to match any word in the search term
        userShows = data.filter((show: any) => {
          const venueName = show.venue_name.toLowerCase();
          return searchWords.some((word: string) => venueName.includes(word));
        });
        console.log(`Found ${userShows.length} user shows`);
      }
    } catch (err) {
      console.error('Exception fetching user shows:', err);
    }

    // 2. Search cached venues
    const { data: cachedVenues, error: cachedError } = await supabaseClient
      .from('venues')
      .select('id, name, location, city, country')
      .ilike('name', `%${searchTerm.trim()}%`)
      .limit(10);

    if (cachedError) {
      console.error('Error fetching cached venues:', cachedError);
    } else {
      console.log(`Found ${cachedVenues?.length || 0} cached venues`);
    }

    // 3. Get scene user counts
    const venueIds = cachedVenues?.map(v => v.id) || [];
    const sceneUserCounts = new Map<string, number>();
    
    if (venueIds.length > 0) {
      const { data: userVenueCounts } = await supabaseClient
        .from('user_venues')
        .select('venue_id')
        .in('venue_id', venueIds);

      if (userVenueCounts) {
        for (const uv of userVenueCounts) {
          sceneUserCounts.set(uv.venue_id, (sceneUserCounts.get(uv.venue_id) || 0) + 1);
        }
      }
    }

    // 4. Get user's home coordinates for proximity biasing
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('home_latitude, home_longitude')
      .eq('id', userId)
      .single();
    
    // 5. Search Google Places API for venues
    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
    let googlePlaces: GooglePlace[] = [];

    if (GOOGLE_API_KEY) {
      try {
        // Build location bias
        let locationBias = '';
        if (profile?.home_latitude && profile?.home_longitude) {
          locationBias = `&location=${profile.home_latitude},${profile.home_longitude}&radius=50000`; // 50km radius
          console.log(`Using proximity: ${profile.home_latitude},${profile.home_longitude}`);
        }
        
        // Use Google Places Text Search for venues
        const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchTerm.trim())}+venue+bar+club${locationBias}&type=night_club|bar|restaurant&key=${GOOGLE_API_KEY}`;
        console.log(`Calling Google Places API...`);
        
        const googleResponse = await fetch(googleUrl);
        
        if (!googleResponse.ok) {
          console.error(`Google Places error: ${googleResponse.status}`);
          const errorText = await googleResponse.text();
          console.error(`Google Places error response: ${errorText}`);
        } else {
          const data = await googleResponse.json();
          
          if (data.status === 'OK' && data.results && Array.isArray(data.results)) {
            console.log(`Google Places returned ${data.results.length} results`);
            googlePlaces = data.results.slice(0, 15); // Limit to 15 results
          } else {
            console.log(`Google Places status: ${data.status}`);
          }
        }
      } catch (error) {
        console.error('Google Places error:', error);
      }
    } else {
      console.warn('GOOGLE_PLACES_API_KEY not set!');
    }

    // 6. Merge results
    const venueMap = new Map<string, VenueSuggestion>();

    // Add user's own shows first (highest priority)
    if (userShows) {
      for (const show of userShows) {
        const key = `${show.venue_name}-${show.venue_location || ''}`;
        if (!venueMap.has(key)) {
          venueMap.set(key, {
            name: show.venue_name,
            location: show.venue_location || '',
            user_show_count: 1,
            scene_users_count: 0,
          });
        } else {
          venueMap.get(key)!.user_show_count++;
        }
      }
    }

    // Add cached venues
    if (cachedVenues) {
      for (const venue of cachedVenues) {
        const key = `${venue.name}-${venue.location || ''}`;
        const sceneCount = sceneUserCounts.get(venue.id) || 0;
        
        if (!venueMap.has(key)) {
          venueMap.set(key, {
            id: venue.id,
            name: venue.name,
            location: venue.location || '',
            user_show_count: 0,
            scene_users_count: sceneCount,
          });
        } else {
          const existing = venueMap.get(key)!;
          existing.scene_users_count = Math.max(existing.scene_users_count, sceneCount);
        }
      }
    }

    // Add Google Places results
    for (const place of googlePlaces) {
      // Extract city and state from formatted_address
      const addressParts = place.formatted_address.split(', ');
      let location = '';
      
      if (addressParts.length >= 3) {
        // Format: "Venue Name, City, State ZIP, Country"
        const city = addressParts[addressParts.length - 3] || '';
        const stateZip = addressParts[addressParts.length - 2] || '';
        const state = stateZip.split(' ')[0] || ''; // Extract state from "NY 10001"
        
        if (city && state) {
          location = `${city}, ${state}`;
        } else {
          location = place.formatted_address;
        }
      } else {
        location = place.formatted_address;
      }
      
      const key = `${place.name}-${location}`;
      
      if (!venueMap.has(key)) {
        venueMap.set(key, {
          id: place.place_id,
          name: place.name,
          location: location,
          user_show_count: 0,
          scene_users_count: 0,
        });
      }
    }

    // 7. Cache new Google Places venues
    if (googlePlaces.length > 0) {
      const venuesToCache = [];
      
      for (const place of googlePlaces) {
        const addressParts = place.formatted_address.split(', ');
        const city = addressParts.length >= 3 ? addressParts[addressParts.length - 3] : '';
        const stateZip = addressParts.length >= 2 ? addressParts[addressParts.length - 2] : '';
        const state = stateZip.split(' ')[0];
        
        let location = '';
        if (city && state) {
          location = `${city}, ${state}`;
        } else {
          location = place.formatted_address;
        }

        const { data: existing } = await supabaseClient
          .from('venues')
          .select('id')
          .eq('name', place.name)
          .eq('location', location)
          .maybeSingle();

        if (!existing) {
          venuesToCache.push({
            name: place.name,
            location: location,
            city: city || null,
            latitude: place.geometry?.location?.lat || null,
            longitude: place.geometry?.location?.lng || null,
          });
        }
      }

      if (venuesToCache.length > 0) {
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('venues')
          .insert(venuesToCache)
          .select();

        if (insertData) {
          console.log(`Cached ${insertData.length} new venues`);
        } else if (insertError) {
          console.error('Cache error:', insertError);
        }
      }
    }

    // 8. Trigger background caching for discovered cities
    const discoveredCities = new Set<string>();
    for (const place of googlePlaces) {
      const addressParts = place.formatted_address.split(', ');
      const city = addressParts.length >= 3 ? addressParts[addressParts.length - 3] : '';
      if (city) {
        discoveredCities.add(city);
      }
    }

    // Launch background tasks to cache more venues in these cities
    if (GOOGLE_API_KEY && discoveredCities.size > 0) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
      const userLat = profile?.home_latitude;
      const userLon = profile?.home_longitude;

      for (const city of Array.from(discoveredCities).slice(0, 2)) { // Limit to 2 cities to avoid overload
        EdgeRuntime.waitUntil(
          cacheVenuesInCity(city, supabaseUrl, supabaseServiceKey, GOOGLE_API_KEY, userLat, userLon)
        );
      }
    }

    // 9. Sort and return - prioritize exact matches
    const searchLower = searchTerm.trim().toLowerCase();
    const suggestions = Array.from(venueMap.values()).sort((a, b) => {
      // Exact match priority
      const aExactMatch = a.name.toLowerCase() === searchLower || a.location.toLowerCase() === searchLower;
      const bExactMatch = b.name.toLowerCase() === searchLower || b.location.toLowerCase() === searchLower;
      if (aExactMatch && !bExactMatch) return -1;
      if (!aExactMatch && bExactMatch) return 1;
      
      // Starts with match priority
      const aStartsWith = a.name.toLowerCase().startsWith(searchLower) || a.location.toLowerCase().startsWith(searchLower);
      const bStartsWith = b.name.toLowerCase().startsWith(searchLower) || b.location.toLowerCase().startsWith(searchLower);
      if (aStartsWith && !bStartsWith) return -1;
      if (!aStartsWith && bStartsWith) return 1;
      
      // User's own shows priority
      if (a.user_show_count !== b.user_show_count) return b.user_show_count - a.user_show_count;
      
      // Scene users priority
      if (a.scene_users_count !== b.scene_users_count) return b.scene_users_count - a.scene_users_count;
      
      // Alphabetical
      return a.name.localeCompare(b.name);
    }).slice(0, 15);

    console.log(`Returning ${suggestions.length} suggestions`);

    return new Response(
      JSON.stringify({ suggestions }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (err) {
    const error = err as Error;
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
