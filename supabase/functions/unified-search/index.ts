import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UnifiedSearchResult {
  type: 'artist' | 'venue';
  id: string;
  name: string;
  subtitle?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  userShowCount?: number;
  sceneUsersCount?: number;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { searchTerm } = await req.json();

    if (!searchTerm || searchTerm.trim().length < 2) {
      return new Response(
        JSON.stringify({ results: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const authHeader = req.headers.get('Authorization');
    let userId: string | null = null;
    let supabaseClient: any = null;

    // Try to get user ID if authenticated - use proper JWT verification
    if (authHeader?.startsWith('Bearer ')) {
      try {
        supabaseClient = createClient(
          Deno.env.get('SUPABASE_URL') ?? '',
          Deno.env.get('SUPABASE_ANON_KEY') ?? '',
          {
            global: {
              headers: { Authorization: authHeader },
            },
          }
        );

        // Properly verify JWT using Supabase auth (validates signature)
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
        
        if (!authError && user) {
          userId = user.id;
        } else {
          console.log('Invalid auth token, proceeding without user context');
          supabaseClient = null;
        }
      } catch (e) {
        console.log('Could not verify auth token, proceeding without user context');
        supabaseClient = null;
      }
    }

    console.log(`[unified-search] Searching for: ${searchTerm}`);

    const results: UnifiedSearchResult[] = [];
    const searchLower = searchTerm.trim().toLowerCase();

    // Run artist and venue searches in parallel
    const [artistResults, venueResults, userShowsResults] = await Promise.all([
      // 1. Search MusicBrainz for artists
      searchMusicBrainz(searchTerm),
      
      // 2. Search Google Places for venues
      searchGooglePlaces(searchTerm, userId, supabaseClient),
      
      // 3. Search user's own show history (if authenticated)
      userId && supabaseClient ? searchUserHistory(searchTerm, userId, supabaseClient) : Promise.resolve({ artists: [], venues: [] }),
    ]);

    // Add user's own artists first (highest priority)
    if (userShowsResults.artists.length > 0) {
      for (const artist of userShowsResults.artists.slice(0, 3)) {
        results.push({
          type: 'artist',
          id: `user-artist-${artist.name}`,
          name: artist.name,
          subtitle: `You've seen ${artist.count} time${artist.count !== 1 ? 's' : ''}`,
        });
      }
    }

    // Add MusicBrainz artists
    for (const artist of artistResults.slice(0, 5)) {
      // Skip if already added from user history
      if (results.some(r => r.type === 'artist' && r.name.toLowerCase() === artist.name.toLowerCase())) {
        continue;
      }
      results.push({
        type: 'artist',
        id: artist.id,
        name: artist.name,
        subtitle: artist.disambiguation || artist.country || undefined,
      });
    }

    // Add user's own venues first
    if (userShowsResults.venues.length > 0) {
      for (const venue of userShowsResults.venues.slice(0, 3)) {
        results.push({
          type: 'venue',
          id: venue.id || `user-venue-${venue.name}`,
          name: venue.name,
          location: venue.location,
          userShowCount: venue.count,
        });
      }
    }

    // Add Google Places venues
    for (const venue of venueResults.slice(0, 10)) {
      // Skip if already added from user history
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
      });
    }

    // Sort results: exact matches first, then starts-with, then user history items
    results.sort((a, b) => {
      const aName = a.name.toLowerCase();
      const bName = b.name.toLowerCase();
      
      // Exact matches first
      if (aName === searchLower && bName !== searchLower) return -1;
      if (bName === searchLower && aName !== searchLower) return 1;
      
      // Starts with matches second
      const aStarts = aName.startsWith(searchLower);
      const bStarts = bName.startsWith(searchLower);
      if (aStarts && !bStarts) return -1;
      if (bStarts && !aStarts) return 1;
      
      // User history items get priority
      const aUserItem = a.userShowCount && a.userShowCount > 0;
      const bUserItem = b.userShowCount && b.userShowCount > 0;
      if (aUserItem && !bUserItem) return -1;
      if (bUserItem && !aUserItem) return 1;
      
      return 0;
    });

    console.log(`[unified-search] Returning ${results.length} results`);

    return new Response(
      JSON.stringify({ results }),
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

async function searchMusicBrainz(searchTerm: string): Promise<Array<{ id: string; name: string; disambiguation?: string; country?: string }>> {
  try {
    const response = await fetch(
      `https://musicbrainz.org/ws/2/artist/?query=artist:${encodeURIComponent(searchTerm)}&fmt=json&limit=8`,
      {
        headers: {
          'User-Agent': 'Scene/1.0 (https://myscene.lovable.app)',
          'Accept': 'application/json',
        },
      }
    );

    if (!response.ok) {
      console.error('[unified-search] MusicBrainz error:', response.status);
      return [];
    }

    const data = await response.json();
    return (data.artists || []).map((artist: any) => ({
      id: artist.id,
      name: artist.name,
      disambiguation: artist.disambiguation || '',
      country: artist.country || '',
    }));
  } catch (error) {
    console.error('[unified-search] MusicBrainz error:', error);
    return [];
  }
}

async function searchGooglePlaces(
  searchTerm: string,
  userId: string | null,
  supabaseClient: any
): Promise<Array<{ id: string; name: string; location: string; latitude?: number; longitude?: number }>> {
  const GOOGLE_API_KEY = Deno.env.get('GOOGLE_PLACES_API_KEY');
  
  if (!GOOGLE_API_KEY) {
    console.warn('[unified-search] GOOGLE_PLACES_API_KEY not set');
    return [];
  }

  try {
    // Get user's home coordinates for proximity biasing
    let locationBias = '';
    if (userId && supabaseClient) {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('home_latitude, home_longitude')
        .eq('id', userId)
        .single();

      if (profile?.home_latitude && profile?.home_longitude) {
        locationBias = `&location=${profile.home_latitude},${profile.home_longitude}&radius=50000`;
      }
    }

    const googleUrl = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(searchTerm)}${locationBias}&key=${GOOGLE_API_KEY}`;
    const response = await fetch(googleUrl);

    if (!response.ok) {
      console.error('[unified-search] Google Places error:', response.status);
      return [];
    }

    const data = await response.json();

    if (data.status !== 'OK' || !data.results) {
      return [];
    }

    // Filter out irrelevant results
    const excludeKeywords = [
      'floral', 'flower', 'wholesale', 'retail', 'shop', 'store',
      'salon', 'spa', 'hotel', 'motel', 'apartment', 'real estate',
      'dentist', 'doctor', 'clinic', 'hospital', 'pharmacy',
      'bank', 'atm', 'insurance', 'lawyer', 'school', 'church'
    ];

    return data.results
      .filter((place: any) => {
        const nameAndTypes = `${place.name} ${place.types?.join(' ')}`.toLowerCase();
        return !excludeKeywords.some(keyword => nameAndTypes.includes(keyword));
      })
      .slice(0, 15)
      .map((place: any) => {
        // Extract city and state from formatted_address
        const addressParts = place.formatted_address.split(', ');
        let location = '';
        
        if (addressParts.length >= 3) {
          const city = addressParts[addressParts.length - 3] || '';
          const stateZip = addressParts[addressParts.length - 2] || '';
          const state = stateZip.split(' ')[0] || '';
          
          if (city && state) {
            location = `${city}, ${state}`;
          } else {
            location = place.formatted_address;
          }
        } else {
          location = place.formatted_address;
        }

        return {
          id: place.place_id,
          name: place.name,
          location,
          latitude: place.geometry?.location?.lat,
          longitude: place.geometry?.location?.lng,
        };
      });
  } catch (error) {
    console.error('[unified-search] Google Places error:', error);
    return [];
  }
}

async function searchUserHistory(
  searchTerm: string,
  userId: string,
  supabaseClient: any
): Promise<{ artists: Array<{ name: string; count: number }>; venues: Array<{ id?: string; name: string; location: string; count: number }> }> {
  const searchWords = searchTerm.trim().toLowerCase().split(/\s+/);
  const artists: Array<{ name: string; count: number }> = [];
  const venues: Array<{ id?: string; name: string; location: string; count: number }> = [];

  try {
    // Search user's show artists
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

    // Search user's venues
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
            venueCounts.set(key, {
              id: show.venue_id,
              name: show.venue_name,
              location: show.venue_location || '',
              count: 1,
            });
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
