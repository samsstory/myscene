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
  types?: string[];
}

// ─── Category Whitelists ─────────────────────────────────────────────

const relevantCategoryKeywords = [
  'music', 'venue', 'amphitheater', 'amphitheatre', 'theater', 'theatre',
  'arena', 'stadium', 'nightclub', 'club', 'bar', 'lounge', 'concert',
  'festival', 'fairground', 'park', 'pavilion', 'event', 'convention',
  'hall', 'auditorium', 'ballroom', 'brewery', 'winery', 'rooftop',
  'garden', 'pier', 'plaza', 'pub', 'tavern', 'pool', 'beach', 'resort',
  'casino', 'hotel', 'civic center', 'coliseum', 'colosseum', 'field',
  'racetrack', 'raceway', 'hippodrome', 'rock club', 'performance',
  'entertainment', 'dance', 'disco', 'opera', 'jazz', 'comedy',
  'karaoke', 'outdoor', 'recreation', 'social', 'live',
];

const relevantGoogleTypes = new Set([
  'night_club', 'bar', 'stadium', 'performing_arts_theater', 'park',
  'event_venue', 'tourist_attraction', 'amusement_park', 'convention_center',
  'casino', 'cultural_center', 'movie_theater', 'bowling_alley',
  'community_center', 'campground', 'lodge', 'resort_hotel', 'hotel',
  'church', 'museum', 'art_gallery', 'zoo', 'aquarium',
]);

const musicCategoryKeywords = new Set([
  'music', 'amphitheater', 'amphitheatre', 'concert', 'nightclub',
  'arena', 'stadium', 'rock club', 'live', 'jazz', 'opera', 'dance',
  'disco', 'karaoke',
]);

const entertainmentCategoryKeywords = new Set([
  'bar', 'theater', 'theatre', 'lounge', 'park', 'festival', 'event',
  'pub', 'brewery', 'fairground', 'pavilion', 'ballroom', 'hall',
  'auditorium', 'comedy', 'performance', 'entertainment', 'convention',
  'winery', 'rooftop', 'garden', 'casino', 'resort', 'recreation',
]);

// ─── Category Helpers ────────────────────────────────────────────────

function isRelevantFoursquareVenue(venue: FoursquareVenue, searchLower: string): boolean {
  // Always allow strong name matches
  const nameLower = venue.name.toLowerCase();
  if (nameLower.startsWith(searchLower) || nameLower === searchLower) return true;

  // Check if any category matches the whitelist
  if (!venue.categories || venue.categories.length === 0) return false;
  return venue.categories.some(cat => {
    const catLower = cat.name.toLowerCase();
    return relevantCategoryKeywords.some(kw => catLower.includes(kw));
  });
}

function isRelevantGooglePlace(place: GooglePlace, searchLower: string): boolean {
  // Always allow strong name matches
  const nameLower = place.name.toLowerCase();
  if (nameLower.startsWith(searchLower) || nameLower === searchLower) return true;

  // Check if any type matches the whitelist
  if (!place.types || place.types.length === 0) return false;
  return place.types.some(t => relevantGoogleTypes.has(t));
}

function getCategoryBonus(category?: string, types?: string[], venueName?: string): number {
  // Check venue name for music keywords (helps cached venues without category)
  if (venueName) {
    const nl = venueName.toLowerCase();
    const musicNameKeywords = ['amphitheater', 'amphitheatre', 'arena', 'stadium', 'coliseum',
      'concert hall', 'music hall', 'nightclub', 'dance hall'];
    const entNameKeywords = ['theater', 'theatre', 'ballroom', 'auditorium', 'pavilion',
      'fairgrounds', 'convention center', 'civic center'];
    if (musicNameKeywords.some(kw => nl.includes(kw))) return 15;
    if (entNameKeywords.some(kw => nl.includes(kw))) return 10;
  }
  // Check Foursquare category
  if (category) {
    const catLower = category.toLowerCase();
    for (const kw of musicCategoryKeywords) {
      if (catLower.includes(kw)) return 15;
    }
    for (const kw of entertainmentCategoryKeywords) {
      if (catLower.includes(kw)) return 10;
    }
  }
  // Check Google types
  if (types) {
    const musicTypes = new Set(['night_club', 'stadium', 'performing_arts_theater']);
    const entertainmentTypes = new Set(['bar', 'event_venue', 'amusement_park', 'casino', 'cultural_center']);
    if (types.some(t => musicTypes.has(t))) return 15;
    if (types.some(t => entertainmentTypes.has(t))) return 10;
  }
  return 0;
}

