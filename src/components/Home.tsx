import { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { Music2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowLeft, Instagram, Plus, Search, X, UserCircle, Tag, Camera, Users } from "lucide-react";
import ContentPillNav, { type ContentView } from "./home/ContentPillNav";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO, isToday, isFuture } from "date-fns";
import { usePlanUpcomingShow } from "@/hooks/usePlanUpcomingShow";
import UpcomingShowDetailSheet from "@/components/home/UpcomingShowDetailSheet";
import ScheduleView from "@/components/home/ScheduleView";

import { ShowReviewSheet } from "./ShowReviewSheet";
import { PhotoOverlayEditor } from "./PhotoOverlayEditor";
import { QuickPhotoAddSheet } from "./QuickPhotoAddSheet";
import MapView from "./MapView";
import Rank from "./Rank";
import AddShowFlow, { type AddShowPrefill } from "./AddShowFlow";
import QuickAddSheet, { type QuickAddPrefill } from "./QuickAddSheet";
import { ShowRankBadge } from "./feed/ShowRankBadge";
import SwipeableRankingCard from "./rankings/SwipeableRankingCard";
import ShowsBarChart from "./rankings/ShowsBarChart";
import { toast } from "sonner";

// Home components
import StatPills, { StatPillAction } from "./home/StatPills";
import DynamicInsight, { InsightAction } from "./home/DynamicInsight";
import StackedShowList from "./home/StackedShowList";

import IncompleteTagsSheet from "./home/IncompleteTagsSheet";
import MissingPhotosSheet from "./home/MissingPhotosSheet";
import FocusedRankingSession from "./home/FocusedRankingSession";
import RankingProgressCard from "./home/RankingProgressCard";
import FriendTeaser from "./home/FriendTeaser";
import WhatsNextStrip from "./home/WhatsNextStrip";
import FriendActivityFeed, { type IWasTherePayload } from "./home/FriendActivityFeed";
import PopularFeedGrid from "./home/PopularFeedGrid";
import { usePopularShows, type ShowTypeFilter, type PopularItem } from "@/hooks/usePopularShows";
import { usePopularNearMe } from "@/hooks/usePopularNearMe";
import { useFriendActivity } from "@/hooks/useFriendActivity";
import PlanShowSheet from "./home/PlanShowSheet";
import { useHomeStats } from "@/hooks/useHomeStats";
import { useFollowers } from "@/hooks/useFollowers";
import { useFriendUpcomingShows } from "@/hooks/useFriendUpcomingShows";
import { Skeleton } from "./ui/skeleton";
import FriendsPanelView from "./home/FriendsPanelView";

interface Artist {
  name: string;
  isHeadliner: boolean;
  imageUrl?: string;
  spotifyId?: string;
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
  photo_declined?: boolean;
  eventName?: string | null;
  eventDescription?: string | null;
  showType?: string;
}

interface ShowRanking {
  show_id: string;
  elo_score: number;
  comparisons_count: number;
}

type ViewMode = ContentView;

interface HomeProps {
  onViewChange?: (view: ViewMode) => void;
  onNavigateToRank?: () => void;
  onNavigateToProfile?: () => void;
  onAddFromPhotos?: () => void;
  onAddSingleShow?: () => void;
  initialView?: ViewMode;
  openShowId?: string | null;
  onShowOpened?: () => void;
  // Tour-related props for Step 5 (Shows stat pill)
  showsTourActive?: boolean;
  showsRef?: React.RefObject<HTMLButtonElement>;
}

