import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BandsintownVenue {
  name: string;
  location: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
}

interface VenueSuggestion {
  id?: string;
  name: string;
  location: string;
  city?: string;
  country?: string;
  bandsintown_id?: string;
  scene_users_count: number;
  user_show_count: number;
  source: 'scene' | 'bandsintown';
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

    // Extract JWT token from "Bearer <token>"
    const token = authHeader.replace('Bearer ', '');

    // Create client with the user's JWT token
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { 
        global: { 
          headers: { Authorization: `Bearer ${token}` } 
        } 
      }
    );

    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Searching venues for: ${searchTerm}`);

    // 1. Search user's own shows for matching venues
    const { data: userShows, error: userShowsError } = await supabaseClient
      .from('shows')
      .select('venue_name, venue_location')
      .eq('user_id', user.id)
      .ilike('venue_name', `%${searchTerm.trim()}%`)
      .order('venue_name');

    if (userShowsError) {
      console.error('Error fetching user shows:', userShowsError);
    }

    // 2. Search cached venues
    const { data: cachedVenues, error: cachedError } = await supabaseClient
      .from('venues')
      .select(`
        id,
        name,
        location,
        city,
        country,
        bandsintown_id
      `)
      .ilike('name', `%${searchTerm.trim()}%`)
      .limit(10);

    if (cachedError) {
      console.error('Error fetching cached venues:', cachedError);
    }

    // 3. Get Scene user counts for cached venues
    const venueIds = cachedVenues?.map(v => v.id) || [];
    let sceneUserCounts: Record<string, number> = {};
    
    if (venueIds.length > 0) {
      const { data: userVenueCounts, error: countError } = await supabaseClient
        .from('user_venues')
        .select('venue_id')
        .in('venue_id', venueIds);

      if (!countError && userVenueCounts) {
        sceneUserCounts = userVenueCounts.reduce((acc, uv) => {
          acc[uv.venue_id] = (acc[uv.venue_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>);
      }
    }

    // 4. Search Bandsintown API by searching for events in a city and extracting unique venues
    const BANDSINTOWN_API_KEY = Deno.env.get('BANDSINTOWN_API_KEY');
    let bandsintownVenues: BandsintownVenue[] = [];

    if (BANDSINTOWN_API_KEY) {
      try {
        // Search for upcoming events that might match the venue name
        // We'll search by location and filter venues on our side
        const bandsintownUrl = `https://rest.bandsintown.com/events/search?app_id=${BANDSINTOWN_API_KEY}&query=${encodeURIComponent(searchTerm.trim())}&per_page=50`;
        console.log(`Searching Bandsintown: ${bandsintownUrl}`);
        const bandsintownResponse = await fetch(bandsintownUrl);
        
        if (bandsintownResponse.ok) {
          const events = await bandsintownResponse.json();
          console.log(`Bandsintown returned ${Array.isArray(events) ? events.length : 0} events`);
          
          if (Array.isArray(events)) {
            // Extract unique venues from events
            const venueMap = new Map<string, BandsintownVenue>();
            
            events.forEach((event: any) => {
              if (event.venue && event.venue.name) {
                const venueName = event.venue.name.toLowerCase();
                const searchLower = searchTerm.trim().toLowerCase();
                
                // Only include if venue name matches our search term
                if (venueName.includes(searchLower)) {
                  const venueKey = `${event.venue.name}|${event.venue.location || ''}`;
                  
                  if (!venueMap.has(venueKey)) {
                    venueMap.set(venueKey, {
                      name: event.venue.name,
                      location: event.venue.location || `${event.venue.city}, ${event.venue.country}`,
                      city: event.venue.city || '',
                      country: event.venue.country || '',
                      latitude: event.venue.latitude || '',
                      longitude: event.venue.longitude || ''
                    });
                  }
                }
              }
            });
            
            bandsintownVenues = Array.from(venueMap.values()).slice(0, 10);
            console.log(`Extracted ${bandsintownVenues.length} unique matching venues`);
          }
        } else {
          console.error(`Bandsintown API error: ${bandsintownResponse.status} - ${await bandsintownResponse.text()}`);
        }
      } catch (error) {
        console.error('Error fetching from Bandsintown:', error);
      }
    } else {
      console.warn('BANDSINTOWN_API_KEY not configured');
    }

    // 5. Process and merge results
    const suggestions: VenueSuggestion[] = [];
    const seenVenues = new Set<string>();

    // Add user's own shows (highest priority)
    if (userShows) {
      const groupedUserShows: Record<string, { venue_name: string; venue_location: string | null; count: number }> = userShows.reduce((acc, show) => {
        const key = `${show.venue_name}|${show.venue_location || ''}`;
        if (!acc[key]) {
          acc[key] = {
            venue_name: show.venue_name,
            venue_location: show.venue_location,
            count: 0
          };
        }
        acc[key].count++;
        return acc;
      }, {} as Record<string, { venue_name: string; venue_location: string | null; count: number }>);

      Object.entries(groupedUserShows).forEach(([, { venue_name, venue_location, count }]) => {
        const key = `${venue_name}|${venue_location || ''}`.toLowerCase();
        if (!seenVenues.has(key)) {
          seenVenues.add(key);
          suggestions.push({
            name: venue_name,
            location: venue_location || '',
            scene_users_count: 0,
            user_show_count: count,
            source: 'scene'
          });
        }
      });
    }

    // Add cached venues
    if (cachedVenues) {
      cachedVenues.forEach(venue => {
        const key = `${venue.name}|${venue.location || ''}`.toLowerCase();
        if (!seenVenues.has(key)) {
          seenVenues.add(key);
          suggestions.push({
            id: venue.id,
            name: venue.name,
            location: venue.location || '',
            city: venue.city || undefined,
            country: venue.country || undefined,
            bandsintown_id: venue.bandsintown_id || undefined,
            scene_users_count: sceneUserCounts[venue.id] || 0,
            user_show_count: 0,
            source: 'scene'
          });
        }
      });
    }

    // Add Bandsintown venues (cache new ones)
    for (const btVenue of bandsintownVenues) {
      const location = `${btVenue.city}, ${btVenue.country}`;
      const key = `${btVenue.name}|${location}`.toLowerCase();
      
      if (!seenVenues.has(key)) {
        seenVenues.add(key);

        // Cache this venue for future searches
        const { data: newVenue, error: insertError } = await supabaseClient
          .from('venues')
          .upsert({
            name: btVenue.name,
            location: location,
            city: btVenue.city,
            country: btVenue.country,
            latitude: parseFloat(btVenue.latitude) || null,
            longitude: parseFloat(btVenue.longitude) || null,
            bandsintown_id: `${btVenue.name}-${btVenue.city}`.toLowerCase().replace(/\s+/g, '-')
          }, {
            onConflict: 'bandsintown_id',
            ignoreDuplicates: false
          })
          .select()
          .single();

        if (!insertError && newVenue) {
          suggestions.push({
            id: newVenue.id,
            name: btVenue.name,
            location: location,
            city: btVenue.city,
            country: btVenue.country,
            bandsintown_id: newVenue.bandsintown_id || undefined,
            scene_users_count: 0,
            user_show_count: 0,
            source: 'bandsintown'
          });
        }
      }
    }

    // Sort: user's venues first, then by Scene users count, then alphabetically
    suggestions.sort((a, b) => {
      if (a.user_show_count !== b.user_show_count) {
        return b.user_show_count - a.user_show_count;
      }
      if (a.scene_users_count !== b.scene_users_count) {
        return b.scene_users_count - a.scene_users_count;
      }
      return a.name.localeCompare(b.name);
    });

    console.log(`Returning ${suggestions.length} venue suggestions`);

    return new Response(
      JSON.stringify({ suggestions: suggestions.slice(0, 15) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in search-venues function:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