// ─── Foursquare Search ───────────────────────────────────────────────

async function searchFoursquare(
  query: string,
  showType: string,
  apiKey: string,
  lat?: number | null,
  lon?: number | null
): Promise<FoursquareVenue[]> {
  const params = new URLSearchParams({ query, limit: '15' });

  if (lat && lon) {
    params.set('ll', `${lat},${lon}`);
    params.set('radius', '100000');
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
  // Prefer the full formatted address (e.g. "34 NE 11th St, Miami, FL 33132")
  if (loc.formatted_address) return loc.formatted_address;
  if (loc.locality && loc.region) return `${loc.locality}, ${loc.region}`;
  if (loc.locality && loc.country) return `${loc.locality}, ${loc.country}`;
  return loc.locality || '';
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
  if (showType === 'festival') {
    searchQuery = `${query} festival`;
  } else if (showType === 'showcase') {
    searchQuery = `${query} event night`;
  } else {
    searchQuery = `${query} music venue`;
  }

  console.log(`[Google] Searching: ${searchQuery}`);

  try {
    const body: any = { textQuery: searchQuery, maxResultCount: 15 };

    if (lat && lon) {
      body.locationBias = {
        circle: { center: { latitude: lat, longitude: lon }, radius: 50000 }
      };
    }

    const response = await fetch('https://places.googleapis.com/v1/places:searchText', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey,
        'X-Goog-FieldMask': 'places.id,places.displayName,places.formattedAddress,places.location,places.types',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`[Google] Error ${response.status}: ${errorText}`);
      return [];
    }

    const data = await response.json();
    const places = data.places || [];
    console.log(`[Google] Returned ${places.length} results`);

    return places.map((p: any) => ({
      place_id: p.id || '',
      name: p.displayName?.text || '',
      formatted_address: p.formattedAddress || '',
      geometry: { location: { lat: p.location?.latitude || 0, lng: p.location?.longitude || 0 } },
      types: p.types || [],
    }));
  } catch (error) {
    console.error('[Google] Exception:', error);
    return [];
  }
}

