import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

interface UnifiedSearchResult {
  type: 'artist' | 'venue';
  id: string;
  name: string;
  subtitle?: string;
  imageUrl?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  userShowCount?: number;
  sceneUsersCount?: number;
  tier?: 'primary' | 'other';
  eventId?: string;
  eventType?: string;
  venueName?: string;
}

/** Spotify artist from search API */
interface SpotifyArtistResult {
  id: string;
  name: string;
  imageUrl?: string;
  genres?: string[];
}

/** Raw Spotify artist from their API */
interface SpotifyArtistRaw {
  id: string;
  name: string;
  images?: Array<{ url: string }>;
  genres?: string[];
}

/** Google Places v2 response shape */
interface GooglePlaceV2 {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
  types?: string[];
}

// ─── Category Whitelists (ported from search-venues) ─────────────────

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

// ─── Spotify Circuit Breaker ─────────────────────────────────────────
// Module-level state survives across requests within the same isolate.
// When Spotify returns 429, we store the block-until timestamp and skip
// all Spotify calls until it expires — no retries, no wasted time.

let spotifyBlockedUntil = 0; // epoch ms — 0 means not blocked

function isSpotifyBlocked(): boolean {
  return Date.now() < spotifyBlockedUntil;
}

function tripSpotifyBreaker(retryAfterHeader: string | null) {
  const retryAfterSec = parseInt(retryAfterHeader || '30', 10);
  const cappedSec = Math.min(Math.max(retryAfterSec, 5), 120);
  spotifyBlockedUntil = Date.now() + cappedSec * 1000;
  console.log(`[unified-search] Spotify circuit breaker TRIPPED — blocked for ${cappedSec}s (until ${new Date(spotifyBlockedUntil).toISOString()})`);
}

// ─── Spotify Auth ────────────────────────────────────────────────────

let spotifyToken: string | null = null;
let tokenExpiry = 0;

async function getSpotifyToken(): Promise<string> {
  if (spotifyToken && Date.now() < tokenExpiry) return spotifyToken;

  const clientId = Deno.env.get('SPOTIFY_CLIENT_ID');
  const clientSecret = Deno.env.get('SPOTIFY_CLIENT_SECRET');
  if (!clientId || !clientSecret) throw new Error('Spotify credentials not configured');

  const resp = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!resp.ok) throw new Error(`Spotify auth failed: ${resp.status}`);
  const data = await resp.json();
  spotifyToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;
  return spotifyToken!;
}

// ─── Venue Filtering Helpers ─────────────────────────────────────────

interface GooglePlace {
  place_id: string;
  name: string;
  formatted_address: string;
  types: string[];
  latitude?: number;
  longitude?: number;
}

interface FoursquareVenue {
  fsq_id: string;
  name: string;
  location: { formatted_address?: string; locality?: string; region?: string; country?: string };
  geocodes?: { main?: { latitude: number; longitude: number } };
  categories?: Array<{ id: number; name: string }>;
}

function isRelevantGooglePlace(place: GooglePlace, searchLower: string): boolean {
  const nameLower = place.name.toLowerCase();
  if (nameLower.startsWith(searchLower) || nameLower === searchLower) return true;
  if (!place.types || place.types.length === 0) return false;
  return place.types.some(t => relevantGoogleTypes.has(t));
}

