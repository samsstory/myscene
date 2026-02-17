import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// ─── Types ───────────────────────────────────────────────────────────

interface FoursquareVenue {
  fsq_id: string;
  name: string;
  location: {
    formatted_address?: string;
    locality?: string;
    region?: string;
    country?: string;
  };
  geocodes?: { main?: { latitude: number; longitude: number } };
  categories?: Array<{ id: number; name: string }>;
}

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  geometry: { location: { lat: number; lng: number } };
  types: string[];
}

interface VenueSuggestion {
  id?: string;
  name: string;
  location: string;
  user_show_count: number;
  scene_users_count: number;
  category?: string;
}

// ─── Foursquare Search ───────────────────────────────────────────────

async function searchFoursquare(
  query: string,
  showType: string,
  apiKey: string,
  lat?: number | null,
  lon?: number | null
): Promise<FoursquareVenue[]> {
  const categoryMap: Record<string, string> = {
    venue: '10032,10039,10024,10025,10030',
    festival: '16032,16000,16003,16020',
    other: '',
  };

  const categories = categoryMap[showType] || '';
  const params = new URLSearchParams({ query, limit: '20' });

  if (categories) params.set('categories', categories);
  if (lat && lon) {
    params.set('ll', `${lat},${lon}`);
    params.set('radius', '50000');
    params.set('sort', 'RELEVANCE');
  }

  const url = `https://places-api.foursquare.com/places/search?${params.toString()}`;
  console.log(`[Foursquare] Searching: ${query} (type: ${showType})`);

  try {
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'X-Places-Api-Version': '2025-06-17',
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
  } catch (error) {
    console.error('[Foursquare] Exception:', error);
    return [];
  }
}

function formatFoursquareLocation(venue: FoursquareVenue): string {
  const loc = venue.location;
  if (loc.locality && loc.region) return `${loc.locality}, ${loc.region}`;
  if (loc.locality && loc.country) return `${loc.locality}, ${loc.country}`;
  return loc.formatted_address || loc.locality || '';
}

// ─── Google Places Search (fallback) ─────────────────────────────────

