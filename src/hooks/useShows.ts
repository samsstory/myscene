import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { deleteShowById } from "@/lib/delete-show";
import type { Artist, Show, ShowRanking } from "@/types/show";

export type { Artist, Show, ShowRanking };

interface UseShowsOptions {
  /** Called after realtime changes to refresh external stats */
  onRealtimeChange?: () => void;
}

export function useShows({ onRealtimeChange }: UseShowsOptions = {}) {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [rankings, setRankings] = useState<ShowRanking[]>([]);
  const [deleteConfirmShow, setDeleteConfirmShow] = useState<Show | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchShows = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setShows([]);
        setLoading(false);
        return;
      }

      const { data: showsData, error: showsError } = await supabase
        .from('shows')
        .select(`*, venues (latitude, longitude), show_artists (*), show_tags (tag)`)
        .eq('user_id', user.id)
        .order('show_date', { ascending: false });

      if (showsError) throw showsError;

      const { data: rankingsData, error: rankingsError } = await supabase
        .from('show_rankings')
        .select('show_id, elo_score, comparisons_count')
        .eq('user_id', user.id);

      if (!rankingsError) {
        setRankings(rankingsData || []);
      }

      const showsWithArtists = (showsData || []).map((show) => ({
        id: show.id,
        artists: ((show as any).show_artists || []).map((a: any) => ({
          name: a.artist_name,
          isHeadliner: a.is_headliner,
          imageUrl: a.artist_image_url || undefined,
          spotifyId: a.spotify_artist_id || undefined,
        })),
        venue: { name: show.venue_name, location: show.venue_location || '' },
        date: show.show_date,
        datePrecision: show.date_precision,
        tags: ((show as any).show_tags || []).map((t: any) => t.tag),
        notes: show.notes,
        venueId: show.venue_id,
        latitude: show.venues?.latitude,
        longitude: show.venues?.longitude,
        photo_url: show.photo_url,
        photo_declined: show.photo_declined,
        eventName: show.event_name,
        eventDescription: (show as any).event_description,
        showType: show.show_type,
      }));

      setShows(showsWithArtists);
    } catch (error) {
      console.error('Error fetching shows:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  const deleteShow = useCallback(async () => {
    if (!deleteConfirmShow) return;

    setIsDeleting(true);
    try {
      await deleteShowById(deleteConfirmShow.id);

      toast.success('Show deleted');
      setShows((prev) => prev.filter((s) => s.id !== deleteConfirmShow.id));
    } catch (error) {
      console.error('Error deleting show:', error);
      toast.error('Failed to delete show');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmShow(null);
    }
  }, [deleteConfirmShow]);

  const getAllShowsSortedByElo = useCallback(() => {
    const rankingMap = new Map(rankings.map((r) => [r.show_id, r.elo_score]));
    return [...shows].sort((a, b) => {
      const eloA = rankingMap.get(a.id) || 1200;
      const eloB = rankingMap.get(b.id) || 1200;
      if (eloB !== eloA) return eloB - eloA;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }).map((s) => s.id);
  }, [shows, rankings]);

  const getShowRankInfo = useCallback((showId: string, sortedShowIds?: string[]) => {
    const rankingMap = new Map(rankings.map((r) => [r.show_id, r]));
    const ranking = rankingMap.get(showId);
    const effectiveSortedIds = sortedShowIds || getAllShowsSortedByElo();
    const position = effectiveSortedIds.indexOf(showId) + 1;
    const total = effectiveSortedIds.length;

    if (!ranking || ranking.comparisons_count === 0) {
      return { position: null, total, comparisonsCount: 0 };
    }

    return {
      position: position > 0 ? position : null,
      total,
      comparisonsCount: ranking.comparisons_count,
    };
  }, [rankings, getAllShowsSortedByElo]);

  // Initial fetch + realtime subscription
  useEffect(() => {
    fetchShows();

    const channel = supabase.channel('shows_changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'shows',
    }, () => {
      fetchShows();
      onRealtimeChange?.();
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchShows, onRealtimeChange]);

  return {
    shows,
    loading,
    rankings,
    fetchShows,
    deleteShow,
    deleteConfirmShow,
    setDeleteConfirmShow,
    isDeleting,
    getAllShowsSortedByElo,
    getShowRankInfo,
  };
}