function isRelevantFoursquareVenue(venue: FoursquareVenue, searchLower: string): boolean {
  const nameLower = venue.name.toLowerCase();
  if (nameLower.startsWith(searchLower) || nameLower === searchLower) return true;
  if (!venue.categories || venue.categories.length === 0) return false;
  return venue.categories.some(cat => {
    const catLower = cat.name.toLowerCase();
    return relevantCategoryKeywords.some(kw => catLower.includes(kw));
  });
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

function formatFoursquareLocation(venue: FoursquareVenue): string {
  const loc = venue.location;
  if (loc.locality && loc.region) return `${loc.locality}, ${loc.region}`;
  if (loc.locality && loc.country) return `${loc.locality}, ${loc.country}`;
  return loc.formatted_address || loc.locality || '';
}

// ─── Main Handler ────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm, searchType } = await req.json();
    // searchType: 'artist' | 'venue' | undefined (undefined = search all)

    if (!searchTerm || searchTerm.trim().length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let supabaseClient: SupabaseClient | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          { global: { headers: { Authorization: authHeader } } }
        );
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        if (!authError && user) {
          userId = user.id;
        } else {
          supabaseClient = null;
        }
      } catch (e) {
        supabaseClient = null;
      }
    }

    console.log(`[unified-search] Searching for: ${searchTerm}`);

    const results: UnifiedSearchResult[] = [];
    const searchLower = searchTerm.trim().toLowerCase();

    // Get user home coordinates for location bias
    let lat: number | null = null;
    let lon: number | null = null;
    if (userId && supabaseClient) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('home_latitude, home_longitude')
        .eq('id', userId)
        .single();
      if (profile?.home_latitude && profile?.home_longitude) {
        lat = profile.home_latitude;
        lon = profile.home_longitude;
      }
    }

    const wantArtists = searchType !== 'venue';
    const wantVenues = searchType !== 'artist';

    const [artistResults, venueResults, userShowsResults, eventResults] = await Promise.all([
      wantArtists ? searchSpotify(searchTerm) : Promise.resolve([]),
      wantVenues ? searchVenues(searchTerm.trim(), searchLower, lat, lon) : Promise.resolve({ primary: [], other: [] }),
      userId && supabaseClient ? searchUserHistory(searchTerm, userId, supabaseClient) : Promise.resolve({ artists: [], venues: [] }),
      wantVenues && supabaseClient ? searchEvents(searchTerm, supabaseClient) : Promise.resolve([]),
    ]);

    // Add user's own artists first (highest priority)
    if (userShowsResults.artists.length > 0) {
      for (const artist of userShowsResults.artists.slice(0, 3)) {
        const spotifyMatch = artistResults.find(
          (s) => s.name.toLowerCase() === artist.name.toLowerCase()
        );
        results.push({
          type: 'artist',
          id: `user-artist-${artist.name}`,
          name: artist.name,
          subtitle: `You've seen ${artist.count} time${artist.count !== 1 ? 's' : ''}`,
          imageUrl: spotifyMatch?.imageUrl || undefined,
        });
      }
    }

    // Add Spotify artists
    for (const artist of artistResults.slice(0, 5)) {
      if (results.some(r => r.type === 'artist' && r.name.toLowerCase() === artist.name.toLowerCase())) {
        continue;
      }
      results.push({
        type: 'artist',
        id: artist.id,
        name: artist.name,
        subtitle: artist.genres?.join(', ') || undefined,
        imageUrl: artist.imageUrl || undefined,
      });
    }

    // Add user's own venues first (always primary tier)
    if (userShowsResults.venues.length > 0) {
      for (const venue of userShowsResults.venues.slice(0, 3)) {
        results.push({
          type: 'venue',
          id: venue.id || `user-venue-${venue.name}`,
          name: venue.name,
          location: venue.location,
          userShowCount: venue.count,
          tier: 'primary',
        });
      }
    }

    // Add event registry results (before external venues)
    for (const event of eventResults) {
      if (results.some(r => r.type === 'venue' && r.name.toLowerCase() === event.name.toLowerCase())) {
        continue;
      }
      results.push(event);
    }

    // Add primary tier venues
    for (const venue of venueResults.primary.slice(0, 10)) {
      if (results.some(r => r.type === 'venue' && r.name.toLowerCase() === venue.name.toLowerCase())) {
        continue;
      }
      results.push({
        type: 'venue',
        id: venue.id,
        name: venue.name,
        location: venue.location,
        latitude: venue.latitude,
        longitude: venue.longitude,
        tier: 'primary',
      });
    }

    // Add other tier venues
    for (const venue of venueResults.other.slice(0, 8)) {
      if (results.some(r => r.type === 'venue' && r.name.toLowerCase() === venue.name.toLowerCase())) {
        continue;
      }
      results.push({
        type: 'venue',
        id: venue.id,
        name: venue.name,
        location: venue.location,
        latitude: venue.latitude,
        longitude: venue.longitude,
        tier: 'other',
      });
    }

    // Sort results: exact matches first, then user items, keeping tier grouping
    results.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      if (aName === searchLower && bName !== searchLower) return -1;
      if (bName === searchLower && aName !== searchLower) return 1;
      const aStarts = aName.startsWith(searchLower);
      const bStarts = bName.startsWith(searchLower);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      const aUserItem = a.userShowCount && a.userShowCount > 0;
      const bUserItem = b.userShowCount && b.userShowCount > 0;
      if (aUserItem && !bUserItem) return -1;
      if (bUserItem && !aUserItem) return 1;
      return 0;
    });

    const spotifyUnavailable = isSpotifyBlocked();
    console.log(`[unified-search] Returning ${results.length} results (primary venues: ${venueResults.primary.length}, other: ${venueResults.other.length}, spotifyUnavailable: ${spotifyUnavailable})`);

    return new Response(
      JSON.stringify({ results, spotifyUnavailable }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[unified-search] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error', results: [] }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

// ─── Spotify Search ──────────────────────────────────────────────────

async function searchSpotify(searchTerm: string): Promise<SpotifyArtistResult[]> {
  // Circuit breaker: skip Spotify entirely if we're rate-limited
  if (isSpotifyBlocked()) {
    console.log('[unified-search] Spotify circuit breaker OPEN — skipping, using local DB');
    return await searchLocalArtists(searchTerm);
  }

  const doFetch = async (token: string) => {
    return fetch(
      `https://api.spotify.com/v1/search?q=${encodeURIComponent(searchTerm)}&type=artist&limit=8`,
      { headers: { 'Authorization': `Bearer ${token}` } }
    );
  };

  try {
    let token = await getSpotifyToken();
    let response = await doFetch(token);

    // Handle 429 rate limit — trip circuit breaker, no retry
    if (response.status === 429) {
      tripSpotifyBreaker(response.headers.get('Retry-After'));
      await response.text(); // consume body
      return await searchLocalArtists(searchTerm);
    }

    // Handle 401 — token may have expired, refresh and retry once
    if (response.status === 401) {
      spotifyToken = null;
      tokenExpiry = 0;
      token = await getSpotifyToken();
      response = await doFetch(token);
    }

    if (response.status === 429) {
      tripSpotifyBreaker(response.headers.get('Retry-After'));
      await response.text();
      return await searchLocalArtists(searchTerm);
    }

    if (!response.ok) {
      console.error('[unified-search] Spotify error:', response.status);
      await response.text();
      return await searchLocalArtists(searchTerm);
    }

    const data = await response.json();
    return (data.artists?.items || []).map((artist: SpotifyArtistRaw) => ({
      id: artist.id,
      name: artist.name,
      imageUrl: artist.images?.[artist.images.length > 1 ? 1 : 0]?.url || null,
      genres: artist.genres?.slice(0, 2) || [],
    }));
  } catch (error) {
    console.error('[unified-search] Spotify error:', error);
    return await searchLocalArtists(searchTerm);
  }
}

async function searchLocalArtists(searchTerm: string): Promise<SpotifyArtistResult[]> {
  try {
    console.log('[unified-search] Falling back to local artists DB');
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const { data } = await supabaseAdmin
      .from('artists')
      .select('id, name, image_url, genres, spotify_artist_id')
      .ilike('name', `%${searchTerm.trim()}%`)
      .limit(8);
    return (data || []).map((a: { id: string; name: string; image_url: string | null; genres: string[] | null; spotify_artist_id: string | null }) => ({
      id: a.spotify_artist_id || a.id,
      name: a.name,
      imageUrl: a.image_url || null,
      genres: a.genres?.slice(0, 2) || [],
    }));
  } catch (e) {
    console.error('[unified-search] Local artist fallback failed:', e);
    return [];
  }
}

// ─── Venue Search (Google + Foursquare, tiered) ──────────────────────

interface TieredVenue {
  id: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
}

async function searchVenues(
  searchTerm: string,
  searchLower: string,
  lat: number | null,
  lon: number | null
): Promise<{ primary: TieredVenue[]; other: TieredVenue[] }> {
  const GOOGLE_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
  const FOURSQUARE_KEY = Deno.env.get('FOURSQUARE_API_KEY');

  const [googlePlaces, foursquareVenues] = await Promise.all([
    GOOGLE_KEY ? searchGooglePlacesModern(searchTerm, GOOGLE_KEY, lat, lon) : Promise.resolve([]),
    FOURSQUARE_KEY ? searchFoursquare(searchTerm, FOURSQUARE_KEY, lat, lon) : Promise.resolve([]),
  ]);

  const primary: TieredVenue[] = [];
  const other: TieredVenue[] = [];
  const seen = new Set<string>();

  // Process Google results
  for (const place of googlePlaces) {
    const key = place.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const venue: TieredVenue = {
      id: place.place_id,
      name: place.name,
      location: formatGoogleLocation(place),
      latitude: place.latitude,
      longitude: place.longitude,
    };

    if (isRelevantGooglePlace(place, searchLower)) {
      primary.push(venue);
    } else {
      other.push(venue);
    }
  }

  // Process Foursquare results
  for (const fsq of foursquareVenues) {
    const key = fsq.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const venue: TieredVenue = {
      id: fsq.fsq_id,
      name: fsq.name,
      location: formatFoursquareLocation(fsq),
      latitude: fsq.geocodes?.main?.latitude,
      longitude: fsq.geocodes?.main?.longitude,
    };

    if (isRelevantFoursquareVenue(fsq, searchLower)) {
      primary.push(venue);
    } else {
      other.push(venue);
    }
  }

  console.log(`[unified-search] Venue tiers — primary: ${primary.length}, other: ${other.length}`);
  return { primary, other };
}

// ─── Modern Google Places API ────────────────────────────────────────

async function searchGooglePlacesModern(
  searchTerm: string,
  apiKey: string,
  lat: number | null,
  lon: number | null
): Promise<GooglePlace[]> {
  try {
    const searchQuery = `${searchTerm} music venue OR festival`;
    const body: { textQuery: string; maxResultCount: number; locationBias?: { circle: { center: { latitude: number; longitude: number }; radius: number } } } = { textQuery: searchQuery, maxResultCount: 15 };

    if (lat && lon) {
      body.locationBias = {
        circle: { center: { latitude: lat, longitude: lon }, radius: 50000 }
      };
    }

    console.log(`[unified-search] Google searching: ${searchQuery}`);

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
      console.error(`[unified-search] Google error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    const places = data.places || [];
    console.log(`[unified-search] Google returned ${places.length} results`);

    return places.map((p: GooglePlaceV2) => ({
      place_id: p.id || '',
      name: p.displayName?.text || '',
      formatted_address: p.formattedAddress || '',
      types: p.types || [],
      latitude: p.location?.latitude,
      longitude: p.location?.longitude,
    }));
  } catch (error) {
    console.error('[unified-search] Google error:', error);
    return [];
  }
}

// ─── Foursquare Search ───────────────────────────────────────────────

async function searchFoursquare(
  searchTerm: string,
  apiKey: string,
  lat: number | null,
  lon: number | null
): Promise<FoursquareVenue[]> {
  try {
    const params = new URLSearchParams({ query: searchTerm, limit: '15' });
    if (lat && lon) {
      params.set('ll', `${lat},${lon}`);
      params.set('radius', '100000');
    }

    const url = `https://places-api.foursquare.com/places/search?${params.toString()}`;
    console.log(`[unified-search] Foursquare searching: ${searchTerm}`);

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Accept': 'application/json',
        'X-Places-Api-Version': '2025-06-17',
      },
    });

    if (!response.ok) {
      console.error(`[unified-search] Foursquare error: ${response.status}`);
      return [];
    }

    const data = await response.json();
    console.log(`[unified-search] Foursquare returned ${data.results?.length || 0} results`);
    return data.results || [];
  } catch (error) {
    console.error('[unified-search] Foursquare error:', error);
    return [];
  }
}

