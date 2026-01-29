import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface ShowRanking {
  show_id: string;
  comparisons_count: number;
}

interface RankingConfirmationData {
  globalPercentage: number;
  totalShows: number;
  totalBackToBacks: number;
  getShowPercentage: (showId: string) => number;
  getShowBackToBacks: (showId: string) => number;
}

const MAX_BACK_TO_BACKS_PER_SHOW = 10;

/**
 * Hook to calculate ranking confirmation percentages.
 * 
 * Global formula: (Σ min(back_to_backs_per_show, 10)) / (total_shows × 10) × 100
 * Per-show formula: min(back_to_backs, 10) / 10 × 100
 */
export const useRankingConfirmation = (): RankingConfirmationData & { isLoading: boolean; refetch: () => Promise<void> } => {
  const [rankings, setRankings] = useState<ShowRanking[]>([]);
  const [totalShows, setTotalShows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setIsLoading(false);
        return;
      }

      const userId = session.user.id;

      // Get total shows count
      const { count: showCount } = await supabase
        .from('shows')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      // Get all rankings with comparison counts
      const { data: rankingsData } = await supabase
        .from('show_rankings')
        .select('show_id, comparisons_count')
        .eq('user_id', userId);

      setTotalShows(showCount || 0);
      setRankings(rankingsData || []);
    } catch (error) {
      console.error('Error fetching ranking confirmation data:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Create a map for quick lookups
  const rankingMap = new Map(rankings.map(r => [r.show_id, r.comparisons_count]));

  // Calculate global percentage
  const calculateGlobalPercentage = (): number => {
    if (totalShows === 0) return 0;
    
    const totalCappedBackToBacks = rankings.reduce((sum, r) => {
      return sum + Math.min(r.comparisons_count, MAX_BACK_TO_BACKS_PER_SHOW);
    }, 0);
    
    const maxPossible = totalShows * MAX_BACK_TO_BACKS_PER_SHOW;
    return (totalCappedBackToBacks / maxPossible) * 100;
  };

  // Calculate per-show percentage
  const getShowPercentage = (showId: string): number => {
    const comparisons = rankingMap.get(showId) || 0;
    return (Math.min(comparisons, MAX_BACK_TO_BACKS_PER_SHOW) / MAX_BACK_TO_BACKS_PER_SHOW) * 100;
  };

  // Get raw back-to-back count for a show
  const getShowBackToBacks = (showId: string): number => {
    return rankingMap.get(showId) || 0;
  };

  // Total back-to-backs across all shows
  const totalBackToBacks = rankings.reduce((sum, r) => sum + r.comparisons_count, 0);

  return {
    globalPercentage: calculateGlobalPercentage(),
    totalShows,
    totalBackToBacks,
    getShowPercentage,
    getShowBackToBacks,
    isLoading,
    refetch: fetchData,
  };
};
