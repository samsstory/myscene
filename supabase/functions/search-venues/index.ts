import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface FoursquareVenue {
  fsq_id: string;
  name: string;
  location: {
    formatted_address?: string;
    locality?: string;
    region?: string;
    country?: string;
    address?: string;
  };
  geocodes?: {
    main?: {
      latitude: number;
      longitude: number;
    };
  };
  categories?: Array<{
    id: number;
    name: string;
  }>;
}

interface VenueSuggestion {
  id?: string;
  name: string;
  location: string;
  user_show_count: number;
  scene_users_count: number;
  category?: string;
}

async function searchFoursquare(
  query: string,
  showType: string,
  apiKey: string,
  lat?: number | null,
  lon?: number | null
): Promise<FoursquareVenue[]> {
  // Foursquare category IDs for music/entertainment
  const categoryMap: Record<string, string> = {
    venue: '10032,10039,10024,10025,10030', // Music Venue, Nightclub, Concert Hall, Bar, Performing Arts
    festival: '16032,16000,16003,16020',     // Festival, Event, Fair, Outdoor Event
    other: '',                                // No category filter
  };

  const categories = categoryMap[showType] || '';
  
  const params = new URLSearchParams({
    query,
    limit: '20',
  });

  if (categories) {
    params.set('categories', categories);
  }

  if (lat && lon) {
    params.set('ll', `${lat},${lon}`);
    params.set('radius', '50000'); // 50km bias
    params.set('sort', 'RELEVANCE');
  }

  const url = `https://api.foursquare.com/v3/places/search?${params.toString()}`;
  console.log(`[Foursquare] Searching: ${query} (type: ${showType})`);

  const response = await fetch(url, {
    headers: {
      'Authorization': apiKey,
      'Accept': 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error(`[Foursquare] Error ${response.status}: ${errorText}`);
    return [];
  }

  const data = await response.json();
  console.log(`[Foursquare] Returned ${data.results?.length || 0} results`);
  return data.results || [];
}

function formatFoursquareLocation(venue: FoursquareVenue): string {
  const loc = venue.location;
  if (loc.locality && loc.region) {
    return `${loc.locality}, ${loc.region}`;
  }
  if (loc.locality && loc.country) {
    return `${loc.locality}, ${loc.country}`;
  }
  return loc.formatted_address || loc.locality || '';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm, showType } = await req.json();

    if (!searchTerm || searchTerm.trim().length < 2) {
      return new Response(
        JSON.stringify({ error: 'Search term must be at least 2 characters' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userId = user.id;
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log(`Searching venues for: ${searchTerm}`);

    // 1. Search user's own shows
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
        userShows = data.filter((show: any) => {
          const venueName = show.venue_name.toLowerCase();
          return searchWords.some((word: string) => venueName.includes(word));
        });
        console.log(`Found ${userShows.length} user shows`);
      }
    } catch (err) {
      console.error('Exception fetching user shows:', err);
    }

    // 2. Search cached venues in DB
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

    // 5. Search Foursquare Places API
    const FOURSQUARE_API_KEY = Deno.env.get('FOURSQUARE_API_KEY');
    let foursquarePlaces: FoursquareVenue[] = [];

    if (FOURSQUARE_API_KEY) {
      try {
        foursquarePlaces = await searchFoursquare(
          searchTerm.trim(),
          showType || 'venue',
          FOURSQUARE_API_KEY,
          profile?.home_latitude,
          profile?.home_longitude
        );
      } catch (error) {
        console.error('Foursquare search error:', error);
      }
    } else {
      console.warn('FOURSQUARE_API_KEY not set!');
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

    // Add Foursquare results
    for (const place of foursquarePlaces) {
      const location = formatFoursquareLocation(place);
      const key = `${place.name}-${location}`;
      const categoryName = place.categories?.[0]?.name || '';
      
      if (!venueMap.has(key)) {
        venueMap.set(key, {
          id: place.fsq_id,
          name: place.name,
          location,
          user_show_count: 0,
          scene_users_count: 0,
          category: categoryName,
        });
      }
    }

    // 7. Cache new Foursquare venues in background
    if (foursquarePlaces.length > 0) {
      const venuesToCache = [];
      
      for (const place of foursquarePlaces) {
        const location = formatFoursquareLocation(place);
        const city = place.location.locality || null;

        const { data: existing } = await supabaseClient
          .from('venues')
          .select('id')
          .eq('name', place.name)
          .eq('location', location)
          .maybeSingle();

        if (!existing) {
          venuesToCache.push({
            name: place.name,
            location,
            city,
            country: place.location.country || null,
            latitude: place.geocodes?.main?.latitude || null,
            longitude: place.geocodes?.main?.longitude || null,
          });
        }
      }

      if (venuesToCache.length > 0) {
        const { data: insertData, error: insertError } = await supabaseAdmin
          .from('venues')
          .insert(venuesToCache)
          .select();

        if (insertData) {
          console.log(`Cached ${insertData.length} new venues from Foursquare`);
        } else if (insertError) {
          console.error('Cache error:', insertError);
        }
      }
    }

    // 8. Sort and return
    const searchLower = searchTerm.trim().toLowerCase();
    const suggestions = Array.from(venueMap.values()).sort((a, b) => {
      const aExact = a.name.toLowerCase() === searchLower;
      const bExact = b.name.toLowerCase() === searchLower;
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      const aStarts = a.name.toLowerCase().startsWith(searchLower);
      const bStarts = b.name.toLowerCase().startsWith(searchLower);
      if (aStarts && !bStarts) return -1;
      if (!aStarts && bStarts) return 1;
      
      if (a.user_show_count !== b.user_show_count) return b.user_show_count - a.user_show_count;
      if (a.scene_users_count !== b.scene_users_count) return b.scene_users_count - a.scene_users_count;
      
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