const Home = ({ onNavigateToRank, onNavigateToProfile, onAddFromPhotos, onAddSingleShow, initialView, openShowId, onShowOpened, showsTourActive, showsRef, onViewChange }: HomeProps) => {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView || "home");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editShow, setEditShow] = useState<Show | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addShowPrefill, setAddShowPrefill] = useState<AddShowPrefill | null>(null);
  const [reviewShow, setReviewShow] = useState<Show | null>(null);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [topRatedFilter, setTopRatedFilter] = useState<"all-time" | "this-year" | "last-year" | "this-month">("all-time");

  // Notify parent when view changes internally
  useEffect(() => {
    onViewChange?.(viewMode);
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync viewMode when initialView prop changes
  useEffect(() => {
    if (initialView) {
      setViewMode(initialView);
    }
  }, [initialView]);
  const [sortMode, setSortMode] = useState<"best" | "worst" | "newest" | "oldest">("best");
  const [attentionFilterActive, setAttentionFilterActive] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState<"all" | "set" | "show" | "festival">("all");
  const [rankingsSearch, setRankingsSearch] = useState("");
  const [rankings, setRankings] = useState<ShowRanking[]>([]);
  const [deleteConfirmShow, setDeleteConfirmShow] = useState<Show | null>(null);
  const [floatingSearchOpen, setFloatingSearchOpen] = useState(false);
  const [searchBarHidden, setSearchBarHidden] = useState(false);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Callback ref to attach IntersectionObserver when the search bar mounts
  const searchBarCallbackRef = useCallback((node: HTMLDivElement | null) => {
    // Disconnect previous observer
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    searchBarRef.current = node;
    if (node) {
      const observer = new IntersectionObserver(
        ([entry]) => setSearchBarHidden(!entry.isIntersecting),
        { threshold: 0 }
      );
      observer.observe(node);
      observerRef.current = observer;
    } else {
      setSearchBarHidden(false);
    }
  }, []);

  // Reset when leaving rankings view
  useEffect(() => {
    if (viewMode !== 'rankings') {
      setSearchBarHidden(false);
    }
  }, [viewMode]);
  const [isDeleting, setIsDeleting] = useState(false);

  // Direct photo editor state for feed cards
  const [directEditShow, setDirectEditShow] = useState<Show | null>(null);
  const [directEditOpen, setDirectEditOpen] = useState(false);

  // Quick photo add sheet state for shows without photos
  const [quickPhotoShow, setQuickPhotoShow] = useState<Show | null>(null);
  const [quickPhotoOpen, setQuickPhotoOpen] = useState(false);

  // Incomplete tags sheet state
  const [incompleteTagsOpen, setIncompleteTagsOpen] = useState(false);
  const [incompleteTagsFocusId, setIncompleteTagsFocusId] = useState<string | null>(null);

  // Missing photos sheet state
  const [missingPhotosOpen, setMissingPhotosOpen] = useState(false);

  // Focused ranking session state
  const [focusedRankingOpen, setFocusedRankingOpen] = useState(false);

  // Plan a show sheet state
  const [planShowOpen, setPlanShowOpen] = useState(false);

  // Quick add sheet state (for "I was there" flow)
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddPrefill, setQuickAddPrefill] = useState<QuickAddPrefill | null>(null);

  // Todo action sheet state
  const [todoSheetOpen, setTodoSheetOpen] = useState(false);

  // Upcoming show detail sheet state (for calendar ghost tiles)
  const [selectedUpcomingShow, setSelectedUpcomingShow] = useState<import("@/hooks/usePlanUpcomingShow").UpcomingShow | null>(null);
  const [upcomingDetailOpen, setUpcomingDetailOpen] = useState(false);

  // Feed toggle: scene feed / near me / explore
  const [feedMode, setFeedMode] = useState<"scene" | "near-me" | "explore">("scene");
  // Sub-tab show type for near-me and explore
  const [nearMeShowType, setNearMeShowType] = useState<ShowTypeFilter>("set");
  const [exploreShowType, setExploreShowType] = useState<ShowTypeFilter>("set");

  // Calendar: Friends overlay toggle + friends-on-day sheet
  const [calendarFriendsMode, setCalendarFriendsMode] = useState(false);
  const [friendsDaySheetOpen, setFriendsDaySheetOpen] = useState(false);
  const [friendsDayDate, setFriendsDayDate] = useState<Date | null>(null);

  const { stats, statPills, insights, isLoading: statsLoading, refetch: refetchStats } = useHomeStats();
  const { upcomingShows, deleteUpcomingShow, updateRsvpStatus } = usePlanUpcomingShow();
  const { following, followers } = useFollowers();
  const followingIds = useMemo(() => following.map((f) => f.id), [following]);
  const { friendsByDate, friendShows } = useFriendUpcomingShows(followingIds);
  const { items: activityItems, isLoading: activityLoading } = useFriendActivity(followingIds);
  const { items: exploreItems, totalUsers: exploreTotalUsers, isLoading: exploreLoading } = usePopularShows(true, exploreShowType);
  const { items: nearMeItems, totalUsers: nearMeTotalUsers, isLoading: nearMeLoading, hasLocation: nearMeHasLocation } = usePopularNearMe(true, nearMeShowType);

  // Normalizer for PhotoOverlayEditor show format
  const normalizeShowForEditor = (show: Show) => ({
    ...show,
    artists: show.artists.map((a) => ({
      ...a,
      is_headliner: a.isHeadliner ?? false
    })),
    venue_name: show.venue?.name || "",
    show_date: show.date || ""
  });

  // Smart share handler - direct to editor if photo exists, otherwise quick photo add
  const handleShareFromCard = (show: Show) => {
    if (show.photo_url) {
      setDirectEditShow(show);
      setDirectEditOpen(true);
    } else {
      setQuickPhotoShow(show);
      setQuickPhotoOpen(true);
    }
  };

  // Card tap handler - opens ShowReviewSheet for detail view (review-first UX)
  const handleShowTap = (show: Show) => {
    setReviewShow(show);
    setReviewSheetOpen(true);
  };

  // Handler when photo is added via QuickPhotoAddSheet
  const handlePhotoAdded = (photoUrl: string) => {
    if (quickPhotoShow) {
      // Close the sheet and refresh shows - don't open the editor
      setQuickPhotoOpen(false);
      fetchShows();
    }
  };

  // Handler for sharing without photo - now goes to PhotoOverlayEditor
  const handleShareWithoutPhoto = () => {
    if (quickPhotoShow) {
      setQuickPhotoOpen(false);
      setDirectEditShow(quickPhotoShow);
      setDirectEditOpen(true);
    }
  };

  useEffect(() => {
    fetchShows();

    const channel = supabase.channel('shows_changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'shows'
    }, () => {
      fetchShows();
      refetchStats();
    }).subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [refetchStats]);

  // Effect to open ShowReviewSheet when openShowId is provided
  useEffect(() => {
    if (openShowId && shows.length > 0) {
      const showToOpen = shows.find((s) => s.id === openShowId);
      if (showToOpen) {
        setReviewShow(showToOpen);
        setReviewSheetOpen(true);
        onShowOpened?.();
      }
    }
  }, [openShowId, shows, onShowOpened]);

  const handleDeleteShow = async () => {
    if (!deleteConfirmShow) return;

    setIsDeleting(true);
    try {
      await supabase.from('show_artists').delete().eq('show_id', deleteConfirmShow.id);
      await supabase.from('show_rankings').delete().eq('show_id', deleteConfirmShow.id);
      await supabase.from('show_comparisons').delete().or(`show1_id.eq.${deleteConfirmShow.id},show2_id.eq.${deleteConfirmShow.id}`);

      const { error } = await supabase.from('shows').delete().eq('id', deleteConfirmShow.id);
      if (error) throw error;

      toast.success('Show deleted');
      setShows((prev) => prev.filter((s) => s.id !== deleteConfirmShow.id));
    } catch (error) {
      console.error('Error deleting show:', error);
      toast.error('Failed to delete show');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmShow(null);
    }
  };

  const fetchShows = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setShows([]);
        setLoading(false);
        return;
      }

      const { data: showsData, error: showsError } = await supabase.
      from('shows').
      select(`*, venues (latitude, longitude)`).
      eq('user_id', user.id).
      order('show_date', { ascending: false });

      if (showsError) throw showsError;

      const { data: rankingsData, error: rankingsError } = await supabase.
      from('show_rankings').
      select('show_id, elo_score, comparisons_count').
      eq('user_id', user.id);

      if (!rankingsError) {
        setRankings(rankingsData || []);
      }

      const showsWithArtists = await Promise.all((showsData || []).map(async (show) => {
        const { data: artistsData } = await supabase.from('show_artists').select('*').eq('show_id', show.id);
        const { data: tagsData } = await supabase.from('show_tags').select('tag').eq('show_id', show.id);
        return {
          id: show.id,
          artists: (artistsData || []).map((a) => ({ name: a.artist_name, isHeadliner: a.is_headliner, imageUrl: (a as any).artist_image_url || undefined, spotifyId: (a as any).spotify_artist_id || undefined })),
          venue: { name: show.venue_name, location: show.venue_location || '' },
          date: show.show_date,
          datePrecision: show.date_precision,
          tags: (tagsData || []).map((t) => t.tag),
          notes: show.notes,
          venueId: show.venue_id,
          latitude: show.venues?.latitude,
          longitude: show.venues?.longitude,
          photo_url: show.photo_url,
          photo_declined: show.photo_declined,
          eventName: show.event_name,
          eventDescription: (show as any).event_description,
          showType: show.show_type
        };
      }));

      setShows(showsWithArtists);
    } catch (error) {
      console.error('Error fetching shows:', error);
    } finally {
      setLoading(false);
    }
  };

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
      comparisonsCount: ranking.comparisons_count
    };
  }, [rankings, getAllShowsSortedByElo]);

  const getSortedShows = useCallback(() => {
    let filteredShows = shows;

    if (viewMode === "rankings") {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonthNum = now.getMonth();

      if (topRatedFilter === "this-year") {
        filteredShows = shows.filter((show) => parseISO(show.date).getFullYear() === currentYear);
      } else if (topRatedFilter === "last-year") {
        filteredShows = shows.filter((show) => parseISO(show.date).getFullYear() === currentYear - 1);
      } else if (topRatedFilter === "this-month") {
        filteredShows = shows.filter((show) => {
          const showDate = parseISO(show.date);
          return showDate.getFullYear() === currentYear && showDate.getMonth() === currentMonthNum;
        });
      }

      // Apply show type filter
      if (showTypeFilter !== "all") {
        filteredShows = filteredShows.filter((show) => show.showType === showTypeFilter);
      }

      // Apply search filter
      if (rankingsSearch.trim()) {
        const q = rankingsSearch.trim().toLowerCase();
        filteredShows = filteredShows.filter((show) => {
          const artistMatch = show.artists.some((a) => a.name.toLowerCase().includes(q));
          const venueMatch = show.venue.name.toLowerCase().includes(q);
          const locationMatch = show.venue.location?.toLowerCase().includes(q);
          return artistMatch || venueMatch || locationMatch;
        });
      }

      const rankingMap = new Map(rankings.map((r) => [r.show_id, { elo: r.elo_score, comparisons: r.comparisons_count }]));
      const sorted = [...filteredShows].sort((a, b) => {
        if (sortMode === "newest" || sortMode === "oldest") {
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        }
        // ELO sort
        const eloA = rankingMap.get(a.id)?.elo || 1200;
        const eloB = rankingMap.get(b.id)?.elo || 1200;
        if (eloB !== eloA) return eloB - eloA;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });

      if (sortMode === "worst" || sortMode === "oldest") {
        sorted.reverse();
      }

      return sorted;
    }
    return filteredShows;
  }, [shows, viewMode, topRatedFilter, showTypeFilter, sortMode, rankings, rankingsSearch]);

  const getShowsForDate = (date: Date) => shows.filter((show) => isSameDay(parseISO(show.date), date));

  const handlePillTap = (action: StatPillAction, payload?: string) => {
    switch (action) {
      case 'rankings':
        setViewMode('rankings');
        break;
      case 'calendar':
        setViewMode('calendar');
        break;
      case 'globe':
        setViewMode('globe');
        break;
      case 'rank-tab':
        setViewMode('rank');
        break;
      case 'todo-sheet':
        setTodoSheetOpen(true);
        break;
      case 'rankings-attention':
        setAttentionFilterActive(true);
        setRankingsSearch("");
        setTopRatedFilter("all-time");
        setShowTypeFilter("all");
        setViewMode('rankings');
        break;
      case 'show-detail':
        if (payload) {
          const show = shows.find((s) => s.id === payload);
          if (show) {
            setReviewShow(show);
            setReviewSheetOpen(true);
          }
        }
        break;
    }
  };

  const handleBackToHome = () => {
    setViewMode('home');
  };

  // Render functions for sub-views
  const renderHomeView = () => {

    return (
      <div className="space-y-5">
        {/* Stat Pills */}
        <StatPills stats={statPills} isLoading={statsLoading} onPillTap={handlePillTap} showsTourActive={showsTourActive} showsRef={showsRef} />

        {/* What's Next Strip */}
        <WhatsNextStrip onPlanShow={() => setPlanShowOpen(true)} />


        {/* Scene Feed / Popular Near Me / Explore — toggle */}
        <div className="space-y-3">
          {/* Tab headers */}
          <div className="flex items-center gap-4">
            {(["scene", "near-me", "explore"] as const).map((mode) => {
              const labels = { scene: "Scene Feed", "near-me": "Popular Near Me", explore: "Explore" };
              const isActive = feedMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setFeedMode(mode)}
                  className={cn(
                    "text-[11px] uppercase tracking-[0.2em] font-semibold transition-colors",
                    isActive ? "text-white/80" : "text-white/30 hover:text-white/50"
                  )}
                  style={isActive ? { textShadow: "0 0 8px rgba(255,255,255,0.2)" } : undefined}>

                  {labels[mode]}
                </button>);

            })}
          </div>

          {/* Content */}
          {feedMode === "scene" &&
          <FriendActivityFeed
            items={activityItems}
            isLoading={activityLoading}
            hasFollowing={following.length > 0}
            onFindFriends={() => setViewMode("friends")}
            onIWasThere={(payload: IWasTherePayload) => {
              setQuickAddPrefill({
                showType: payload.showType as any || 'set',
                artistName: payload.artistName,
                artistImageUrl: (payload as any).artistImageUrl || null,
                venueName: payload.venueName,
                venueLocation: (payload as any).venueLocation || null,
                showDate: payload.showDate
              });
              setQuickAddOpen(true);
            }} />

          }
          {feedMode === "near-me" &&
          <PopularFeedGrid
            items={nearMeItems}
            totalUsers={nearMeTotalUsers}
            isLoading={nearMeLoading}
            showType={nearMeShowType}
            onShowTypeChange={setNearMeShowType}
            onQuickAdd={(item) => {
              setQuickAddPrefill({
                showType: item.type === 'artist' ? 'set' : (item as any).showType || 'set',
                artistName: item.type === 'artist' ? item.artistName : (item as any).topArtists?.[0] || (item as any).eventName,
                artistImageUrl: item.type === 'artist' ? item.artistImageUrl : (item as any).imageUrl,
                venueName: item.type === 'artist' ? item.sampleVenueName : (item as any).venueName,
                venueLocation: item.type === 'artist' ? (item as any).sampleVenueLocation : (item as any).venueLocation,
                showDate: item.sampleShowDate
              });
              setQuickAddOpen(true);
            }}
            onFindFriends={() => setViewMode("friends")}
            emptyMessage={nearMeHasLocation === false ? "Set your home city in your profile to see what's popular near you." : undefined} />

          }
          {feedMode === "explore" &&
          <PopularFeedGrid
            items={exploreItems}
            totalUsers={exploreTotalUsers}
            isLoading={exploreLoading}
            showType={exploreShowType}
            onShowTypeChange={setExploreShowType}
            onQuickAdd={(item) => {
              setQuickAddPrefill({
                showType: item.type === 'artist' ? 'set' : (item as any).showType || 'set',
                artistName: item.type === 'artist' ? item.artistName : (item as any).topArtists?.[0] || (item as any).eventName,
                artistImageUrl: item.type === 'artist' ? item.artistImageUrl : (item as any).imageUrl,
                venueName: item.type === 'artist' ? item.sampleVenueName : (item as any).venueName,
                venueLocation: item.type === 'artist' ? (item as any).sampleVenueLocation : (item as any).venueLocation,
                showDate: item.sampleShowDate
              });
              setQuickAddOpen(true);
            }}
            onFindFriends={() => setViewMode("friends")} />

          }
        </div>
      </div>);

  };

  const renderRankingsView = () => {
    const rankingMap = new Map(rankings.map((r) => [r.show_id, r]));

    // Compute attention status per show — must match what useHomeStats counts
    const getAttentionNeeds = (show: Show) => {
      const needs: string[] = [];
      const ranking = rankingMap.get(show.id);
      if (!ranking || ranking.comparisons_count === 0) needs.push("unranked");
      if (!show.photo_url && !show.photo_declined) needs.push("no moment");
      if (!show.tags || show.tags.length === 0) needs.push("no highlights");
      return needs;
    };

    // Always compute attention shows from the FULL shows list (ignore date/type filters)
    const attentionShows = shows.filter((s) => getAttentionNeeds(s).length > 0);

    // When attention filter is active, show all attention shows regardless of date/type filters
    let sortedShows = attentionFilterActive ?
    attentionShows :
    getSortedShows();
    const filteredShowIds = sortedShows.map((s) => s.id);

    return (
      <div className="space-y-4">

        {/* Needs Attention strip — only show when there are shows needing attention */}
        {!loading && attentionShows.length > 0 &&
        <button
          onClick={() => {
            setAttentionFilterActive((prev) => !prev);
            setRankingsSearch(""); // clear any active search
          }}
          className={cn(
            "w-full text-left rounded-2xl border px-4 py-3 transition-all duration-200",
            attentionFilterActive ?
            "bg-amber-500/[0.10] border-amber-500/30" :
            "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
          )}>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                attentionFilterActive ? "bg-amber-500/20" : "bg-white/[0.06]"
              )}>
                  <span className="text-sm">✦</span>
                </div>
                <div>
                  <p className={cn(
                  "text-sm font-semibold leading-snug",
                  attentionFilterActive ? "text-amber-300" : "text-white/80"
                )}>
                    {attentionFilterActive ?
                  `Showing ${attentionShows.length} show${attentionShows.length === 1 ? "" : "s"} needing attention` :
                  `${attentionShows.length} show${attentionShows.length === 1 ? "" : "s"} need${attentionShows.length === 1 ? "s" : ""} attention`}
                  </p>
                  {!attentionFilterActive &&
                <p className="text-[11px] text-white/35 mt-0.5">
                      {[
                  rankings.filter((r) => r.comparisons_count === 0).length > 0 && `${rankings.filter((r) => r.comparisons_count === 0).length} unranked`,
                  shows.filter((s) => !s.photo_url && !s.photo_declined).length > 0 && `${shows.filter((s) => !s.photo_url && !s.photo_declined).length} without a moment`,
                  shows.filter((s) => !s.tags || s.tags.length === 0).length > 0 && `${shows.filter((s) => !s.tags || s.tags.length === 0).length} without highlights`].
                  filter(Boolean).join(" · ")}
                    </p>
                }
                </div>
              </div>
              <span className={cn(
              "text-xs font-semibold px-2.5 py-1 rounded-full transition-colors",
              attentionFilterActive ?
              "bg-amber-500/20 text-amber-300" :
              "bg-white/[0.06] text-white/40"
            )}>
                {attentionFilterActive ? "Clear" : "Review"}
              </span>
            </div>
          </button>
        }

        {/* Mini bar chart — shows per month */}
        {!attentionFilterActive &&
        <ShowsBarChart shows={sortedShows} timeFilter={topRatedFilter} />
        }

        {/* Search bar — hidden when attention filter active */}
        {!attentionFilterActive &&
        <div className="relative" ref={searchBarCallbackRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
            type="text"
            placeholder="Search artist, venue, or city..."
            value={rankingsSearch}
            onChange={(e) => setRankingsSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-9 rounded-lg text-sm bg-white/[0.05] border border-white/[0.08] text-foreground placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200" />

            {rankingsSearch &&
          <button
            onClick={() => setRankingsSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors">

                <X className="h-4 w-4" />
              </button>
          }
          </div>
        }

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-4">
          <Select value={topRatedFilter} onValueChange={(v) => setTopRatedFilter(v as typeof topRatedFilter)}>
            <SelectTrigger className="w-[140px] bg-white/[0.05] border-white/[0.08] text-white/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-time">All Time</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const cycle: Array<"best" | "worst" | "newest" | "oldest"> = ["best", "worst", "newest", "oldest"];
              setSortMode((prev) => cycle[(cycle.indexOf(prev) + 1) % cycle.length]);
            }}
            className="flex items-center gap-2 bg-white/[0.05] border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white">

            <ArrowUpDown className="h-4 w-4" />
            <span>{{ best: "Best", worst: "Worst", newest: "Newest", oldest: "Oldest" }[sortMode]}</span>
          </Button>
        </div>

        {/* Show type filter pills */}
        {(() => {
          const typeCounts = {
            set: shows.filter((s) => s.showType === "set").length,
            show: shows.filter((s) => s.showType === "show").length,
            festival: shows.filter((s) => s.showType === "festival").length
          };
          const hasMultipleTypes = [typeCounts.set > 0, typeCounts.show > 0, typeCounts.festival > 0].filter(Boolean).length > 1;
          if (!hasMultipleTypes) return null;
          const pills: {value: typeof showTypeFilter;label: string;count: number;}[] = [
          { value: "all", label: "All", count: shows.length },
          ...(typeCounts.set > 0 ? [{ value: "set" as const, label: "Sets", count: typeCounts.set }] : []),
          ...(typeCounts.show > 0 ? [{ value: "show" as const, label: "Shows", count: typeCounts.show }] : []),
          ...(typeCounts.festival > 0 ? [{ value: "festival" as const, label: "Festivals", count: typeCounts.festival }] : [])];

          return (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {pills.map((pill) =>
              <button
                key={pill.value}
                onClick={() => setShowTypeFilter(pill.value)}
                className={cn(
                  "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border",
                  showTypeFilter === pill.value ?
                  "bg-primary/20 border-primary/40 text-primary" :
                  "bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/70"
                )}>

                  {pill.label}
                  <span className={cn(
                  "text-[10px] font-bold tabular-nums",
                  showTypeFilter === pill.value ? "text-primary/70" : "text-white/30"
                )}>
                    {pill.count}
                  </span>
                </button>
              )}
            </div>);

        })()}

        {/* Loading skeletons */}

        {loading ?
        <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) =>
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
          )}
          </div> :
        sortedShows.length === 0 ?
        <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative flex items-center justify-center">
                <span
                className="text-4xl font-black tracking-[0.25em] select-none"
                style={{ textShadow: "0 0 12px rgba(255,255,255,0.7), 0 0 30px rgba(255,255,255,0.4), 0 0 60px rgba(255,255,255,0.2)" }}>

                  ✦
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white/80 mb-1" style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}>
              {attentionFilterActive ? "Nothing needs attention right now" : rankingsSearch.trim() ? "No shows match your search" : "No shows match this filter"}
            </h3>
            <p className="text-sm text-white/50">
              {attentionFilterActive ? "All your shows are ranked and have moments." : rankingsSearch.trim() ? "Try a different artist, venue, or city" : "Try selecting a different time period"}
            </p>
            {attentionFilterActive &&
          <button
            onClick={() => setAttentionFilterActive(false)}
            className="mt-4 text-sm font-medium text-primary/80 hover:text-primary transition-colors underline underline-offset-2">

                View all shows
              </button>
          }
          </div> :

        <div className="flex flex-col gap-3">
            {sortedShows.map((show) => {
            const baseRankInfo = getShowRankInfo(show.id, filteredShowIds);
            const rankInfo = sortMode === "worst" && baseRankInfo.position ?
            { ...baseRankInfo, position: baseRankInfo.total - baseRankInfo.position + 1 } :
            baseRankInfo;
            const attentionNeeds = getAttentionNeeds(show);
            return (
              <SwipeableRankingCard
                key={show.id}
                onDelete={() => setDeleteConfirmShow(show)}>

                  <Card
                  className="border-white/[0.08] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 cursor-pointer relative overflow-hidden"
                  onClick={() => handleShowTap(show)}>

                    <CardContent className="p-4 relative">
                      <div className="flex gap-4 pr-2">
                        {/* Thumbnail */}
                        {show.photo_url ?
                      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md border border-white/10">
                            <img src={show.photo_url} alt="Show photo" className="w-full h-full object-cover" />
                          </div> :

                      <div
                        className="relative w-20 h-20 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0 border border-white/[0.08] group cursor-pointer hover:bg-white/[0.08] transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setQuickPhotoShow(show);
                          setQuickPhotoOpen(true);
                        }}>

                            <span className="text-2xl text-white/40 select-none" style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}>✦</span>
                            <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-primary/80 flex items-center justify-center shadow-lg opacity-70 group-hover:opacity-100 transition-opacity">
                              <Plus className="h-3 w-3 text-primary-foreground" />
                            </div>
                          </div>
                      }

                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Artist name */}
                          <div className="font-bold text-base leading-tight truncate" style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}>
                            {show.artists.slice(0, 2).map((artist, idx) =>
                          <span key={idx}>
                                {artist.name}
                                {idx < Math.min(show.artists.length - 1, 1) && <span className="text-white/40"> • </span>}
                              </span>
                          )}
                            {show.artists.length > 2 &&
                          <span className="text-white/40 font-normal"> +{show.artists.length - 2}</span>
                          }
                          </div>
                          {/* Venue */}
                          <div className="text-sm text-white/60 truncate" style={{ textShadow: "0 0 8px rgba(255,255,255,0.15)" }}>
                            {show.venue.name}
                          </div>
                          {/* Date */}
                          <div className="text-sm text-white/60" style={{ textShadow: "0 0 8px rgba(255,255,255,0.15)" }}>
                            {format(parseISO(show.date), parseISO(show.date).getFullYear() === new Date().getFullYear() ? "MMM d" : "MMM yyyy")}
                          </div>

                          {/* Attention chips — always visible for incomplete shows */}
                          {attentionNeeds.length > 0 &&
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {attentionNeeds.includes("unranked") &&
                          <button
                            onClick={(e) => {e.stopPropagation();setFocusedRankingOpen(true);}}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/[0.15] border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400/50 transition-colors cursor-pointer">

                                  ↕ Rank it
                                </button>
                          }
                              {attentionNeeds.includes("no moment") &&
                          <span
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/[0.12] border border-sky-500/25 text-sky-400/80 cursor-pointer hover:border-sky-400/40 hover:text-sky-300 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickPhotoShow(show);
                              setQuickPhotoOpen(true);
                            }}>

                                  + Add moment
                                </span>
                          }
                              {attentionNeeds.includes("no highlights") &&
                          <button
                            onClick={(e) => {e.stopPropagation();setIncompleteTagsFocusId(show.id);setIncompleteTagsOpen(true);}}
                            className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/[0.12] border border-violet-500/25 text-violet-300/80 hover:bg-violet-500/20 hover:border-violet-400/40 hover:text-violet-200 transition-colors cursor-pointer">

                                  ✦ Add highlights
                                </button>
                          }
                            </div>
                        }
                        </div>
                      </div>

                      <div className="absolute bottom-3 right-3">
                        <ShowRankBadge position={rankInfo.position} total={rankInfo.total} comparisonsCount={rankInfo.comparisonsCount} />
                      </div>
                    </CardContent>
                  </Card>
                </SwipeableRankingCard>);

          })}
          </div>
        }
      </div>);

  };



  const getUpcomingShowsForDate = (date: Date) =>
  upcomingShows.filter((s) => s.show_date && isSameDay(parseISO(s.show_date), date));

  const rsvpDotClass = (status: string) => {
    if (status === "going") return "bg-emerald-400";
    if (status === "maybe") return "bg-amber-400";
    return "bg-red-400";
  };

  const renderCalendarView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = monthStart.getDay();
    const currentYear = currentMonth.getFullYear();
    const currentMonthIndex = currentMonth.getMonth();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const years = Array.from({ length: new Date().getFullYear() - 1989 + 1 }, (_, i) => 1990 + i);

    // Count unique friends with shows this month for the badge
    const friendsThisMonth = new Set<string>();
    friendsByDate.forEach((friends, isoDate) => {
      const d = parseISO(isoDate);
      if (d.getFullYear() === currentYear && d.getMonth() === currentMonthIndex) {
        friends.forEach((f) => friendsThisMonth.add(f.id));
      }
    });

    return (
      <div className="space-y-4">
        {/* Header row: [month+year] [friends pill] [‹ ›] */}
        <div className="flex items-center gap-2">
          {/* Left: month + year selectors */}
          <div className="flex items-center gap-1.5">
            <Select value={months[currentMonthIndex]} onValueChange={(value) => {
              const monthIndex = months.indexOf(value);
              setCurrentMonth(new Date(currentYear, monthIndex));
            }}>
              <SelectTrigger className="w-[82px] h-8 text-xs">
                <span>{months[currentMonthIndex]?.slice(0, 3) ?? 'Jan'}</span>
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => <SelectItem key={month} value={month}>{month}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={currentYear.toString()} onValueChange={(value) => {
              setCurrentMonth(new Date(parseInt(value), currentMonthIndex));
            }}>
              <SelectTrigger className="w-[58px] h-8 text-xs">
                <span>'{String(currentYear).slice(2)}</span>
              </SelectTrigger>
              <SelectContent>
                {years.reverse().map((year) => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Center: Friends toggle pill */}
          <div className="flex-1 flex justify-center">
            <button
              onClick={() => setCalendarFriendsMode((v) => !v)}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-semibold uppercase tracking-[0.1em] transition-all border ${
              calendarFriendsMode ?
              "bg-primary/20 border-primary/50 text-primary" :
              "bg-white/[0.05] border-white/10 text-white/40 hover:text-white/60"}`
              }>

              <Users className="h-3 w-3" />
              Friends
              {friendsThisMonth.size > 0 &&
              <span className={`text-[9px] font-bold leading-none px-1 py-0.5 rounded-full ${
              calendarFriendsMode ? "bg-primary/40 text-primary-foreground" : "bg-white/15 text-white/60"}`
              }>
                  {friendsThisMonth.size}
                </span>
              }
            </button>
          </div>

          {/* Right: prev/next nav */}
          <div className="flex items-center gap-1">
            <Button onClick={() => setCurrentMonth(new Date(currentYear, currentMonthIndex - 1))} size="sm" variant="default" className="h-8 w-8 p-0">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button onClick={() => setCurrentMonth(new Date(currentYear, currentMonthIndex + 1))} size="sm" variant="default" className="h-8 w-8 p-0">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Legend when friends mode is on */}
        {calendarFriendsMode &&
        <div className="flex items-center gap-4 px-1">
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-primary/30 border border-primary/50" />
              <span className="text-[10px] text-white/40">Mine</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-violet-500/30 border border-violet-500/50" />
              <span className="text-[10px] text-white/40">Friends</span>
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-3 h-3 rounded-sm bg-emerald-500/30 border border-emerald-500/50" />
              <span className="text-[10px] text-white/40">Both</span>
            </div>
          </div>
        }

        <div className="grid grid-cols-7 gap-1.5">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) =>
          <div key={day} className="text-center text-[10px] font-medium text-muted-foreground py-1">{day}</div>
          )}
          
          {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
          
          {days.map((day) => {
            const dayShows = getShowsForDate(day);
            const dayUpcoming = getUpcomingShowsForDate(day);
            const todayCell = isToday(day);
            const futureDay = isFuture(day) && !todayCell;

            // Friends data for this day
            const isoDate = format(day, "yyyy-MM-dd");
            const friendsOnDay = friendsByDate.get(isoDate) ?? [];
            const hasFriendActivity = calendarFriendsMode && friendsOnDay.length > 0;
            const hasMineActivity = dayShows.length > 0 || dayUpcoming.length > 0;
            const hasContent = hasMineActivity;
            const bothOnDay = hasFriendActivity && hasMineActivity;

            // Ring color for friends mode
            const friendModeRing = calendarFriendsMode && hasFriendActivity ?
            bothOnDay ?
            "ring-1 ring-emerald-400/70" :
            "ring-1 ring-violet-400/60" :
            "";

            return (
              <div
                key={day.toISOString()}
                className={`aspect-square flex flex-col items-center justify-center relative transition-all rounded-lg
                  ${hasContent ? "bg-card" : "bg-background"}
                  ${todayCell ? "ring-2 ring-cyan-400/60 bg-cyan-500/10" : ""}
                  ${!todayCell && friendModeRing ? friendModeRing : ""}
                  ${calendarFriendsMode && hasFriendActivity && !hasMineActivity ? "bg-violet-500/[0.07]" : ""}
                  ${calendarFriendsMode && bothOnDay ? "bg-emerald-500/[0.06]" : ""}
                `}
                style={todayCell ? { boxShadow: "0 0 8px 1px hsl(var(--primary) / 0.15)" } : undefined}>

                {/* Today date number */}
                {todayCell &&
                <span className="absolute top-1 left-0 right-0 text-center text-[9px] font-bold text-cyan-400 leading-none">
                    {format(day, "d")}
                  </span>
                }

                {/* Past show tiles (Mine) */}
                {dayShows.length > 0 &&
                <div className="flex flex-wrap gap-0.5 items-center justify-center p-1">
                    {dayShows.map((show) => {
                    const rankInfo = getShowRankInfo(show.id);
                    const rankDisplay = rankInfo.position ? `#${rankInfo.position}` : "New";
                    return (
                      <button
                        key={show.id}
                        className="relative hover:scale-110 transition-transform cursor-pointer"
                        title={`${show.artists.map((a) => a.name).join(", ")} - ${show.venue.name}`}
                        onClick={() => handleShowTap(show)}>

                          {show.photo_url ?
                        <div className="relative w-8 h-8">
                              <img src={show.photo_url} alt="Show" className="w-8 h-8 rounded object-cover shadow-lg" />
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white" style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                                {rankDisplay}
                              </div>
                            </div> :
                        (() => {
                          const artistImage = show.artists.find((a) => a.isHeadliner)?.imageUrl || show.artists[0]?.imageUrl;
                          return artistImage ?
                          <div className="relative w-8 h-8">
                                <img src={artistImage} alt="Artist" className="w-8 h-8 rounded object-cover shadow-lg" />
                                <div className="absolute inset-0 rounded bg-black/30 flex items-center justify-center text-[10px] font-bold text-white" style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                                  {rankDisplay}
                                </div>
                              </div> :

                          <div className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground shadow-lg">
                                {rankDisplay}
                              </div>;

                        })()}
                        </button>);

                  })}
                  </div>
                }

                {/* Upcoming / ghost tiles (Mine) */}
                {dayUpcoming.length > 0 &&
                <div className="flex flex-wrap gap-0.5 items-center justify-center p-1">
                    {dayUpcoming.map((upcoming) => {
                    const upcomingIsoDate = upcoming.show_date ?? "";
                    const friendsHere = friendsByDate.get(upcomingIsoDate) ?? [];
                    const visibleFriends = friendsHere.slice(0, 2);
                    const overflowCount = friendsHere.length - visibleFriends.length;
                    return (
                      <button
                        key={upcoming.id}
                        className="relative hover:scale-110 transition-transform cursor-pointer opacity-60"
                        title={`${upcoming.artist_name}${upcoming.venue_name ? ` - ${upcoming.venue_name}` : ""}`}
                        onClick={() => {
                          setSelectedUpcomingShow(upcoming);
                          setUpcomingDetailOpen(true);
                        }}>

                          {upcoming.artist_image_url ?
                        <div className="relative w-8 h-8">
                              <img
                            src={upcoming.artist_image_url}
                            alt={upcoming.artist_name}
                            className="w-8 h-8 rounded object-cover shadow-lg"
                            style={{ filter: "brightness(0.75)" }} />

                              <div className="absolute inset-0 rounded border border-dashed border-white/40" />
                              <span className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-black/30 ${rsvpDotClass(upcoming.rsvp_status)}`} />
                              {visibleFriends.length > 0 &&
                          <div className="absolute top-0.5 left-0.5 flex items-center">
                                  {visibleFriends.map((friend, i) =>
                            friend.avatar_url ?
                            <img key={friend.id} src={friend.avatar_url} alt={friend.username ?? "Friend"} className="w-3 h-3 rounded-full border border-black/60 object-cover" style={{ marginLeft: i === 0 ? 0 : -4, zIndex: i }} /> :

                            <div key={friend.id} className="w-3 h-3 rounded-full border border-black/60 bg-primary/60 flex items-center justify-center" style={{ marginLeft: i === 0 ? 0 : -4, zIndex: i }}>
                                        <span className="text-[6px] font-bold text-primary-foreground leading-none">{(friend.username ?? friend.full_name ?? "?")[0].toUpperCase()}</span>
                                      </div>

                            )}
                                  {overflowCount > 0 &&
                            <div className="w-3 h-3 rounded-full border border-black/60 bg-muted/80 flex items-center justify-center" style={{ marginLeft: -4, zIndex: visibleFriends.length }}>
                                      <span className="text-[5px] font-bold text-foreground leading-none">+{overflowCount}</span>
                                    </div>
                            }
                                </div>
                          }
                            </div> :

                        <div className="relative w-8 h-8 rounded border border-dashed border-white/30 flex items-center justify-center bg-primary/10">
                              <span className="text-[9px] font-bold text-primary/70 leading-none text-center px-0.5 truncate">{upcoming.artist_name.split(" ")[0]}</span>
                              <span className={`absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-black/30 ${rsvpDotClass(upcoming.rsvp_status)}`} />
                              {visibleFriends.length > 0 &&
                          <div className="absolute top-0.5 left-0.5 flex items-center">
                                  {visibleFriends.map((friend, i) =>
                            friend.avatar_url ?
                            <img key={friend.id} src={friend.avatar_url} alt={friend.username ?? "Friend"} className="w-3 h-3 rounded-full border border-black/60 object-cover" style={{ marginLeft: i === 0 ? 0 : -4, zIndex: i }} /> :

                            <div key={friend.id} className="w-3 h-3 rounded-full border border-black/60 bg-primary/60 flex items-center justify-center" style={{ marginLeft: i === 0 ? 0 : -4, zIndex: i }}>
                                        <span className="text-[6px] font-bold text-primary-foreground leading-none">{(friend.username ?? friend.full_name ?? "?")[0].toUpperCase()}</span>
                                      </div>

                            )}
                                  {overflowCount > 0 &&
                            <div className="w-3 h-3 rounded-full border border-black/60 bg-muted/80 flex items-center justify-center" style={{ marginLeft: -4, zIndex: visibleFriends.length }}>
                                      <span className="text-[5px] font-bold text-foreground leading-none">+{overflowCount}</span>
                                    </div>
                            }
                                </div>
                          }
                            </div>
                        }
                        </button>);

                  })}
                  </div>
                }

                {/* Friends overlay: when friends mode is ON and friends are on this day, show avatar stack */}
                {calendarFriendsMode && friendsOnDay.length > 0 && !hasMineActivity &&
                <button
                  className="flex flex-col items-center justify-center gap-0.5 w-full h-full px-0.5"
                  onClick={() => {setFriendsDayDate(day);setFriendsDaySheetOpen(true);}}>

                    {/* Stacked avatars */}
                    <div className="flex items-center justify-center">
                      {friendsOnDay.slice(0, 3).map((friend, i) =>
                    friend.avatar_url ?
                    <img
                      key={friend.id}
                      src={friend.avatar_url}
                      alt={friend.username ?? "Friend"}
                      className="w-4 h-4 rounded-full border border-black/60 object-cover"
                      style={{ marginLeft: i === 0 ? 0 : -5, zIndex: 3 - i }} /> :


                    <div
                      key={friend.id}
                      className="w-4 h-4 rounded-full border border-black/60 bg-violet-500/70 flex items-center justify-center"
                      style={{ marginLeft: i === 0 ? 0 : -5, zIndex: 3 - i }}>

                            <span className="text-[6px] font-bold text-white leading-none">
                              {(friend.username ?? friend.full_name ?? "?")[0].toUpperCase()}
                            </span>
                          </div>

                    )}
                    </div>
                    {friendsOnDay.length > 3 &&
                  <span className="text-[7px] font-semibold text-violet-300/80 leading-none">+{friendsOnDay.length - 3}</span>
                  }
                    <span className="text-[7px] text-white/30 leading-none">{format(day, "d")}</span>
                  </button>
                }

                {/* Friends overlay indicator on days where both user AND friends have shows */}
                {calendarFriendsMode && hasFriendActivity && hasMineActivity &&
                <button
                  className="absolute bottom-0.5 left-0 right-0 flex justify-center"
                  onClick={() => {setFriendsDayDate(day);setFriendsDaySheetOpen(true);}}
                  title={`${friendsOnDay.length} friend${friendsOnDay.length > 1 ? "s" : ""} also going`}>

                    <div className="flex items-center gap-0.5">
                      {friendsOnDay.slice(0, 2).map((friend, i) =>
                    friend.avatar_url ?
                    <img key={friend.id} src={friend.avatar_url} alt="" className="w-2.5 h-2.5 rounded-full border border-black/40 object-cover" style={{ marginLeft: i === 0 ? 0 : -3 }} /> :

                    <div key={friend.id} className="w-2.5 h-2.5 rounded-full border border-black/40 bg-violet-500/70 flex items-center justify-center" style={{ marginLeft: i === 0 ? 0 : -3 }}>
                            <span className="text-[5px] font-bold text-white leading-none">{(friend.username ?? friend.full_name ?? "?")[0].toUpperCase()}</span>
                          </div>

                    )}
                      {friendsOnDay.length > 2 && <span className="text-[6px] text-violet-300/70 font-bold leading-none">+{friendsOnDay.length - 2}</span>}
                    </div>
                  </button>
                }

                {/* Empty day dot */}
                {!hasContent && !hasFriendActivity &&
                <div className={`w-1.5 h-1.5 rounded-full ${futureDay ? "bg-muted-foreground/15" : "bg-muted-foreground/30"}`} />
                }

                {/* Date number on empty days in friends mode */}
                {!hasContent && hasFriendActivity && !calendarFriendsMode &&
                <div className={`w-1.5 h-1.5 rounded-full ${futureDay ? "bg-muted-foreground/15" : "bg-muted-foreground/30"}`} />
                }
              </div>);

          })}
        </div>
      </div>);

  };

  const renderSubViewHeader = (title: string) =>
  <div className="flex items-center gap-3 mb-4">
      <Button variant="ghost" size="icon" onClick={handleBackToHome} className="h-9 w-9">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>;


  const renderFriendsView = () => <FriendsPanelView />;

  return (
    <div className="space-y-4">
      {/* Spotify-style horizontal pill sub-nav */}
      <ContentPillNav
        activeView={viewMode}
        onViewChange={(v) => setViewMode(v)}
        rankNudge={stats.unrankedCount > 0 || stats.incompleteTagsCount > 0} />


      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}>

          {viewMode === 'home' && renderHomeView()}

          {viewMode === 'calendar' &&
          <ScheduleView
            shows={shows}
            rankings={rankings}
            upcomingShows={upcomingShows}
            friendsByDate={friendsByDate}
            friendShows={friendShows}
            onShowTap={handleShowTap}
            onUpcomingTap={(show) => {setSelectedUpcomingShow(show);setUpcomingDetailOpen(true);}}
            onFriendShowTap={(fs) => {
              // Convert FriendShow to UpcomingShow shape so the detail sheet can display it
              const asUpcoming: import("@/hooks/usePlanUpcomingShow").UpcomingShow = {
                id: fs.id,
                artist_name: fs.artist_name,
                venue_name: fs.venue_name,
                venue_location: fs.venue_location,
                show_date: fs.show_date,
                ticket_url: null,
                artist_image_url: fs.artist_image_url,
                rsvp_status: "going",
                created_at: ""
              };
              setSelectedUpcomingShow(asUpcoming);
              setUpcomingDetailOpen(true);
            }}
            onPlanShow={() => setPlanShowOpen(true)}
            calendarFriendsMode={calendarFriendsMode}
            onToggleFriendsMode={() => setCalendarFriendsMode((v) => !v)}
            followingCount={following.length} />

          }

          {viewMode === 'globe' &&
          <MapView
            shows={shows}
            onEditShow={(show) => {setEditShow(show);setEditDialogOpen(true);}}
            onAddFromPhotos={onAddFromPhotos}
            onAddSingleShow={onAddSingleShow}
            onShowTap={(show) => {setReviewShow(show);setReviewSheetOpen(true);}} />

          }

          {viewMode === 'rank' &&
          <Rank
            onAddShow={onAddSingleShow}
            onViewAllShows={() => setViewMode('rankings')} />

          }

          {viewMode === 'rankings' && renderRankingsView()}

          {viewMode === 'friends' && renderFriendsView()}
        </motion.div>
      </AnimatePresence>

      {/* Floating search button — appears when search bar scrolls out of view in My Shows */}
      <AnimatePresence>
        {viewMode === 'rankings' && searchBarHidden && !attentionFilterActive && !floatingSearchOpen &&
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 400, damping: 25 }}
          onClick={() => setFloatingSearchOpen(true)}
          className="fixed bottom-[8.5rem] right-[1.85rem] z-[51] w-10 h-10 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.16] flex items-center justify-center shadow-lg hover:bg-white/[0.14] hover:border-white/[0.22] transition-colors active:scale-95 py-0 px-0 my-[10px] mx-[5px]">

            <Search className="h-5 w-5 text-foreground/80" />
          </motion.button>
        }
      </AnimatePresence>

      {/* Floating search sheet */}
      <Sheet open={floatingSearchOpen} onOpenChange={setFloatingSearchOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl border-t border-white/[0.12] bg-background/95 backdrop-blur-xl px-4 pb-8 pt-4">
          <SheetHeader className="sr-only">
            <SheetTitle>Search Shows</SheetTitle>
          </SheetHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              autoFocus
              placeholder="Search artist, venue, or city..."
              value={rankingsSearch}
              onChange={(e) => setRankingsSearch(e.target.value)}
              className="w-full h-11 pl-9 pr-9 rounded-xl text-sm bg-white/[0.05] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200" />

            {rankingsSearch &&
            <button
              onClick={() => setRankingsSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground/70 transition-colors">

                <X className="h-4 w-4" />
              </button>
            }
          </div>
          {rankingsSearch.trim() &&
          <p className="text-xs text-muted-foreground/50 mt-2 text-center">
              Results are filtered in your list below
            </p>
          }
        </SheetContent>
      </Sheet>

      
      {/* Incomplete Tags Sheet */}
      <IncompleteTagsSheet
        open={incompleteTagsOpen}
        onOpenChange={(open) => {setIncompleteTagsOpen(open);if (!open) setIncompleteTagsFocusId(null);}}
        focusShowId={incompleteTagsFocusId}
        onComplete={() => {
          refetchStats();
          fetchShows();
        }} />

      
      {/* Missing Photos Sheet */}
      <MissingPhotosSheet
        open={missingPhotosOpen}
        onOpenChange={setMissingPhotosOpen}
        onComplete={() => {
          refetchStats();
          fetchShows();
        }} />

      
      {/* Quick Photo Add Sheet for shows without photos */}
      <QuickPhotoAddSheet
        show={quickPhotoShow}
        open={quickPhotoOpen}
        onOpenChange={setQuickPhotoOpen}
        onPhotoAdded={handlePhotoAdded}
        onShareWithoutPhoto={handleShareWithoutPhoto} />

      
      {/* Direct Photo Overlay Editor for feed cards */}
      <Sheet open={directEditOpen} onOpenChange={setDirectEditOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-hidden flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>Share to Instagram</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {directEditShow &&
            <PhotoOverlayEditor
              show={normalizeShowForEditor(directEditShow)}
              onClose={() => setDirectEditOpen(false)}
              allShows={shows.map(normalizeShowForEditor)}
              rankings={rankings} />

            }
          </div>
        </SheetContent>
      </Sheet>
      
      <ShowReviewSheet
        show={reviewShow}
        open={reviewSheetOpen}
        onOpenChange={setReviewSheetOpen}
        onEdit={(show) => {
          setEditShow(show);
          setEditDialogOpen(true);
        }}
        onShareToEditor={(show) => {
          setDirectEditShow(show);
          setDirectEditOpen(true);
        }}
        onDelete={async (showId) => {
          try {
            await supabase.from('show_tags').delete().eq('show_id', showId);
            await supabase.from('show_artists').delete().eq('show_id', showId);
            await supabase.from('show_rankings').delete().eq('show_id', showId);
            await supabase.from('show_comparisons').delete().or(`show1_id.eq.${showId},show2_id.eq.${showId}`);
            const { error } = await supabase.from('shows').delete().eq('id', showId);
            if (error) throw error;
            toast.success('Show deleted');
            setShows((prev) => prev.filter((s) => s.id !== showId));
          } catch (error) {
            console.error('Error deleting show:', error);
            toast.error('Failed to delete show');
          }
        }}
        allShows={shows}
        rankings={rankings} />


      {/* Plan Show Sheet */}
      <PlanShowSheet open={planShowOpen} onOpenChange={setPlanShowOpen} />

      {/* Upcoming Show Detail Sheet (from calendar ghost tiles) */}
      <UpcomingShowDetailSheet
        show={selectedUpcomingShow}
        open={upcomingDetailOpen}
        onOpenChange={setUpcomingDetailOpen}
        onDelete={(id) => {
          deleteUpcomingShow(id);
          setUpcomingDetailOpen(false);
        }}
        onRsvpChange={updateRsvpStatus}
        goingWith={selectedUpcomingShow ?
        friendShows.filter((fs) => fs.show_date === selectedUpcomingShow.show_date) :
        []} />


      {/* Friends-on-Day sheet (from calendar friends overlay tap) */}
      <Sheet open={friendsDaySheetOpen} onOpenChange={setFriendsDaySheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl bg-background border-white/10 pb-safe">
          <SheetHeader className="pb-4">
            <SheetTitle className="text-left text-base font-semibold">
              {friendsDayDate ? format(friendsDayDate, "EEEE, MMMM d") : "Friends"}
            </SheetTitle>
          </SheetHeader>

          {friendsDayDate && (() => {
            const isoDate = format(friendsDayDate, "yyyy-MM-dd");
            const friends = friendsByDate.get(isoDate) ?? [];
            // Get all friend shows for this day
            return (
              <div className="space-y-3 max-h-[55vh] overflow-y-auto">
                {friends.map((friend) => {
                  const name = friend.full_name ?? friend.username ?? "Friend";
                  const initial = (friend.username ?? name)[0].toUpperCase();
                  return (
                    <div key={friend.id} className="flex items-center gap-3 py-1">
                      {friend.avatar_url ?
                      <img src={friend.avatar_url} alt={name} className="w-9 h-9 rounded-full object-cover border border-white/10 flex-shrink-0" /> :

                      <div className="w-9 h-9 rounded-full bg-violet-500/20 border border-violet-500/30 flex items-center justify-center flex-shrink-0">
                          <span className="text-sm font-bold text-violet-300">{initial}</span>
                        </div>
                      }
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">{name}</p>
                        {friend.username && <p className="text-xs text-muted-foreground truncate">@{friend.username}</p>}
                      </div>
                      <Users className="h-3.5 w-3.5 text-violet-400/60 flex-shrink-0" />
                    </div>);

                })}
                {friends.length === 0 &&
                <p className="text-sm text-muted-foreground text-center py-4">No friends on this day</p>
                }
              </div>);

          })()}
        </SheetContent>
      </Sheet>

      <FocusedRankingSession
        open={focusedRankingOpen}
        onOpenChange={setFocusedRankingOpen}
        onComplete={() => {
          setFocusedRankingOpen(false);
          refetchStats();
          fetchShows();
        }} />


      {/* Todo Action Sheet */}
      <Sheet open={todoSheetOpen} onOpenChange={setTodoSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-left text-lg font-bold">Things to do</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 mt-4 pb-4">
            {stats.profileIncomplete &&
            <button
              onClick={() => {setTodoSheetOpen(false);onNavigateToProfile?.();}}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.98]">

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <UserCircle className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">Complete your profile</span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </button>
            }
            {stats.unrankedCount > 0 &&
            <button
              onClick={() => {setTodoSheetOpen(false);onNavigateToRank?.();}}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.98]">

                <div className="flex items-center gap-3">
                  <ArrowUpDown className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">{stats.unrankedCount} {stats.unrankedCount === 1 ? 'show' : 'shows'} to rank</span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </button>
            }
            {stats.incompleteTagsCount > 0 &&
            <button
              onClick={() => {setTodoSheetOpen(false);setIncompleteTagsOpen(true);}}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.98]">

                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">{stats.incompleteTagsCount} {stats.incompleteTagsCount === 1 ? 'show needs' : 'shows need'} highlights</span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </button>
            }
            {stats.missingPhotosCount > 0 &&
            <button
              onClick={() => {setTodoSheetOpen(false);setMissingPhotosOpen(true);}}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.98]">

                <div className="flex items-center gap-3">
                  <Camera className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">{stats.missingPhotosCount} {stats.missingPhotosCount === 1 ? 'show needs' : 'shows need'} a photo</span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </button>
            }
          </div>
        </SheetContent>
      </Sheet>

      <AddShowFlow
        open={editDialogOpen}
        onOpenChange={(open) => {setEditDialogOpen(open);if (!open) setAddShowPrefill(null);}}
        prefill={addShowPrefill}
        editShow={editShow ? {
          id: editShow.id,
          venue: editShow.venue,
          date: editShow.date,
          datePrecision: editShow.datePrecision || 'exact',
          artists: editShow.artists,
          tags: editShow.tags,
          notes: editShow.notes,
          venueId: editShow.venueId,
          photo_url: editShow.photo_url,
          showType: editShow.showType
        } : null} />


      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={(open) => {setQuickAddOpen(open);if (!open) setQuickAddPrefill(null);}}
        prefill={quickAddPrefill}
        onShowAdded={() => {fetchShows();refetchStats();}} />


      <AlertDialog open={!!deleteConfirmShow} onOpenChange={(open) => !open && setDeleteConfirmShow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this show?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmShow &&
              <>
                  This will permanently delete <strong>{deleteConfirmShow.artists.map((a) => a.name).join(', ')}</strong> at {deleteConfirmShow.venue.name}.
                  This action cannot be undone.
                </>
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteShow} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>);

};

export default Home;