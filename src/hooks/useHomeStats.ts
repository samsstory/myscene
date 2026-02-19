import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InsightData, InsightType, InsightAction } from "@/components/home/DynamicInsight";
import { StatPill, StatPillAction } from "@/components/home/StatPills";
import { Target } from "lucide-react";

interface TopShow {
  id: string;
  artistName: string;
  venueName: string;
}

interface StatsData {
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
  incompleteTagsCount: number;
  missingPhotosCount: number;
  profileIncomplete: boolean;
}

interface UseHomeStatsReturn {
  stats: StatsData;
  statPills: StatPill[];
  insights: InsightData[];
  isLoading: boolean;
  refetch: () => Promise<void>;
}

const truncate = (str: string, maxLen: number): string => {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
};

export const useHomeStats = (): UseHomeStatsReturn => {
  const [stats, setStats] = useState<StatsData>({
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
    incompleteTagsCount: 0,
    missingPhotosCount: 0,
    profileIncomplete: false,
  });
  const [insights, setInsights] = useState<InsightData[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return;

      const userId = session.user.id;
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const currentMonthStart = new Date(currentYear, currentMonth, 1).toISOString().split('T')[0];
      const yearStart = new Date(currentYear, 0, 1).toISOString().split('T')[0];

      // Get all shows for the user with photo status
      const { data: shows, error: showsError } = await supabase
        .from('shows')
        .select('id, show_date, photo_url, photo_declined')
        .eq('user_id', userId)
        .order('show_date', { ascending: false });

      if (showsError) throw showsError;

      const totalShows = shows?.length || 0;
      const showsThisYear = shows?.filter(show => show.show_date >= yearStart).length || 0;
      const showsThisMonth = shows?.filter(show => show.show_date >= currentMonthStart).length || 0;

      // Count shows with no tags
      const showIds = shows?.map(s => s.id) || [];
      let incompleteTagsCount = 0;
      if (showIds.length > 0) {
        const { data: taggedShows } = await supabase
          .from('show_tags')
          .select('show_id')
          .in('show_id', showIds);
        const taggedShowIds = new Set((taggedShows || []).map(t => t.show_id));
        incompleteTagsCount = showIds.filter(id => !taggedShowIds.has(id)).length;
      }

      // Count shows without photos (excluding those explicitly declined)
      const missingPhotosCount = shows?.filter(show => !show.photo_url && !show.photo_declined).length || 0;

      // Calculate streak (consecutive months with shows)
      let streak = 0;
      if (shows && shows.length > 0) {
        const now = new Date();
        let checkMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        
        for (let i = 0; i < 12; i++) {
          const monthStart = new Date(checkMonth.getFullYear(), checkMonth.getMonth(), 1);
          const monthEnd = new Date(checkMonth.getFullYear(), checkMonth.getMonth() + 1, 0);
          
          const hasShowInMonth = shows.some(show => {
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

      // Simple percentile calc based on show count
      const activityRank = totalShows > 20 ? 95 : totalShows > 10 ? 85 : totalShows > 5 ? 70 : 50;

      // Calculate unique cities and countries from venue locations
      const cities = new Set<string>();
      const countries = new Set<string>();

      const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
        'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 
        'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 
        'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 
        'WA', 'WV', 'WI', 'WY'];

      const getCountryFromLocation = (location: string): string => {
        const parts = location.split(',').map(p => p.trim());
        const lastPart = parts[parts.length - 1];
        if (['USA', 'US', 'United States'].includes(lastPart)) return 'United States';
        
        for (const part of parts) {
          const cleanedPart = part.replace(/\s*\d+\s*$/, '').trim();
          if (usStates.includes(cleanedPart)) return 'United States';
        }
        
        return parts.length >= 2 ? lastPart : 'United States';
      };

      const getCityFromLocation = (location: string): string => {
        const parts = location.split(',').map(p => p.trim());
        if (parts.length >= 3 && /^\d/.test(parts[0])) {
          return `${parts[1]}, ${parts[2].replace(/\s*\d+\s*$/, '').trim()}`;
        }
        if (parts.length >= 2) {
          return `${parts[0]}, ${parts[1].replace(/\s*\d+\s*$/, '').trim()}`;
        }
        return parts[0];
      };

      // Fetch shows with venue_location for geographic stats
      const { data: showsWithLocation } = await supabase
        .from('shows')
        .select('venue_location')
        .eq('user_id', userId)
        .not('venue_location', 'is', null);

      showsWithLocation?.forEach(show => {
        if (show.venue_location) {
          cities.add(getCityFromLocation(show.venue_location));
          countries.add(getCountryFromLocation(show.venue_location));
        }
      });

      // Get rankings to find unranked shows and top show
      const { data: rankings } = await supabase
        .from('show_rankings')
        .select('show_id, comparisons_count, elo_score')
        .eq('user_id', userId);

      const rankedShowIds = new Set(rankings?.filter(r => r.comparisons_count > 0).map(r => r.show_id) || []);
      
      // Count shows with <3 comparisons (under-ranked, need more data for stable rankings)
      const COMPARISON_THRESHOLD = 3;
      const underRankedCount = shows?.filter(show => {
        const ranking = rankings?.find(r => r.show_id === show.id);
        return !ranking || ranking.comparisons_count < COMPARISON_THRESHOLD;
      }).length || 0;
      
      const unrankedCount = totalShows - rankedShowIds.size;

      // Get top ranked show by ELO
      let topShow: TopShow | null = null;
      if (rankings && rankings.length > 0) {
        const sortedRankings = rankings
          .filter(r => r.comparisons_count > 0)
          .sort((a, b) => b.elo_score - a.elo_score);
        
        if (sortedRankings.length > 0) {
          const topShowId = sortedRankings[0].show_id;
          
          // Fetch show details
          const { data: showData } = await supabase
            .from('shows')
            .select('id, venue_name')
            .eq('id', topShowId)
            .single();
          
          // Fetch headliner artist
          const { data: artistData } = await supabase
            .from('show_artists')
            .select('artist_name')
            .eq('show_id', topShowId)
            .eq('is_headliner', true)
            .limit(1);

          if (showData) {
            topShow = {
              id: showData.id,
              artistName: artistData?.[0]?.artist_name || 'Unknown Artist',
              venueName: showData.venue_name,
            };
          }
        }
      }

      // Generate insights - can show multiple at once
      // Priority order determines display order (top to bottom)
      const generatedInsights: InsightData[] = [];
      
      if (totalShows === 0) {
        generatedInsights.push({
          type: 'welcome',
          title: 'Welcome to Scene!',
          message: 'Start by adding your first concert to build your show collection.',
        });
      } else {
        // Milestones (highest priority when applicable)
        if ([25, 50, 100, 200].includes(totalShows)) {
          generatedInsights.push({
            type: 'milestone_reached',
            title: `${totalShows} Shows!`,
            message: `Incredible milestone! You've logged ${totalShows} concerts.`,
          });
        }
        
        // Incomplete highlights notification
        if (incompleteTagsCount >= 1) {
          generatedInsights.push({
            type: 'incomplete_ratings',
            title: `${incompleteTagsCount} ${incompleteTagsCount === 1 ? 'Show Needs' : 'Shows Need'} Highlights`,
            message: 'Tap to add highlights to your shows.',
            actionable: true,
            action: 'incomplete-ratings' as InsightAction,
          });
        }
        
        // Missing photos notification
        if (missingPhotosCount >= 1) {
          generatedInsights.push({
            type: 'missing_photos',
            title: `${missingPhotosCount} ${missingPhotosCount === 1 ? 'Show Needs' : 'Shows Need'} a Photo`,
            message: 'Add photos to complete your show memories.',
            actionable: true,
            action: 'missing-photos' as InsightAction,
          });
        }
        
        // Ranking reminder notification (shows with <3 comparisons)
        if (underRankedCount >= 1) {
          generatedInsights.push({
            type: 'ranking_reminder',
            title: `${underRankedCount} ${underRankedCount === 1 ? 'Show' : 'Shows'} to Rank`,
            message: 'Compare a few shows to lock in your rankings.',
            actionable: true,
            action: 'rank-tab' as InsightAction,
          });
        }
        
        // Streak celebration (non-actionable, lower priority)
        if (streak >= 2 && generatedInsights.length === 0) {
          generatedInsights.push({
            type: 'streak_active',
            title: `${streak}-Month Streak`,
            message: `You've been to shows ${streak} months in a row!`,
            actionable: false,
          });
        }
      }

      // Calculate global confirmation percentage
      // Formula: (Σ min(back_to_backs_per_show, 10)) / (total_shows × 10) × 100
      const MAX_BACK_TO_BACKS = 10;
      const totalCappedBackToBacks = (rankings || []).reduce((sum, r) => {
        return sum + Math.min(r.comparisons_count, MAX_BACK_TO_BACKS);
      }, 0);
      const globalConfirmationPercentage = totalShows > 0 
        ? (totalCappedBackToBacks / (totalShows * MAX_BACK_TO_BACKS)) * 100 
        : 0;

      // Check profile completeness (username, full_name, home_city)
      const { data: profile } = await supabase
        .from('profiles')
        .select('username, full_name, home_city')
        .eq('id', userId)
        .single();
      const profileIncomplete = !profile?.username || !profile?.full_name || !profile?.home_city;

      setStats({
        allTimeShows: totalShows,
        showsThisYear,
        showsThisMonth,
        activityRank,
        currentStreak: streak,
        unrankedCount,
        topShow,
        globalConfirmationPercentage,
        uniqueCities: cities.size,
        uniqueCountries: countries.size,
        incompleteTagsCount,
        missingPhotosCount,
        profileIncomplete,
      });
      setInsights(generatedInsights);
    } catch (error) {
      console.error('Error fetching home stats:', error);
      // Trigger proactive bug report prompt for API errors
      try {
        const evt = new CustomEvent('bug-report-api-error', {
          detail: {
            endpoint: 'useHomeStats',
            message: error instanceof Error ? error.message : 'Unknown error',
          },
        });
        window.dispatchEvent(evt);
      } catch {}
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statPills: StatPill[] = [
    // To-Do pill -> aggregates pending actions
    ...(() => {
      const todoItems: string[] = [];
      if (stats.profileIncomplete) todoItems.push('complete your profile');
      if (stats.unrankedCount > 0) todoItems.push(`${stats.unrankedCount} to rank`);
      if (stats.incompleteTagsCount > 0) todoItems.push(`${stats.incompleteTagsCount} need highlights`);
      if (stats.missingPhotosCount > 0) todoItems.push(`${stats.missingPhotosCount} need photos`);
      const totalTodos = todoItems.length > 0 
        ? (stats.profileIncomplete ? 1 : 0) + stats.unrankedCount + stats.incompleteTagsCount + stats.missingPhotosCount 
        : 0;
      if (totalTodos > 0) {
        return [{
          id: 'todo',
          label: 'Needs Attention',
          value: totalTodos,
          icon: Target,
          action: 'rankings-attention' as StatPillAction,
          isTodo: true,
          todoItems,
        }];
      }
      return [];
    })(),
  ];

  return {
    stats,
    statPills,
    insights,
    isLoading,
    refetch: fetchStats,
  };
};
