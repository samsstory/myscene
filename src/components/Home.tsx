import { useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Music2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowLeft, Instagram, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";

import { ShowReviewSheet } from "./ShowReviewSheet";
import { PhotoOverlayEditor } from "./PhotoOverlayEditor";
import { QuickPhotoAddSheet } from "./QuickPhotoAddSheet";
import MapView from "./MapView";
import AddShowFlow from "./AddShowFlow";
import { ShowRankBadge } from "./feed/ShowRankBadge";
import SwipeableRankingCard from "./rankings/SwipeableRankingCard";
import { toast } from "sonner";

// Home components
import StatPills, { StatPillAction } from "./home/StatPills";
import DynamicInsight, { InsightAction } from "./home/DynamicInsight";
import StackedShowList from "./home/StackedShowList";
import IncompleteTagsSheet from "./home/IncompleteTagsSheet";
import MissingPhotosSheet from "./home/MissingPhotosSheet";
import FocusedRankingSession from "./home/FocusedRankingSession";
import RankingProgressCard from "./home/RankingProgressCard";
import { useHomeStats } from "@/hooks/useHomeStats";
import { Skeleton } from "./ui/skeleton";

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

type ViewMode = 'home' | 'calendar' | 'rankings' | 'globe';

interface HomeProps {
  onNavigateToRank?: () => void;
  onAddFromPhotos?: () => void;
  onAddSingleShow?: () => void;
  initialView?: ViewMode;
  openShowId?: string | null;
  onShowOpened?: () => void;
  // Tour-related props for Step 5 (Shows stat pill)
  showsTourActive?: boolean;
  showsRef?: React.RefObject<HTMLButtonElement>;
}

const Home = ({ onNavigateToRank, onAddFromPhotos, onAddSingleShow, initialView, openShowId, onShowOpened, showsTourActive, showsRef }: HomeProps) => {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<ViewMode>(initialView || "home");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editShow, setEditShow] = useState<Show | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reviewShow, setReviewShow] = useState<Show | null>(null);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [topRatedFilter, setTopRatedFilter] = useState<"all-time" | "this-year" | "last-year" | "this-month">("all-time");

  // Sync viewMode when initialView prop changes
  useEffect(() => {
    if (initialView) {
      setViewMode(initialView);
    }
  }, [initialView]);
  const [sortDirection, setSortDirection] = useState<"best-first" | "worst-first">("best-first");
  const [rankings, setRankings] = useState<ShowRanking[]>([]);
  const [deleteConfirmShow, setDeleteConfirmShow] = useState<Show | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Direct photo editor state for feed cards
  const [directEditShow, setDirectEditShow] = useState<Show | null>(null);
  const [directEditOpen, setDirectEditOpen] = useState(false);
  
  // Quick photo add sheet state for shows without photos
  const [quickPhotoShow, setQuickPhotoShow] = useState<Show | null>(null);
  const [quickPhotoOpen, setQuickPhotoOpen] = useState(false);
  
  // Incomplete tags sheet state
  const [incompleteTagsOpen, setIncompleteTagsOpen] = useState(false);
  
  // Missing photos sheet state
  const [missingPhotosOpen, setMissingPhotosOpen] = useState(false);
  
  // Focused ranking session state
  const [focusedRankingOpen, setFocusedRankingOpen] = useState(false);

  const { stats, statPills, insights, isLoading: statsLoading, refetch: refetchStats } = useHomeStats();
  
  // Normalizer for PhotoOverlayEditor show format
  const normalizeShowForEditor = (show: Show) => ({
    ...show,
    artists: show.artists.map(a => ({
      ...a,
      is_headliner: a.isHeadliner ?? false,
    })),
    venue_name: show.venue?.name || "",
    show_date: show.date || "",
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
      const showToOpen = shows.find(s => s.id === openShowId);
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
      setShows(prev => prev.filter(s => s.id !== deleteConfirmShow.id));
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

      const { data: showsData, error: showsError } = await supabase
        .from('shows')
        .select(`*, venues (latitude, longitude)`)
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

      const showsWithArtists = await Promise.all((showsData || []).map(async show => {
        const { data: artistsData } = await supabase.from('show_artists').select('*').eq('show_id', show.id);
        const { data: tagsData } = await supabase.from('show_tags').select('tag').eq('show_id', show.id);
        return {
          id: show.id,
          artists: (artistsData || []).map(a => ({ name: a.artist_name, isHeadliner: a.is_headliner })),
          venue: { name: show.venue_name, location: show.venue_location || '' },
          date: show.show_date,
          datePrecision: show.date_precision,
          tags: (tagsData || []).map(t => t.tag),
          notes: show.notes,
          venueId: show.venue_id,
          latitude: show.venues?.latitude,
          longitude: show.venues?.longitude,
          photo_url: show.photo_url
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
    const rankingMap = new Map(rankings.map(r => [r.show_id, r.elo_score]));
    return [...shows].sort((a, b) => {
      const eloA = rankingMap.get(a.id) || 1200;
      const eloB = rankingMap.get(b.id) || 1200;
      if (eloB !== eloA) return eloB - eloA;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }).map(s => s.id);
  }, [shows, rankings]);

  const getShowRankInfo = useCallback((showId: string, sortedShowIds?: string[]) => {
    const rankingMap = new Map(rankings.map(r => [r.show_id, r]));
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
        filteredShows = shows.filter(show => parseISO(show.date).getFullYear() === currentYear);
      } else if (topRatedFilter === "last-year") {
        filteredShows = shows.filter(show => parseISO(show.date).getFullYear() === currentYear - 1);
      } else if (topRatedFilter === "this-month") {
        filteredShows = shows.filter(show => {
          const showDate = parseISO(show.date);
          return showDate.getFullYear() === currentYear && showDate.getMonth() === currentMonthNum;
        });
      }

      const rankingMap = new Map(rankings.map(r => [r.show_id, { elo: r.elo_score, comparisons: r.comparisons_count }]));
      const sorted = [...filteredShows].sort((a, b) => {
        const eloA = rankingMap.get(a.id)?.elo || 1200;
        const eloB = rankingMap.get(b.id)?.elo || 1200;
        if (eloB !== eloA) return eloB - eloA;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
      
      if (sortDirection === "worst-first") {
        sorted.reverse();
      }
      
      return sorted;
    }
    return filteredShows;
  }, [shows, viewMode, topRatedFilter, sortDirection, rankings]);

  const getShowsForDate = (date: Date) => shows.filter(show => isSameDay(parseISO(show.date), date));

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
        onNavigateToRank?.();
        break;
      case 'show-detail':
        if (payload) {
          const show = shows.find(s => s.id === payload);
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
    const recentShows = shows.slice(0, 5);
    
    return (
      <div className="space-y-6">
        {/* Stat Pills */}
        <StatPills stats={statPills} isLoading={statsLoading} onPillTap={handlePillTap} showsTourActive={showsTourActive} showsRef={showsRef} />

        {/* Ranking Progress Card - Always visible when user has 2+ shows */}
        {shows.length >= 2 && (
          <RankingProgressCard
            percentage={stats.globalConfirmationPercentage}
            totalShows={shows.length}
            onTap={() => onNavigateToRank?.()}
          />
        )}

        {/* Dynamic Insights - stacked cards */}
        <DynamicInsight 
          insights={insights} 
          onAction={(action: InsightAction) => {
            if (action === 'rank-tab') {
              setFocusedRankingOpen(true);
            } else if (action === 'incomplete-ratings') {
              setIncompleteTagsOpen(true);
            } else if (action === 'missing-photos') {
              setMissingPhotosOpen(true);
            }
          }} 
        />

        {/* Recent Shows */}
        <div className="space-y-3">
          <h3 
            className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/60"
            style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}
          >
            Recent Shows
          </h3>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-28 w-full rounded-xl" />
              ))}
            </div>
          ) : (
            <StackedShowList
              shows={recentShows}
              getRankInfo={getShowRankInfo}
              onShowTap={handleShowTap}
              onShowShare={handleShareFromCard}
            />
          )}
        </div>
      </div>
    );
  };

  const renderRankingsView = () => {
    const sortedShows = getSortedShows();
    const filteredShowIds = sortedShows.map(s => s.id);
    
    return (
      <div className="space-y-4">
        {/* Filter bar - glassmorphism styled */}
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
            onClick={() => setSortDirection(prev => prev === "best-first" ? "worst-first" : "best-first")}
            className="flex items-center gap-2 bg-white/[0.05] border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span>{sortDirection === "best-first" ? "Best" : "Worst"}</span>
          </Button>
        </div>

        {/* Empty state */}
        {sortedShows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
              <div className="relative w-16 h-16 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
                <Music2 className="h-8 w-8 text-white/40" />
              </div>
            </div>
            <h3 
              className="text-lg font-semibold text-white/80 mb-1"
              style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}
            >
              No shows match this filter
            </h3>
            <p className="text-sm text-white/50">
              Try selecting a different time period
            </p>
          </div>
        ) : (
          /* Show list */
          <div className="flex flex-col gap-3">
            {sortedShows.map((show) => {
              const baseRankInfo = getShowRankInfo(show.id, filteredShowIds);
              // When viewing worst-first, show inverted position so worst show appears as #total
              const rankInfo = sortDirection === "worst-first" && baseRankInfo.position
                ? { ...baseRankInfo, position: baseRankInfo.total - baseRankInfo.position + 1 }
                : baseRankInfo;
              return (
                <SwipeableRankingCard 
                  key={show.id} 
                  onDelete={() => setDeleteConfirmShow(show)}
                >
                  <Card 
                    className="border-white/[0.08] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 cursor-pointer relative overflow-hidden"
                    onClick={() => handleShowTap(show)}
                  >
                    <CardContent className="p-4 relative">
                      {/* Instagram share button - top right */}
                      <div className="absolute top-2 right-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className={`h-7 w-7 ${show.photo_url ? 'text-pink-400 hover:text-pink-300' : 'text-white/30 hover:text-white/50'}`}
                          onClick={e => {
                            e.stopPropagation();
                            handleShareFromCard(show);
                          }}
                        >
                          <Instagram className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex gap-4 pr-8">
                        {/* Larger thumbnail - 80px */}
                        {show.photo_url ? (
                          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md border border-white/10">
                            <img src={show.photo_url} alt="Show photo" className="w-full h-full object-cover" />
                          </div>
                        ) : (
                          <div 
                            className="relative w-20 h-20 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0 border border-white/[0.08] group cursor-pointer hover:bg-white/[0.08] transition-colors"
                            onClick={(e) => {
                              e.stopPropagation();
                              setQuickPhotoShow(show);
                              setQuickPhotoOpen(true);
                            }}
                          >
                            <span className="text-2xl text-white/40 select-none" style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}>✦</span>
                            {/* Quick add photo button */}
                            <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-primary/80 flex items-center justify-center shadow-lg opacity-70 group-hover:opacity-100 transition-opacity">
                              <Plus className="h-3 w-3 text-primary-foreground" />
                            </div>
                          </div>
                        )}

                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Artist name with glow */}
                          <div 
                            className="font-bold text-base leading-tight truncate"
                            style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}
                          >
                            {show.artists.slice(0, 2).map((artist, idx) => (
                              <span key={idx}>
                                {artist.name}
                                {idx < Math.min(show.artists.length - 1, 1) && <span className="text-white/40"> • </span>}
                              </span>
                            ))}
                            {show.artists.length > 2 && (
                              <span className="text-white/40 font-normal"> +{show.artists.length - 2}</span>
                            )}
                          </div>
                          {/* Venue with muted glow */}
                          <div 
                            className="text-sm text-white/60 truncate"
                            style={{ textShadow: "0 0 8px rgba(255,255,255,0.15)" }}
                          >
                            {show.venue.name}
                          </div>
                          {/* Date with muted glow */}
                          <div 
                            className="text-sm text-white/60"
                            style={{ textShadow: "0 0 8px rgba(255,255,255,0.15)" }}
                          >
                            {format(parseISO(show.date), parseISO(show.date).getFullYear() === new Date().getFullYear() ? "MMM d" : "MMM yyyy")}
                          </div>
                        </div>
                      </div>

                      <div className="absolute bottom-3 right-3">
                        <ShowRankBadge position={rankInfo.position} total={rankInfo.total} comparisonsCount={rankInfo.comparisonsCount} />
                      </div>
                    </CardContent>
                  </Card>
                </SwipeableRankingCard>
              );
            })}
          </div>
        )}
      </div>
    );
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

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="flex items-center gap-2">
            <Select value={months[currentMonthIndex]} onValueChange={value => {
              const monthIndex = months.indexOf(value);
              setCurrentMonth(new Date(currentYear, monthIndex));
            }}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {months.map(month => <SelectItem key={month} value={month}>{month}</SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={currentYear.toString()} onValueChange={value => {
              setCurrentMonth(new Date(parseInt(value), currentMonthIndex));
            }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.reverse().map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <Button onClick={() => setCurrentMonth(new Date(currentYear, currentMonthIndex - 1))} size="sm" variant="default">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button onClick={() => setCurrentMonth(new Date(currentYear, currentMonthIndex + 1))} size="sm" variant="default">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">{day}</div>
          ))}
          
          {Array.from({ length: startDay }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
          
          {days.map(day => {
            const dayShows = getShowsForDate(day);
            return (
              <div key={day.toISOString()} className={`aspect-square p-2 flex items-center justify-center ${dayShows.length > 0 ? "bg-card" : "bg-background"}`}>
                {dayShows.length > 0 ? (
                  <div className="flex flex-wrap gap-1 items-center justify-center">
                    {dayShows.map(show => {
                      const rankInfo = getShowRankInfo(show.id);
                      const rankDisplay = rankInfo.position ? `#${rankInfo.position}` : "New";
                      return (
                        <button 
                          key={show.id}
                          className="relative hover:scale-110 transition-transform cursor-pointer"
                          title={`${show.artists.map(a => a.name).join(", ")} - ${show.venue.name}`}
                          onClick={() => handleShowTap(show)}
                        >
                          {show.photo_url ? (
                            <div className="relative w-8 h-8">
                              <img src={show.photo_url} alt="Show" className="w-8 h-8 rounded object-cover shadow-lg" />
                              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white" style={{ textShadow: '0 0 4px rgba(0,0,0,0.8)' }}>
                                {rankDisplay}
                              </div>
                            </div>
                          ) : (
                            <div className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground shadow-lg">
                              {rankDisplay}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderSubViewHeader = (title: string) => (
    <div className="flex items-center gap-3 mb-4">
      <Button variant="ghost" size="icon" onClick={handleBackToHome} className="h-9 w-9">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>
  );

  return (
    <div className="space-y-4">
      {viewMode === 'home' && renderHomeView()}
      
      {viewMode === 'calendar' && (
        <>
          {renderSubViewHeader('Show Calendar')}
          {renderCalendarView()}
        </>
      )}
      
      {viewMode === 'rankings' && (
        <>
          {renderSubViewHeader('Top Ranked Shows')}
          {renderRankingsView()}
        </>
      )}
      
      {viewMode === 'globe' && (
        <>
          {renderSubViewHeader('Show Globe')}
          <MapView 
            shows={shows} 
            onEditShow={show => {
              setEditShow(show);
              setEditDialogOpen(true);
            }}
            onAddFromPhotos={onAddFromPhotos}
            onAddSingleShow={onAddSingleShow}
            onShowTap={(show) => {
              setReviewShow(show);
              setReviewSheetOpen(true);
            }}
          />
        </>
      )}

      
      {/* Incomplete Tags Sheet */}
      <IncompleteTagsSheet
        open={incompleteTagsOpen}
        onOpenChange={setIncompleteTagsOpen}
        onComplete={() => {
          refetchStats();
          fetchShows();
        }}
      />
      
      {/* Missing Photos Sheet */}
      <MissingPhotosSheet
        open={missingPhotosOpen}
        onOpenChange={setMissingPhotosOpen}
        onComplete={() => {
          refetchStats();
          fetchShows();
        }}
      />
      
      {/* Quick Photo Add Sheet for shows without photos */}
      <QuickPhotoAddSheet
        show={quickPhotoShow}
        open={quickPhotoOpen}
        onOpenChange={setQuickPhotoOpen}
        onPhotoAdded={handlePhotoAdded}
        onShareWithoutPhoto={handleShareWithoutPhoto}
      />
      
      {/* Direct Photo Overlay Editor for feed cards */}
      <Sheet open={directEditOpen} onOpenChange={setDirectEditOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-hidden flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>Share to Instagram</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {directEditShow && (
              <PhotoOverlayEditor
                show={normalizeShowForEditor(directEditShow)}
                onClose={() => setDirectEditOpen(false)}
                allShows={shows.map(normalizeShowForEditor)}
                rankings={rankings}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>
      
      <ShowReviewSheet 
        show={reviewShow} 
        open={reviewSheetOpen} 
        onOpenChange={setReviewSheetOpen} 
        onEdit={show => {
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
            setShows(prev => prev.filter(s => s.id !== showId));
          } catch (error) {
            console.error('Error deleting show:', error);
            toast.error('Failed to delete show');
          }
        }}
        allShows={shows} 
        rankings={rankings}
      />

      <FocusedRankingSession
        open={focusedRankingOpen}
        onOpenChange={setFocusedRankingOpen}
        onComplete={() => {
          setFocusedRankingOpen(false);
          refetchStats();
          fetchShows();
        }}
      />

      <AddShowFlow
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen} 
        editShow={editShow ? {
          id: editShow.id,
          venue: editShow.venue,
          date: editShow.date,
          datePrecision: editShow.datePrecision || 'exact',
          artists: editShow.artists,
          tags: editShow.tags,
          notes: editShow.notes,
          venueId: editShow.venueId,
          photo_url: editShow.photo_url
        } : null}
      />

      <AlertDialog open={!!deleteConfirmShow} onOpenChange={(open) => !open && setDeleteConfirmShow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this show?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmShow && (
                <>
                  This will permanently delete <strong>{deleteConfirmShow.artists.map(a => a.name).join(', ')}</strong> at {deleteConfirmShow.venue.name}.
                  This action cannot be undone.
                </>
              )}
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
    </div>
  );
};

export default Home;
