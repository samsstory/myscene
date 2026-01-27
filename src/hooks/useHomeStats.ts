import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { InsightData, InsightType } from "@/components/home/DynamicInsight";
import { StatPill } from "@/components/home/StatPills";
import { Music, Calendar, Trophy, Flame } from "lucide-react";

interface StatsData {
  allTimeShows: number;
  showsThisYear: number;
  showsThisMonth: number;
  activityRank: number;
  currentStreak: number;
}

interface UseHomeStatsReturn {
  stats: StatsData;
  statPills: StatPill[];
  insight: InsightData | null;
  isLoading: boolean;
  refetch: () => Promise<void>;
}

export const useHomeStats = (): UseHomeStatsReturn => {
  const [stats, setStats] = useState<StatsData>({
    allTimeShows: 0,
    showsThisYear: 0,
    showsThisMonth: 0,
    activityRank: 50,
    currentStreak: 0,
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

      // Get unranked shows count for insight
      const { data: rankings } = await supabase
        .from('show_rankings')
        .select('show_id, comparisons_count')
        .eq('user_id', userId);

      const rankedShowIds = new Set(rankings?.filter(r => r.comparisons_count > 0).map(r => r.show_id) || []);
      const unrankedCount = totalShows - rankedShowIds.size;

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
      } else if (streak >= 3) {
        generatedInsight = {
          type: 'streak_active',
          title: `${streak}-Month Streak`,
          message: `You've been to shows ${streak} months in a row. Keep it going!`,
        };
      } else if (unrankedCount >= 3) {
        generatedInsight = {
          type: 'ranking_reminder',
          title: `${unrankedCount} Shows to Rank`,
          message: 'Head to Rank to compare your recent shows.',
        };
      }

      setStats({
        allTimeShows: totalShows,
        showsThisYear,
        showsThisMonth,
        activityRank,
        currentStreak: streak,
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
    {
      id: 'all-time',
      label: 'All Time',
      value: stats.allTimeShows,
      icon: Music,
      highlight: true,
    },
    {
      id: 'this-year',
      label: new Date().getFullYear().toString(),
      value: stats.showsThisYear,
      icon: Calendar,
    },
    {
      id: 'activity',
      label: 'Activity',
      value: `Top ${100 - stats.activityRank}%`,
      icon: Trophy,
    },
    ...(stats.currentStreak > 0 ? [{
      id: 'streak',
      label: 'Streak',
      value: `${stats.currentStreak}mo`,
      icon: Flame,
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