// ─── Events Registry Search ──────────────────────────────────────────

async function searchEvents(searchTerm: string, supabaseClient: SupabaseClient): Promise<UnifiedSearchResult[]> {
  try {
    const { data } = await supabaseClient
      .from('events')
      .select('id, name, venue_name, venue_location, venue_id, event_type, year')
      .ilike('name', `%${searchTerm}%`)
      .order('year', { ascending: false })
      .limit(5);

    const seen = new Set<string>();
    const results: UnifiedSearchResult[] = [];
    for (const event of (data || [])) {
      const key = event.name.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({
        type: 'venue',
        id: event.venue_id || `event-${event.id}`,
        name: event.name,
        location: event.venue_location || event.venue_name || '',
        tier: 'primary',
        eventId: event.id,
        eventType: event.event_type,
        venueName: event.venue_name,
      });
    }
    console.log(`[unified-search] Events registry returned ${results.length} results`);
    return results;
  } catch (error) {
    console.error('[unified-search] Events search error:', error);
    return [];
  }
}

// ─── User History Search ─────────────────────────────────────────────

async function searchUserHistory(
  searchTerm: string,
  userId: string,
  supabaseClient: SupabaseClient
): Promise<{ artists: Array<{ name: string; count: number }>; venues: Array<{ id?: string; name: string; location: string; count: number }> }> {
  const searchWords = searchTerm.trim().toLowerCase().split(/\s+/);
  const artists: Array<{ name: string; count: number }> = [];
  const venues: Array<{ id?: string; name: string; location: string; count: number }> = [];

  try {
    const { data: showArtists } = await supabaseClient
      .from('show_artists')
      .select('artist_name, show_id, shows!inner(user_id)')
      .eq('shows.user_id', userId);

    if (showArtists) {
      const artistCounts = new Map<string, number>();
      for (const sa of showArtists) {
        const name = sa.artist_name;
        if (searchWords.some(word => name.toLowerCase().includes(word))) {
          artistCounts.set(name, (artistCounts.get(name) || 0) + 1);
        }
      }
      for (const [name, count] of artistCounts.entries()) {
        artists.push({ name, count });
      }
      artists.sort((a, b) => b.count - a.count);
    }

    const { data: userShows } = await supabaseClient
      .from('shows')
      .select('venue_name, venue_location, venue_id')
      .eq('user_id', userId);

    if (userShows) {
      const venueCounts = new Map<string, { id?: string; name: string; location: string; count: number }>();
      for (const show of userShows) {
        if (searchWords.some(word => show.venue_name.toLowerCase().includes(word))) {
          const key = `${show.venue_name}-${show.venue_location || ''}`;
          if (!venueCounts.has(key)) {
            venueCounts.set(key, { id: show.venue_id, name: show.venue_name, location: show.venue_location || '', count: 1 });
          } else {
            venueCounts.get(key)!.count++;
          }
        }
      }
      for (const venue of venueCounts.values()) {
        venues.push(venue);
      }
      venues.sort((a, b) => b.count - a.count);
    }
  } catch (error) {
    console.error('[unified-search] User history error:', error);
  }

  return { artists, venues };
}