async function searchGooglePlaces(
  query: string,
  showType: string,
  apiKey: string,
  lat?: number | null,
  lon?: number | null
): Promise<GooglePlace[]> {
  let searchQuery = query;
  if (showType === 'festival') searchQuery = `${query} festival`;

  let locationBias = '';
  if (lat && lon) locationBias = `&location=${lat},${lon}&radius=50000`;

  const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchQuery)}${locationBias}&key=${apiKey}`;
  console.log(`[Google] Searching: ${searchQuery}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Google] Error ${response.status}: ${errorText}`);
      return [];
    }

    const data = await response.json();
    if (data.status !== 'OK' || !data.results) {
      console.log(`[Google] Status: ${data.status}`);
      return [];
    }

    // Filter out irrelevant results
    const excludeKeywords = [
      'floral', 'flower', 'wholesale', 'retail', 'shop', 'store',
      'salon', 'spa', 'hotel', 'motel', 'apartment', 'real estate',
      'dentist', 'doctor', 'clinic', 'hospital', 'pharmacy',
      'bank', 'atm', 'insurance', 'lawyer', 'school', 'church'
    ];

    const filtered = data.results.filter((place: any) => {
      const combined = `${place.name} ${place.types?.join(' ')}`.toLowerCase();
      return !excludeKeywords.some(kw => combined.includes(kw));
    });

    console.log(`[Google] Filtered to ${filtered.length} results`);
    return filtered.slice(0, 15);
  } catch (error) {
    console.error('[Google] Exception:', error);
    return [];
  }
}

function formatGoogleLocation(place: GooglePlace): string {
  const parts = place.formatted_address.split(', ');
  if (parts.length >= 3) {
    const city = parts[parts.length - 3] || '';
    const stateZip = parts[parts.length - 2] || '';
    const state = stateZip.split(' ')[0] || '';
    if (city && state) return `${city}, ${state}`;
  }
  return place.formatted_address;
}

// ─── Main Handler ────────────────────────────────────────────────────

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
      }
    } catch (err) {
      console.error('Exception fetching user shows:', err);
    }

    // 2. Search cached venues
    const { data: cachedVenues } = await supabaseClient
      .from('venues')
      .select('id, name, location, city, country')
      .ilike('name', `%${searchTerm.trim()}%`)
      .limit(10);

    // 3. Scene user counts
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

    // 4. User's home coordinates
    const { data: profile } = await supabaseClient
      .from('profiles')
      .select('home_latitude, home_longitude')
      .eq('id', userId)
      .single();

    const lat = profile?.home_latitude;
    const lon = profile?.home_longitude;
    const type = showType || 'venue';

    // 5. Search external APIs in parallel (Foursquare primary + Google fallback)
    const FOURSQUARE_KEY = Deno.env.get('FOURSQUARE_API_KEY');
    const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

    const [foursquareResults, googleResults] = await Promise.all([
      FOURSQUARE_KEY ? searchFoursquare(searchTerm.trim(), type, FOURSQUARE_KEY, lat, lon) : Promise.resolve([]),
      GOOGLE_KEY ? searchGooglePlaces(searchTerm.trim(), type, GOOGLE_KEY, lat, lon) : Promise.resolve([]),
    ]);

    // 6. Merge all results
    const venueMap = new Map<string, VenueSuggestion>();

    // User's own shows (highest priority)
    for (const show of userShows) {
      const key = `${show.venue_name}-${show.venue_location || ''}`.toLowerCase();
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

    // Cached venues
    if (cachedVenues) {
      for (const venue of cachedVenues) {
        const key = `${venue.name}-${venue.location || ''}`.toLowerCase();
        const sceneCount = sceneUserCounts.get(venue.id) || 0;
        if (!venueMap.has(key)) {
          venueMap.set(key, {
            id: venue.id, name: venue.name, location: venue.location || '',
            user_show_count: 0, scene_users_count: sceneCount,
          });
        } else {
          venueMap.get(key)!.scene_users_count = Math.max(venueMap.get(key)!.scene_users_count, sceneCount);
        }
      }
    }

    // Foursquare results
    for (const place of foursquareResults) {
      const location = formatFoursquareLocation(place);
      const key = `${place.name}-${location}`.toLowerCase();
      if (!venueMap.has(key)) {
        venueMap.set(key, {
          id: place.fsq_id, name: place.name, location,
          user_show_count: 0, scene_users_count: 0,
          category: place.categories?.[0]?.name || '',
        });
      }
    }

    // Google results (fills gaps Foursquare misses)
    for (const place of googleResults) {
      const location = formatGoogleLocation(place);
      const key = `${place.name}-${location}`.toLowerCase();
      if (!venueMap.has(key)) {
        venueMap.set(key, {
          id: place.place_id, name: place.name, location,
          user_show_count: 0, scene_users_count: 0,
        });
      }
    }

    // 7. Cache new venues from both sources
    const allExternalVenues = [
      ...foursquareResults.map(p => ({
        name: p.name,
        location: formatFoursquareLocation(p),
        city: p.location.locality || null,
        country: p.location.country || null,
        latitude: p.geocodes?.main?.latitude || null,
        longitude: p.geocodes?.main?.longitude || null,
      })),
      ...googleResults.map(p => ({
        name: p.name,
        location: formatGoogleLocation(p),
        city: null,
        country: null,
        latitude: p.geometry?.location?.lat || null,
        longitude: p.geometry?.location?.lng || null,
      })),
    ];

    const venuesToCache = [];
    for (const v of allExternalVenues) {
      const { data: existing } = await supabaseClient
        .from('venues')
        .select('id')
        .eq('name', v.name)
        .eq('location', v.location)
        .maybeSingle();

      if (!existing && v.name) venuesToCache.push(v);
    }

    if (venuesToCache.length > 0) {
      const { data: inserted, error: insertErr } = await supabaseAdmin
        .from('venues')
        .insert(venuesToCache)
        .select();
      if (inserted) console.log(`Cached ${inserted.length} new venues`);
      if (insertErr) console.error('Cache error:', insertErr);
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
