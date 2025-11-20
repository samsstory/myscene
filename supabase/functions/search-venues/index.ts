import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface MapboxVenue {
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

    // 4. Search Mapbox Geocoding API
    const MAPBOX_API_KEY = Deno.env.get('MAPBOX_API_KEY');
    let mapboxVenues: MapboxVenue[] = [];

    if (MAPBOX_API_KEY) {
      try {
        const mapboxUrl = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchTerm.trim())}.json?access_token=${MAPBOX_API_KEY}&types=poi,address&limit=10`;
        console.log(`Calling Mapbox API...`);
        
        const mapboxResponse = await fetch(mapboxUrl);
        
        if (!mapboxResponse.ok) {
          console.error(`Mapbox error: ${mapboxResponse.status}`);
        } else {
          const data = await mapboxResponse.json();
          console.log(`Mapbox returned ${data.features?.length || 0} results`);

          if (data.features && Array.isArray(data.features)) {
            mapboxVenues = data.features.map((feature: any) => {
              let city = '';
              let country = '';
              
              if (feature.context) {
                for (const ctx of feature.context) {
                  if (ctx.id.startsWith('place.')) city = ctx.text;
                  if (ctx.id.startsWith('country.')) country = ctx.text;
                }
              }

              return {
                name: feature.text || feature.place_name,
                city: city,
                country: country,
                latitude: feature.center?.[1]?.toString() || '',
                longitude: feature.center?.[0]?.toString() || '',
                location: feature.place_name || `${city}, ${country}`.trim(),
              };
            });
            console.log(`Processed ${mapboxVenues.length} Mapbox venues`);
          }
        }
      } catch (error) {
        console.error('Mapbox error:', error);
      }
    } else {
      console.warn('MAPBOX_API_KEY not set!');
    }

    // 5. Merge results
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

    for (const venue of mapboxVenues) {
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

    // 6. Cache new Mapbox venues
    if (mapboxVenues.length > 0) {
      const venuesToCache = [];
      
      for (const venue of mapboxVenues) {
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

    // 7. Sort and return - prioritize exact matches
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
