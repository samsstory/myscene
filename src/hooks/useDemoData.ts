import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface Artist {
  name: string;
  isHeadliner: boolean;
}

interface Show {
  id: string;
  artists: Artist[];
  venue: {
    name: string;
    location: string;
  };
  date: string;
  datePrecision?: string;
  tags?: string[];
  notes?: string | null;
  venueId?: string | null;
  latitude?: number;
  longitude?: number;
  photo_url?: string | null;
}

interface ShowRanking {
  show_id: string;
  elo_score: number;
  comparisons_count: number;
}

interface TopShow {
  id: string;
  artistName: string;
  venueName: string;
}

interface DemoStats {
  allTimeShows: number;
  showsThisYear: number;
  showsThisMonth: number;
  activityRank: number;
  currentStreak: number;
  unrankedCount: number;
  topShow: TopShow | null;
  globalConfirmationPercentage: number;
  uniqueCities: number;
  uniqueCountries: number;
  incompleteRatingsCount: number;
  underRankedCount: number;
  missingPhotosCount: number;
}

interface DemoData {
  shows: Show[];
  rankings: ShowRanking[];
  stats: DemoStats;
}

interface UseDemoDataReturn {
  shows: Show[];
  rankings: ShowRanking[];
  stats: DemoStats;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

const defaultStats: DemoStats = {
  allTimeShows: 0,
  showsThisYear: 0,
  showsThisMonth: 0,
  activityRank: 50,
  currentStreak: 0,
  unrankedCount: 0,
  topShow: null,
  globalConfirmationPercentage: 0,
  uniqueCities: 0,
  uniqueCountries: 0,
  incompleteRatingsCount: 0,
  underRankedCount: 0,
  missingPhotosCount: 0,
};

export const useDemoData = (): UseDemoDataReturn => {
  const [shows, setShows] = useState<Show[]>([]);
  const [rankings, setRankings] = useState<ShowRanking[]>([]);
  const [stats, setStats] = useState<DemoStats>(defaultStats);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchDemoData = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: fnError } = await supabase.functions.invoke<DemoData>(
        "get-demo-data",
        { body: {} }
      );

      if (fnError) throw fnError;
      if (!data) throw new Error("No data returned");

      setShows(data.shows || []);
      setRankings(data.rankings || []);
      setStats(data.stats || defaultStats);
    } catch (err) {
      console.error("Error fetching demo data:", err);
      setError(err instanceof Error ? err.message : "Failed to load demo data");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDemoData();
  }, [fetchDemoData]);

  return {
    shows,
    rankings,
    stats,
    isLoading,
    error,
    refetch: fetchDemoData,
  };
};
