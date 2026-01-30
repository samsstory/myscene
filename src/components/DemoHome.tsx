import { useEffect, useState, useCallback, useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Music2, ChevronLeft, ChevronRight, ArrowUpDown, ArrowLeft, Instagram } from "lucide-react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";

import { ShowReviewSheet } from "./ShowReviewSheet";
import { PhotoOverlayEditor } from "./PhotoOverlayEditor";
import MapView from "./MapView";
import { ShowRankBadge } from "./feed/ShowRankBadge";
import { Skeleton } from "./ui/skeleton";
import { Badge } from "./ui/badge";

// Home components
import StatPills, { StatPill, StatPillAction } from "./home/StatPills";
import DynamicInsight, { InsightData, InsightAction } from "./home/DynamicInsight";
import StackedShowList from "./home/StackedShowList";
import RankingProgressCard from "./home/RankingProgressCard";
import { DemoIncompleteRatingsSheet } from "./home/DemoIncompleteRatingsSheet";
import DemoMissingPhotosSheet from "./home/DemoMissingPhotosSheet";
import { useDemoData } from "@/hooks/useDemoData";
import { useDemoMode } from "@/contexts/DemoContext";
import { Music, Calendar, Trophy, Globe, Flame } from "lucide-react";

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
  rating: number;
  datePrecision?: string;
  artistPerformance?: number | null;
  sound?: number | null;
  lighting?: number | null;
  crowd?: number | null;
  venueVibe?: number | null;
  notes?: string | null;
  venueId?: string | null;
  latitude?: number;
  longitude?: number;
  photo_url?: string | null;
  isLocalDemo?: boolean; // Flag for demo-created shows
}

interface ShowRanking {
  show_id: string;
  elo_score: number;
  comparisons_count: number;
}

type ViewMode = 'home' | 'calendar' | 'rankings' | 'globe';

interface DemoHomeProps {
  initialView?: ViewMode;
  onViewChange?: (view: ViewMode) => void;
  onNavigateToRank?: () => void;
}

const truncate = (str: string, maxLen: number): string => {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 1) + '…';
};

