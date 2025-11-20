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
  supabaseKey: string,
  jambaseApiKey: string,
  userLat?: number,
  userLon?: number
) {
  try {
    console.log(`[Background] Caching venues in ${city}...`);
    
    const params = new URLSearchParams({
      apikey: jambaseApiKey,
      city: city,
      page: '1',
      pageSize: '30', // Cache more venues in background
    });

    if (userLat && userLon) {
      params.append('geoLatitude', userLat.toString());
      params.append('geoLongitude', userLon.toString());
    }

    const response = await fetch(`https://www.jambase.com/jb-api/v1/venues?${params}`);
    
    if (!response.ok) {
      console.error(`[Background] Cache error: ${response.status}`);
      return;
    }

    const data = await response.json();
    
    if (data.venues && Array.isArray(data.venues) && data.venues.length > 0) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const venuesToCache = [];

      for (const v of data.venues) {
        const venueName = v.name;
        const venueCity = v.location?.city || '';
        const state = v.location?.state || '';
        const country = v.location?.country || 'US';
        
        let location = '';
        if (venueCity && state) {
          location = `${venueCity}, ${state}`;
        } else if (venueCity && country) {
          location = `${venueCity}, ${country}`;
        } else if (venueCity) {
          location = venueCity;
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
            country: country || null,
            latitude: v.location?.latitude ? parseFloat(v.location.latitude.toString()) : null,
            longitude: v.location?.longitude ? parseFloat(v.location.longitude.toString()) : null,
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

interface JamBaseVenue {
  name: string;
  location: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
}

interface VenueSuggestion {
  name: string;
  location: string;
  userShowCount: number;
  sceneUserCount: number;
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

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    console.log(`Searching venues for: ${searchTerm}`);

    // 1. Search user's own shows
    const { data: userShows, error: userShowsError } = await supabaseClient
      .from('shows')
      .select('venue_name, venue_location')
      .eq('user_id', userId)
      .ilike('venue_name', `%${searchTerm.trim()}%`)
      .order('venue_name');

    if (userShowsError) {
      console.error('Error fetching user shows:', userShowsError);
    } else {
      console.log(`Found ${userShows?.length || 0} user shows`);
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
    
    // 5. Search JamBase API for venues
    const JAMBASE_API_KEY = Deno.env.get('JAMBASE_API_KEY');
    let jambaseVenues: JamBaseVenue[] = [];

    if (JAMBASE_API_KEY) {
      try {
        // Build JamBase URL with search parameters
        const params = new URLSearchParams({
          apikey: JAMBASE_API_KEY,
          venueName: searchTerm.trim(),
          page: '1',
          pageSize: '15',
        });
        
        // Add location biasing if user has home coordinates
        if (profile?.home_longitude && profile?.home_latitude) {
          params.append('geoLatitude', profile.home_latitude.toString());
          params.append('geoLongitude', profile.home_longitude.toString());
          params.append('geoRadius', '100'); // 100 mile radius
          console.log(`Using proximity: ${profile.home_longitude},${profile.home_latitude}`);
        }
        
        const jambaseUrl = `https://www.jambase.com/jb-api/v1/venues?${params.toString()}`;
        console.log(`Calling JamBase API...`);
        
        const jambaseResponse = await fetch(jambaseUrl, {
          headers: {
            'Accept': 'application/json',
          }
        });
        
        if (!jambaseResponse.ok) {
          console.error(`JamBase error: ${jambaseResponse.status}`);
          const errorText = await jambaseResponse.text();
          console.error(`JamBase error response: ${errorText}`);
        } else {
          const data = await jambaseResponse.json();
          console.log(`JamBase returned ${data.venues?.length || 0} results`);

          if (data.venues && Array.isArray(data.venues)) {
            jambaseVenues = data.venues.map((venue: any) => {
              // Extract location details
              const city = venue.location?.city || '';
              const state = venue.location?.state || '';
              const country = venue.location?.country || 'US';
              
              // Build clean location string
              let location = '';
              if (city && state) {
                location = `${city}, ${state}`;
              } else if (city && country) {
                location = `${city}, ${country}`;
              } else if (city) {
                location = city;
              }

              return {
                name: venue.name || '',
                city: city,
                country: country,
                latitude: venue.location?.latitude?.toString() || '',
                longitude: venue.location?.longitude?.toString() || '',
                location: location,
                relevance: 1, // JamBase doesn't provide relevance score
                category: 'music venue',
              };
            }).filter((v: any) => v.name); // Filter out venues without names
            
            console.log(`Processed ${jambaseVenues.length} JamBase venues`);
          }
        }
      } catch (error) {
        console.error('JamBase error:', error);
      }
    } else {
      console.warn('JAMBASE_API_KEY not set!');
    }

    // 6. Merge results
    const venueMap = new Map<string, VenueSuggestion>();

    if (userShows) {
      for (const show of userShows) {
        const key = `${show.venue_name}-${show.venue_location || ''}`;
        if (!venueMap.has(key)) {
          venueMap.set(key, {
            name: show.venue_name,
            location: show.venue_location || '',
            userShowCount: 1,
            sceneUserCount: 0,
          });
        } else {
          venueMap.get(key)!.userShowCount++;
        }
      }
    }

    if (cachedVenues) {
      for (const venue of cachedVenues) {
        const key = `${venue.name}-${venue.location || ''}`;
        const sceneCount = sceneUserCounts.get(venue.id) || 0;
        
        if (!venueMap.has(key)) {
          venueMap.set(key, {
            name: venue.name,
            location: venue.location || '',
            userShowCount: 0,
            sceneUserCount: sceneCount,
          });
        } else {
          const existing = venueMap.get(key)!;
          existing.sceneUserCount = Math.max(existing.sceneUserCount, sceneCount);
        }
      }
    }

    for (const venue of jambaseVenues) {
      const key = `${venue.name}-${venue.location}`;
      
      if (!venueMap.has(key)) {
        venueMap.set(key, {
          name: venue.name,
          location: venue.location,
          userShowCount: 0,
          sceneUserCount: 0,
        });
      }
    }

    // 7. Cache new JamBase venues
    if (jambaseVenues.length > 0) {
      const venuesToCache = [];
      
      for (const venue of jambaseVenues) {
        const { data: existing } = await supabaseClient
          .from('venues')
          .select('id')
          .eq('name', venue.name)
          .eq('location', venue.location)
          .maybeSingle();

        if (!existing) {
          venuesToCache.push({
            name: venue.name,
            location: venue.location,
            city: venue.city || null,
            country: venue.country || null,
            latitude: venue.latitude ? parseFloat(venue.latitude) : null,
            longitude: venue.longitude ? parseFloat(venue.longitude) : null,
          });
        }
      }

      if (venuesToCache.length > 0) {
        const { data: insertData, error: insertError } = await supabaseClient
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
    for (const venue of jambaseVenues) {
      if (venue.city) {
        discoveredCities.add(venue.city);
      }
    }

    // Launch background tasks to cache more venues in these cities
    if (JAMBASE_API_KEY && discoveredCities.size > 0) {
      const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
      const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
      const userLat = profile?.home_latitude;
      const userLon = profile?.home_longitude;

      for (const city of Array.from(discoveredCities).slice(0, 2)) { // Limit to 2 cities to avoid overload
        EdgeRuntime.waitUntil(
          cacheVenuesInCity(city, supabaseUrl, supabaseKey, JAMBASE_API_KEY, userLat, userLon)
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
      if (a.userShowCount !== b.userShowCount) return b.userShowCount - a.userShowCount;
      
      // Scene users priority
      if (a.sceneUserCount !== b.sceneUserCount) return b.sceneUserCount - a.sceneUserCount;
      
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