function formatGoogleLocation(place: GooglePlace): string {
  // Return the full formatted address (e.g. "34 NE 11th St, Miami, FL 33132, United States")
  return place.formatted_address || '';
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

    const searchLower = searchTerm.trim().toLowerCase();
    console.log(`Searching venues for: ${searchTerm}`);

    // 1. Search user's own shows
    const searchWords = searchLower.split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'at', 'in', 'of', 'and', 'or', 'to']);
    const meaningfulSearchWords = searchWords.filter(w => !stopWords.has(w));
    const wordsForFilter = meaningfulSearchWords.length > 0 ? meaningfulSearchWords : searchWords;
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
          return wordsForFilter.some((word: string) => venueName.includes(word));
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

    // 5. Search external APIs in parallel
    const FOURSQUARE_KEY = Deno.env.get('FOURSQUARE_API_KEY');
    const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');

    const [foursquareResults, googleResults] = await Promise.all([
      FOURSQUARE_KEY ? searchFoursquare(searchTerm.trim(), type, FOURSQUARE_KEY, lat, lon) : Promise.resolve([]),
      GOOGLE_KEY ? searchGooglePlaces(searchTerm.trim(), type, GOOGLE_KEY, lat, lon) : Promise.resolve([]),
    ]);

    // 6. Filter external results by category whitelist
    const filteredFoursquare = foursquareResults.filter(v => isRelevantFoursquareVenue(v, searchLower));
    const filteredGoogle = googleResults.filter(p => isRelevantGooglePlace(p, searchLower));

    console.log(`[Filter] Foursquare: ${foursquareResults.length} → ${filteredFoursquare.length} | Google: ${googleResults.length} → ${filteredGoogle.length}`);

    // 7. Merge all results
    const venueMap = new Map<string, VenueSuggestion>();

    // User's own shows (highest priority, no filtering)
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

    // Cached venues (no filtering)
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

    // Filtered Foursquare results
    for (const place of filteredFoursquare) {
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

    // Filtered Google results
    for (const place of filteredGoogle) {
      const location = formatGoogleLocation(place);
      const key = `${place.name}-${location}`.toLowerCase();
      if (!venueMap.has(key)) {
        venueMap.set(key, {
          id: place.place_id, name: place.name, location,
          user_show_count: 0, scene_users_count: 0,
          types: place.types,
        });
      }
    }

    // 8. Cache only whitelisted venues
    const allExternalVenues = [
      ...filteredFoursquare.map(p => ({
        name: p.name,
        location: formatFoursquareLocation(p),
        city: p.location.locality || null,
        country: p.location.country || null,
        latitude: p.geocodes?.main?.latitude || null,
        longitude: p.geocodes?.main?.longitude || null,
      })),
      ...filteredGoogle.map(p => ({
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

    // 9. Sort with category-aware scoring
    const sortWords = searchLower.split(/\s+/);

    const abbrevMap: Record<string, string[]> = {
      'nyc': ['new york', 'ny'], 'la': ['los angeles'], 'sf': ['san francisco'],
      'dc': ['washington'], 'philly': ['philadelphia'], 'atl': ['atlanta'],
      'msg': ['madison square garden'], 'o2': ['o2 arena'],
      'ubs': ['ubs arena'], 'bmo': ['bmo stadium'],
    };

    function relevanceScore(v: VenueSuggestion): number {
      const nameLower = v.name.toLowerCase();
      const locLower = (v.location || '').toLowerCase();
      const combined = `${nameLower} ${locLower}`;
      let base = 0;
      const catBonus = getCategoryBonus(v.category, v.types, v.name);

      if (nameLower === searchLower) base = 100;
      else if (nameLower.startsWith(searchLower)) base = 92;
      else {
        let matchCount = 0;
        for (const word of sortWords) {
          if (combined.includes(word)) { matchCount++; }
          else {
            const expansions = abbrevMap[word];
            if (expansions && expansions.some(exp => combined.includes(exp))) matchCount++;
          }
        }
        if (matchCount === sortWords.length) base = 80;
        else base = (matchCount / sortWords.length) * 60;
      }

      // Category bonus
      base += catBonus;

      return base;
    }

    // Filter: for external results, name must contain at least one meaningful search word
    const fillerWords = new Set(['the', 'a', 'an', 'at', 'in', 'of', 'and', 'or', 'to']);
    const meaningfulWords = sortWords.filter(w => !fillerWords.has(w));
    const requiredWords = meaningfulWords.length > 0 ? meaningfulWords : sortWords;

    const suggestions = Array.from(venueMap.values())
      .filter(v => {
        // Always keep user shows and scene venues
        if (v.user_show_count > 0 || v.scene_users_count > 0) return true;
        // For external results, ALL meaningful words must match in name+location
        const nameLower = v.name.toLowerCase();
        const locLower = (v.location || '').toLowerCase();
        const combined = `${nameLower} ${locLower}`;
        const allMatch = requiredWords.every(w => {
          const expansions = abbrevMap[w];
          // If word has expansions (it's an abbreviation), only match on expansions
          if (expansions) return expansions.some(exp => combined.includes(exp));
          return combined.includes(w);
        });
        if (!allMatch) return false;
        // At least one meaningful word must be in the name itself (not just location)
        return requiredWords.some(w => {
          const expansions = abbrevMap[w];
          if (expansions) return expansions.some(exp => nameLower.includes(exp));
          return nameLower.includes(w);
        });
      })
      .sort((a, b) => {
        if (a.user_show_count !== b.user_show_count) return b.user_show_count - a.user_show_count;
        const aScore = relevanceScore(a);
        const bScore = relevanceScore(b);
        if (aScore !== bScore) return bScore - aScore;
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