const DemoHome = ({ initialView = 'home', onViewChange, onNavigateToRank }: DemoHomeProps) => {
  const { shows: fetchedShows, rankings, stats, isLoading, error } = useDemoData();
  const { demoLocalShows } = useDemoMode();
  
  // Merge fetched shows with locally created demo shows
  const shows = useMemo(() => {
    // Convert local shows to the Show interface and merge
    const localShowsConverted: Show[] = demoLocalShows.map(s => ({
      ...s,
      isLocalDemo: true,
    }));
    
    // Combine and sort by date (newest first)
    const combined = [...localShowsConverted, ...fetchedShows];
    return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [fetchedShows, demoLocalShows]);
  
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [reviewShow, setReviewShow] = useState<Show | null>(null);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [topRatedFilter, setTopRatedFilter] = useState<"all-time" | "this-year" | "last-year" | "this-month">("all-time");
  const [sortDirection, setSortDirection] = useState<"best-first" | "worst-first">("best-first");
  
  // Photo overlay editor state
  const [directEditShow, setDirectEditShow] = useState<Show | null>(null);
  const [directEditOpen, setDirectEditOpen] = useState(false);
  
  // Incomplete ratings sheet state
  const [incompleteRatingsOpen, setIncompleteRatingsOpen] = useState(false);
  
  // Missing photos sheet state
  const [missingPhotosOpen, setMissingPhotosOpen] = useState(false);

  // Sync viewMode when initialView prop changes
  useEffect(() => {
    if (initialView) {
      setViewMode(initialView);
    }
  }, [initialView]);

  // Handle view changes - only notify parent for globe (managed by Demo.tsx)
  // Internal views (calendar, rankings) are handled within DemoHome
  const handleViewChange = (newView: ViewMode) => {
    setViewMode(newView);
    // Only notify parent for globe since Demo.tsx manages that tab
    if (newView === 'globe') {
      onViewChange?.(newView);
    }
  };

  // Normalizer for PhotoOverlayEditor show format
  const normalizeShowForEditor = (show: Show) => ({
    ...show,
    artists: show.artists.map(a => ({
      ...a,
      is_headliner: a.isHeadliner ?? false,
    })),
    venue_name: show.venue?.name || "",
    show_date: show.date || "",
    artist_performance: show.artistPerformance,
    venue_vibe: show.venueVibe,
  });

  const handleShowTap = (show: Show) => {
    setReviewShow(show);
    setReviewSheetOpen(true);
  };

  const handleShareFromCard = (show: Show) => {
    if (show.photo_url) {
      setDirectEditShow(show);
      setDirectEditOpen(true);
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
        handleViewChange('rankings');
        break;
      case 'calendar':
        handleViewChange('calendar');
        break;
      case 'globe':
        handleViewChange('globe');
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
    handleViewChange('home');
  };

  // Build stat pills from demo data
  const statPills: StatPill[] = [
    {
      id: 'total-shows',
      label: 'Shows',
      value: stats.allTimeShows,
      icon: Music,
      highlight: true,
      action: 'rankings' as StatPillAction,
    },
    ...(stats.topShow ? [{
      id: 'top-show',
      label: '#1 Show',
      value: truncate(stats.topShow.artistName, 12),
      icon: Trophy,
      action: 'show-detail' as StatPillAction,
      actionPayload: stats.topShow.id,
    }] : []),
    ...(stats.uniqueCities > 0 ? [{
      id: 'cities',
      label: stats.uniqueCountries <= 1 ? 'Cities' : 'Countries',
      value: stats.uniqueCountries <= 1 ? stats.uniqueCities : stats.uniqueCountries,
      icon: Globe,
      action: 'globe' as StatPillAction,
    }] : []),
    {
      id: 'this-year',
      label: new Date().getFullYear().toString(),
      value: stats.showsThisYear,
      icon: Calendar,
      action: 'calendar' as StatPillAction,
    },
    ...(stats.currentStreak >= 2 ? [{
      id: 'streak',
      label: 'Streak',
      value: `${stats.currentStreak}mo`,
      icon: Flame,
      action: null as StatPillAction,
    }] : []),
  ];

  // Build insights for demo - including incomplete ratings for testing
  const insights: InsightData[] = [];
  
  // Add incomplete ratings insight (always show in demo for testing)
  if (stats.incompleteRatingsCount > 0) {
    insights.push({
      type: 'incomplete_ratings',
      title: `${stats.incompleteRatingsCount} Shows Need Ratings`,
      message: `Complete detailed ratings to unlock full insights.`,
      actionable: true,
      action: 'incomplete-ratings',
    });
  }
  
  // Add missing photos insight
  if (stats.missingPhotosCount > 0) {
    insights.push({
      type: 'missing_photos',
      title: `${stats.missingPhotosCount} ${stats.missingPhotosCount === 1 ? 'Show Needs' : 'Shows Need'} a Photo`,
      message: 'Add photos to complete your show memories.',
      actionable: true,
      action: 'missing-photos',
    });
  }
  
  // Add ranking reminder insight for under-ranked shows
  if (stats.underRankedCount > 0) {
    insights.push({
      type: 'ranking_reminder',
      title: `${stats.underRankedCount} Shows Under-Ranked`,
      message: `Some shows need more comparisons to lock in their rank.`,
      actionable: true,
      action: 'rank-tab',
    });
  }
  
  // Milestone/streak insights
  if (stats.allTimeShows > 0) {
    if ([25, 50, 100, 200].includes(stats.allTimeShows)) {
      insights.push({
        type: 'milestone_reached',
        title: `${stats.allTimeShows} Shows!`,
        message: `Incredible milestone! You've logged ${stats.allTimeShows} concerts.`,
      });
    }
    if (stats.currentStreak >= 2 && insights.length < 3) {
      insights.push({
        type: 'streak_active',
        title: `${stats.currentStreak}-Month Streak`,
        message: `You've been to shows ${stats.currentStreak} months in a row!`,
        actionable: false,
      });
    }
  }

  // Render functions
  const renderHomeView = () => {
    const recentShows = shows.slice(0, 5);
    
    return (
      <div className="space-y-6">
        {/* Stat Pills */}
        <StatPills stats={statPills} isLoading={isLoading} onPillTap={handlePillTap} />

        {/* Ranking Progress Card - links to Rank feature */}
        {shows.length >= 2 && (
          <RankingProgressCard
            percentage={stats.globalConfirmationPercentage}
            totalShows={shows.length}
            onTap={() => onNavigateToRank?.()}
          />
        )}

        {/* Dynamic Insights - link actions to features */}
        <DynamicInsight 
          insights={insights} 
          onAction={(action) => {
            if (action === 'rank-tab') {
              onNavigateToRank?.();
            } else if (action === 'incomplete-ratings') {
              setIncompleteRatingsOpen(true);
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
          {isLoading ? (
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
          /* Show list - simplified, no swipe actions in demo */
          <div className="flex flex-col gap-3">
            {sortedShows.map((show) => {
              const baseRankInfo = getShowRankInfo(show.id, filteredShowIds);
              const rankInfo = sortDirection === "worst-first" && baseRankInfo.position
                ? { ...baseRankInfo, position: baseRankInfo.total - baseRankInfo.position + 1 }
                : baseRankInfo;
              return (
                <Card 
                  key={show.id}
                  className="border-white/[0.08] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 cursor-pointer relative overflow-hidden"
                  onClick={() => handleShowTap(show)}
                >
                  <CardContent className="p-4 relative">
                    {/* Instagram share button */}
                    {show.photo_url && (
                      <div className="absolute top-2 right-2">
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-7 w-7 text-pink-400 hover:text-pink-300"
                          onClick={e => {
                            e.stopPropagation();
                            handleShareFromCard(show);
                          }}
                        >
                          <Instagram className="h-4 w-4" />
                        </Button>
                      </div>
                    )}

                    <div className="flex gap-4 pr-8">
                      {/* Thumbnail */}
                      {show.photo_url ? (
                        <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md border border-white/10">
                          <img src={show.photo_url} alt="Show photo" className="w-full h-full object-cover" />
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0 border border-white/[0.08]">
                          <span className="text-2xl text-white/40 select-none" style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}>✦</span>
                        </div>
                      )}

                      <div className="min-w-0 flex-1 space-y-1">
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
                        <div 
                          className="text-sm text-white/60 truncate"
                          style={{ textShadow: "0 0 8px rgba(255,255,255,0.15)" }}
                        >
                          {show.venue.name}
                        </div>
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
              );
            })}
          </div>
        )}
      </div>
    );
  };

  const renderCalendarView = () => {
    const monthStartDate = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStartDate, end: monthEnd });
    const startDay = monthStartDate.getDay();
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

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div className="text-white/60 mb-2">Failed to load demo data</div>
        <p className="text-sm text-white/40">{error}</p>
      </div>
    );
  }

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
            onEditShow={() => {}} // No-op in demo
            onShowTap={(show) => {
              setReviewShow(show);
              setReviewSheetOpen(true);
            }}
          />
        </>
      )}
      
      {/* Photo Overlay Editor */}
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
        onEdit={() => {}} // No-op in demo
        onShareToEditor={(show) => {
          setDirectEditShow(show);
          setDirectEditOpen(true);
        }}
        allShows={shows} 
        rankings={rankings} 
      />
      
      {/* Demo Incomplete Ratings Sheet */}
      <DemoIncompleteRatingsSheet
        open={incompleteRatingsOpen}
        onOpenChange={setIncompleteRatingsOpen}
        shows={shows}
      />
      
      {/* Demo Missing Photos Sheet */}
      <DemoMissingPhotosSheet
        open={missingPhotosOpen}
        onOpenChange={setMissingPhotosOpen}
        shows={shows}
      />
    </div>
  );
};

export default DemoHome;
