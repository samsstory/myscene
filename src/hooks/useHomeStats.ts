import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InsightData, InsightType, InsightAction } from "@/components/home/DynamicInsight";
import { StatPill, StatPillAction } from "@/components/home/StatPills";
import { Music, Calendar, Trophy, Flame, Globe } from "lucide-react";

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
  uniqueCities: number;
  uniqueCountries: number;
}

interface UseHomeStatsReturn {
  stats: StatsData;
  statPills: StatPill[];
  insight: InsightData | null;
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
    uniqueCities: 0,
    uniqueCountries: 0,
  });
  const [insight, setInsight] = useState<InsightData | null>(null);
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

      // Get all shows for the user
      const { data: shows, error: showsError } = await supabase
        .from('shows')
        .select('id, show_date')
        .eq('user_id', userId)
        .order('show_date', { ascending: false });

      if (showsError) throw showsError;

      const totalShows = shows?.length || 0;
      const showsThisYear = shows?.filter(show => show.show_date >= yearStart).length || 0;
      const showsThisMonth = shows?.filter(show => show.show_date >= currentMonthStart).length || 0;

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

      // Generate insight
      let generatedInsight: InsightData | null = null;
      
      if (totalShows === 0) {
        generatedInsight = {
          type: 'welcome',
          title: 'Welcome to Scene!',
          message: 'Start by adding your first concert to build your show collection.',
        };
      } else if ([25, 50, 100, 200].includes(totalShows)) {
        generatedInsight = {
          type: 'milestone_reached',
          title: `${totalShows} Shows!`,
          message: `Incredible milestone! You've logged ${totalShows} concerts.`,
        };
      } else if (unrankedCount >= 3) {
        generatedInsight = {
          type: 'ranking_reminder',
          title: `${unrankedCount} Shows to Rank`,
          message: 'Tap to compare your recent shows.',
          actionable: true,
          action: 'rank-tab' as InsightAction,
        };
      } else if (streak >= 2) {
        generatedInsight = {
          type: 'streak_active',
          title: `${streak}-Month Streak`,
          message: `You've been to shows ${streak} months in a row!`,
          actionable: false,
        };
      }

      setStats({
        allTimeShows: totalShows,
        showsThisYear,
        showsThisMonth,
        activityRank,
        currentStreak: streak,
        unrankedCount,
        topShow,
        uniqueCities: cities.size,
        uniqueCountries: countries.size,
      });
      setInsight(generatedInsight);
    } catch (error) {
      console.error('Error fetching home stats:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const statPills: StatPill[] = [
    // Total Shows -> Rankings
    {
      id: 'total-shows',
      label: 'Shows',
      value: stats.allTimeShows,
      icon: Music,
      highlight: true,
      action: 'rankings' as StatPillAction,
    },
    // #1 Show -> Show Detail (if exists)
    ...(stats.topShow ? [{
      id: 'top-show',
      label: '#1 Show',
      value: truncate(stats.topShow.artistName, 12),
      icon: Trophy,
      action: 'show-detail' as StatPillAction,
      actionPayload: stats.topShow.id,
    }] : []),
    // Geographic stat -> Globe View
    // Smart display: show cities if single country, otherwise show countries
    ...(stats.uniqueCities > 0 ? [{
      id: 'cities',
      label: stats.uniqueCountries <= 1 ? 'Cities' : 'Countries',
      value: stats.uniqueCountries <= 1 ? stats.uniqueCities : stats.uniqueCountries,
      icon: Globe,
      action: 'globe' as StatPillAction,
    }] : []),
    // This Year -> Calendar
    {
      id: 'this-year',
      label: new Date().getFullYear().toString(),
      value: stats.showsThisYear,
      icon: Calendar,
      action: 'calendar' as StatPillAction,
    },
    // Streak (no action, just display)
    ...(stats.currentStreak >= 2 ? [{
      id: 'streak',
      label: 'Streak',
      value: `${stats.currentStreak}mo`,
      icon: Flame,
      action: null as StatPillAction,
    }] : []),
  ];

  return {
    stats,
    statPills,
    insight,
    isLoading,
    refetch: fetchStats,
  };
};
