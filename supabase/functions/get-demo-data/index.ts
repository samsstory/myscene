import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// The demo user whose data we display
const DEMO_USER_ID = "da422baa-3f54-4fac-88bb-5137bc085ddc";

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use service role to bypass RLS
    const supabase = createClient(supabaseUrl, serviceKey);

    const url = new URL(req.url);
    const dataType = url.searchParams.get("type") || "all";

    let data: Record<string, unknown> = {};

    if (dataType === "all" || dataType === "shows") {
      // Fetch shows with venue coordinates
      const { data: showsData, error: showsError } = await supabase
        .from("shows")
        .select("*, venues (latitude, longitude)")
        .eq("user_id", DEMO_USER_ID)
        .order("show_date", { ascending: false });

      if (showsError) throw showsError;

      // Fetch artists for each show
      const showIds = (showsData || []).map((s: { id: string }) => s.id);
      const { data: artistsData } = await supabase
        .from("show_artists")
        .select("*")
        .in("show_id", showIds);

      // Map artists to shows
      const artistsByShow = (artistsData || []).reduce((acc: Record<string, Array<{ artist_name: string; is_headliner: boolean }>>, artist: { show_id: string; artist_name: string; is_headliner: boolean }) => {
        if (!acc[artist.show_id]) acc[artist.show_id] = [];
        acc[artist.show_id].push(artist);
        return acc;
      }, {});

      data.shows = (showsData || []).map((show: Record<string, unknown>) => ({
        id: show.id,
        artists: (artistsByShow[show.id as string] || []).map((a: { artist_name: string; is_headliner: boolean }) => ({
          name: a.artist_name,
          isHeadliner: a.is_headliner,
        })),
        venue: {
          name: show.venue_name,
          location: show.venue_location || "",
        },
        date: show.show_date,
        rating: show.rating,
        datePrecision: show.date_precision,
        artistPerformance: show.artist_performance,
        sound: show.sound,
        lighting: show.lighting,
        crowd: show.crowd,
        venueVibe: show.venue_vibe,
        notes: show.notes,
        venueId: show.venue_id,
        latitude: (show.venues as { latitude?: number } | null)?.latitude,
        longitude: (show.venues as { longitude?: number } | null)?.longitude,
        photo_url: show.photo_url,
      }));
    }

    if (dataType === "all" || dataType === "rankings") {
      const { data: rankingsData, error: rankingsError } = await supabase
        .from("show_rankings")
        .select("show_id, elo_score, comparisons_count")
        .eq("user_id", DEMO_USER_ID);

      if (rankingsError) throw rankingsError;
      data.rankings = rankingsData;
    }

    if (dataType === "all" || dataType === "stats") {
      // Fetch stats for home page
      const { data: showsData } = await supabase
        .from("shows")
        .select("id, show_date, artist_performance, sound, lighting, crowd, venue_vibe, venue_location")
        .eq("user_id", DEMO_USER_ID)
        .order("show_date", { ascending: false });

      const { data: rankingsData } = await supabase
        .from("show_rankings")
        .select("show_id, elo_score, comparisons_count")
        .eq("user_id", DEMO_USER_ID);

      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const yearStart = `${currentYear}-01-01`;
      const monthStart = new Date(currentYear, currentMonth, 1).toISOString().split("T")[0];

      const shows = showsData || [];
      const rankings = rankingsData || [];

      const totalShows = shows.length;
      const showsThisYear = shows.filter((s: { show_date: string }) => s.show_date >= yearStart).length;
      const showsThisMonth = shows.filter((s: { show_date: string }) => s.show_date >= monthStart).length;

      // Calculate streak
      let streak = 0;
      if (shows.length > 0) {
        const now = new Date();
        let checkMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        for (let i = 0; i < 12; i++) {
          const monthStart = new Date(checkMonth.getFullYear(), checkMonth.getMonth(), 1);
          const monthEnd = new Date(checkMonth.getFullYear(), checkMonth.getMonth() + 1, 0);
          
          const hasShowInMonth = shows.some((show: { show_date: string }) => {
            const showDate = new Date(show.show_date);
            return showDate >= monthStart && showDate <= monthEnd;
          });
          
          if (hasShowInMonth) {
            streak++;
            checkMonth.setMonth(checkMonth.getMonth() - 1);
          } else {
            break;
          }
        }
      }

      // Find top show
      let topShow = null;
      const sortedRankings = rankings
        .filter((r: { comparisons_count: number }) => r.comparisons_count > 0)
        .sort((a: { elo_score: number }, b: { elo_score: number }) => b.elo_score - a.elo_score);
      
      if (sortedRankings.length > 0) {
        const topShowId = sortedRankings[0].show_id;
        const { data: showData } = await supabase
          .from("shows")
          .select("id, venue_name")
          .eq("id", topShowId)
          .single();
        
        const { data: artistData } = await supabase
          .from("show_artists")
          .select("artist_name")
          .eq("show_id", topShowId)
          .eq("is_headliner", true)
          .limit(1);

        if (showData) {
          topShow = {
            id: showData.id,
            artistName: artistData?.[0]?.artist_name || "Unknown Artist",
            venueName: showData.venue_name,
          };
        }
      }

      // Calculate unique cities and countries
      const cities = new Set<string>();
      const countries = new Set<string>();
      const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 
        'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 
        'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 
        'WA', 'WV', 'WI', 'WY'];

      shows.forEach((show: { venue_location: string | null }) => {
        if (show.venue_location) {
          const parts = show.venue_location.split(',').map((p: string) => p.trim());
          if (parts.length >= 2) {
            cities.add(`${parts[0]}, ${parts[1].replace(/\s*\d+\s*$/, '').trim()}`);
          }
          const lastPart = parts[parts.length - 1];
          if (['USA', 'US', 'United States'].includes(lastPart)) {
            countries.add('United States');
          } else {
            for (const part of parts) {
              const cleanedPart = part.replace(/\s*\d+\s*$/, '').trim();
              if (usStates.includes(cleanedPart)) {
                countries.add('United States');
                break;
              }
            }
            if (!countries.has('United States') && parts.length >= 2) {
              countries.add(lastPart);
            }
          }
        }
      });

      // Calculate global confirmation percentage
      const MAX_BACK_TO_BACKS = 10;
      const totalCappedBackToBacks = rankings.reduce((sum: number, r: { comparisons_count: number }) => {
        return sum + Math.min(r.comparisons_count, MAX_BACK_TO_BACKS);
      }, 0);
      const globalConfirmationPercentage = totalShows > 0 
        ? (totalCappedBackToBacks / (totalShows * MAX_BACK_TO_BACKS)) * 100 
        : 0;

      // Count incomplete ratings and underranked shows
      const incompleteRatingsCount = shows.filter((show: { artist_performance: number | null; sound: number | null; lighting: number | null; crowd: number | null; venue_vibe: number | null }) => 
        show.artist_performance === null ||
        show.sound === null ||
        show.lighting === null ||
        show.crowd === null ||
        show.venue_vibe === null
      ).length;

      const COMPARISON_THRESHOLD = 3;
      const rankedShowIds = new Set(rankings.filter((r: { comparisons_count: number }) => r.comparisons_count > 0).map((r: { show_id: string }) => r.show_id));
      const underRankedCount = shows.filter((show: { id: string }) => {
        const ranking = rankings.find((r: { show_id: string }) => r.show_id === show.id);
        return !ranking || ranking.comparisons_count < COMPARISON_THRESHOLD;
      }).length;
      const unrankedCount = totalShows - rankedShowIds.size;

      data.stats = {
        allTimeShows: totalShows,
        showsThisYear,
        showsThisMonth,
        activityRank: totalShows > 20 ? 95 : totalShows > 10 ? 85 : totalShows > 5 ? 70 : 50,
        currentStreak: streak,
        unrankedCount,
        topShow,
        globalConfirmationPercentage,
        uniqueCities: cities.size,
        uniqueCountries: countries.size,
        incompleteRatingsCount,
        underRankedCount,
      };
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error fetching demo data:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
