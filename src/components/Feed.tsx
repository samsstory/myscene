import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music2, MapPin, Calendar as CalendarIcon, List, Trophy, Instagram, ChevronLeft, ChevronRight, Map as MapIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { ShareShowSheet } from "./ShareShowSheet";
import { ShowReviewSheet } from "./ShowReviewSheet";
import MapView from "./MapView";
import AddShowFlow from "./AddShowFlow";
import { ShowRankBadge } from "./feed/ShowRankBadge";
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
}
interface ShowRanking {
  show_id: string;
  elo_score: number;
  comparisons_count: number;
}
const Feed = () => {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "top-rated" | "map">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shareShow, setShareShow] = useState<Show | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [editShow, setEditShow] = useState<Show | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reviewShow, setReviewShow] = useState<Show | null>(null);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [topRatedFilter, setTopRatedFilter] = useState<"all-time" | "this-year" | "this-month">("all-time");
  const [rankings, setRankings] = useState<ShowRanking[]>([]);
  useEffect(() => {
    fetchShows();

    // Subscribe to real-time updates
    const channel = supabase.channel('shows_changes').on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'shows'
    }, () => {
      fetchShows();
    }).subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);
  const handleEditShow = (show: Show) => {
    setEditShow(show);
    setEditDialogOpen(true);
  };
  const fetchShows = async () => {
    try {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) {
        setShows([]);
        setLoading(false);
        return;
      }
      const {
        data: showsData,
        error: showsError
      } = await supabase.from('shows').select(`
          *,
          venues (
            latitude,
            longitude
          )
        `).eq('user_id', user.id).order('show_date', {
        ascending: false
      });
      if (showsError) throw showsError;

      // Fetch rankings for ELO-based sorting
      const {
        data: rankingsData,
        error: rankingsError
      } = await supabase.from('show_rankings').select('show_id, elo_score, comparisons_count').eq('user_id', user.id);
      if (rankingsError) {
        console.error('Error fetching rankings:', rankingsError);
      } else {
        setRankings(rankingsData || []);
      }

      // Fetch artists for each show
      const showsWithArtists = await Promise.all((showsData || []).map(async show => {
        const {
          data: artistsData
        } = await supabase.from('show_artists').select('*').eq('show_id', show.id);
        return {
          id: show.id,
          artists: (artistsData || []).map(a => ({
            name: a.artist_name,
            isHeadliner: a.is_headliner
          })),
          venue: {
            name: show.venue_name,
            location: show.venue_location || ''
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
  const getSortedShows = () => {
    let filteredShows = shows;

    // Filter by time period if in top-rated view
    if (viewMode === "top-rated") {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      if (topRatedFilter === "this-year") {
        filteredShows = shows.filter(show => {
          const showDate = parseISO(show.date);
          return showDate.getFullYear() === currentYear;
        });
      } else if (topRatedFilter === "this-month") {
        filteredShows = shows.filter(show => {
          const showDate = parseISO(show.date);
          return showDate.getFullYear() === currentYear && showDate.getMonth() === currentMonth;
        });
      }

      // Always sort by ELO (head-to-head is the primary ranking system now)
      const rankingMap = new Map(rankings.map(r => [r.show_id, {
        elo: r.elo_score,
        comparisons: r.comparisons_count
      }]));
      return [...filteredShows].sort((a, b) => {
        const rankingA = rankingMap.get(a.id);
        const rankingB = rankingMap.get(b.id);

        // Use ELO score if available, otherwise default to 1200
        const eloA = rankingA?.elo || 1200;
        const eloB = rankingB?.elo || 1200;
        if (eloB !== eloA) {
          return eloB - eloA; // Higher ELO first
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }
    return filteredShows;
  };
  
  // Get all shows sorted by ELO for global ranking
  const getAllShowsSortedByElo = () => {
    const rankingMap = new Map(rankings.map(r => [r.show_id, r.elo_score]));
    return [...shows].sort((a, b) => {
      const eloA = rankingMap.get(a.id) || 1200;
      const eloB = rankingMap.get(b.id) || 1200;
      if (eloB !== eloA) return eloB - eloA;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }).map(s => s.id);
  };

  // Helper to get rank info for a show based on its position in the sorted list
  const getShowRankInfo = (showId: string, sortedShowIds?: string[]) => {
    const rankingMap = new Map(rankings.map(r => [r.show_id, r]));
    const ranking = rankingMap.get(showId);
    
    // Use provided sorted list or compute global ranking
    const effectiveSortedIds = sortedShowIds || getAllShowsSortedByElo();
    
    // Position is simply the index in the already-sorted list + 1
    const position = effectiveSortedIds.indexOf(showId) + 1;
    const total = effectiveSortedIds.length;
    
    // If no comparisons have been made, mark as unranked
    if (!ranking || ranking.comparisons_count === 0) {
      return { position: null, total, comparisonsCount: 0 };
    }
    
    return { 
      position: position > 0 ? position : null, 
      total, 
      comparisonsCount: ranking.comparisons_count 
    };
  };
  const getShowsForDate = (date: Date) => {
    return shows.filter(show => isSameDay(parseISO(show.date), date));
  };
  const renderListView = () => {
    const sortedShows = getSortedShows();
    const filteredShowIds = sortedShows.map(s => s.id);
    return <div className="flex flex-col gap-3 items-center w-full">
        {sortedShows.map((show, index) => {
          const rankInfo = getShowRankInfo(show.id, filteredShowIds);
          return (
            <Card 
              key={show.id} 
              className="border-border shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer relative w-full max-w-3xl" 
              onClick={() => {
                setReviewShow(show);
                setReviewSheetOpen(true);
              }}
            >
              <CardContent className="p-4 relative">
                {/* Instagram share button - top right */}
                <Button 
                  size="icon" 
                  variant="ghost" 
                  className="absolute top-2 right-2 h-7 w-7 text-muted-foreground hover:text-foreground" 
                  onClick={e => {
                    e.stopPropagation();
                    setShareShow(show);
                    setShareSheetOpen(true);
                  }}
                >
                  <Instagram className="h-4 w-4" />
                </Button>

                {/* Main content - 2 column layout */}
                <div className="flex gap-4 pr-8">
                  {/* Left: Optional photo thumbnail */}
                  {show.photo_url ? (
                    <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-md border border-border/50">
                      <img src={show.photo_url} alt="Show photo" className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="w-16 h-16 rounded-lg bg-muted/30 flex items-center justify-center flex-shrink-0">
                      <Music2 className="h-6 w-6 text-muted-foreground/50" />
                    </div>
                  )}

                  {/* Center: Show info */}
                  <div className="min-w-0 flex-1 space-y-1">
                    {/* Artist names */}
                    <div className="font-bold text-base leading-tight truncate">
                      {show.artists.slice(0, 2).map((artist, idx) => (
                        <span key={idx}>
                          {artist.name}
                          {idx < Math.min(show.artists.length - 1, 1) && <span className="text-muted-foreground"> • </span>}
                        </span>
                      ))}
                      {show.artists.length > 2 && (
                        <span className="text-muted-foreground font-normal"> +{show.artists.length - 2}</span>
                      )}
                    </div>
                    
                    {/* Venue */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate">
                      <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
                      <span className="truncate">{show.venue.name}</span>
                    </div>
                    
                    {/* Date */}
                    <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                      <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
                      <span>{format(parseISO(show.date), parseISO(show.date).getFullYear() === new Date().getFullYear() ? "MMM d" : "MMM yyyy")}</span>
                    </div>
                  </div>
                </div>

                {/* Rank badge - bottom right */}
                <div className="absolute bottom-3 right-3">
                  <ShowRankBadge 
                    position={rankInfo.position} 
                    total={rankInfo.total} 
                    comparisonsCount={rankInfo.comparisonsCount}
                  />
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>;
  };
  const renderCalendarView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({
      start: monthStart,
      end: monthEnd
    });
    const startDay = monthStart.getDay();
    const currentYear = currentMonth.getFullYear();
    const currentMonthIndex = currentMonth.getMonth();
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

    // Generate year options (from 1990 to current year + 1)
    const years = Array.from({
      length: new Date().getFullYear() - 1989 + 1
    }, (_, i) => 1990 + i);
    return <div className="space-y-6">
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
                {months.map(month => <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>)}
              </SelectContent>
            </Select>

            <Select value={currentYear.toString()} onValueChange={value => {
            setCurrentMonth(new Date(parseInt(value), currentMonthIndex));
          }}>
              <SelectTrigger className="w-[100px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {years.reverse().map(year => <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>)}
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
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>)}
          
          {Array.from({
          length: startDay
        }).map((_, i) => <div key={`empty-${i}`} className="aspect-square" />)}
          
          {days.map(day => {
          const dayShows = getShowsForDate(day);
          const isToday = isSameDay(day, new Date());
          return <div key={day.toISOString()} className={`aspect-square p-2 flex items-center justify-center ${dayShows.length > 0 ? "bg-card" : "bg-background"}`}>
              {dayShows.length > 0 ? <div className="flex flex-wrap gap-1 items-center justify-center">
                    {dayShows.map(show => {
                const rankInfo = getShowRankInfo(show.id);
                const rankDisplay = rankInfo.position ? `#${rankInfo.position}` : "New";
                return <button 
                  key={show.id} 
                  className="relative hover:scale-110 transition-transform cursor-pointer"
                  title={`${show.artists.map(a => a.name).join(", ")} - ${show.venue.name}`} 
                  onClick={() => {
                    setReviewShow(show);
                    setReviewSheetOpen(true);
                  }}
                >
                  {show.photo_url ? (
                    <div className="relative w-8 h-8">
                      <img 
                        src={show.photo_url} 
                        alt="Show" 
                        className="w-8 h-8 rounded object-cover shadow-lg"
                      />
                      <div className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-white"
                        style={{
                          textShadow: '0 0 4px rgba(0,0,0,0.8), 0 0 8px rgba(0,0,0,0.6)'
                        }}
                      >
                        {rankDisplay}
                      </div>
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded flex items-center justify-center text-[10px] font-bold bg-primary text-primary-foreground shadow-lg">
                      {rankDisplay}
                    </div>
                  )}
                </button>;
              })}
                  </div> : <div className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />}
              </div>;
        })}
        </div>
      </div>;
  };
  return <div className="space-y-4">
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          {viewMode === "list" && "Recent Shows"}
          {viewMode === "calendar" && "Show Calendar"}
          {viewMode === "top-rated" && "Top Shows"}
          {viewMode === "map" && "Show Globe"}
        </h2>
      </div>

      <Tabs value={viewMode} onValueChange={v => setViewMode(v as typeof viewMode)} className="mb-6 px-0 mx-0">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">Recent Shows</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Show Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="top-rated" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Top Shows</span>
          </TabsTrigger>
          <TabsTrigger value="map" className="flex items-center gap-2">
            <MapIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Show Globe</span>
          </TabsTrigger>
        </TabsList>

        {/* Time period filters for Top Rated view */}
        {viewMode === "top-rated" && <div className="mt-4">
            {/* Time period filters */}
            <div className="flex justify-center gap-2">
              <Button variant={topRatedFilter === "all-time" ? "default" : "outline"} size="sm" onClick={() => setTopRatedFilter("all-time")}>
                All Time
              </Button>
              <Button variant={topRatedFilter === "this-year" ? "default" : "outline"} size="sm" onClick={() => setTopRatedFilter("this-year")}>
                This Year
              </Button>
              <Button variant={topRatedFilter === "this-month" ? "default" : "outline"} size="sm" onClick={() => setTopRatedFilter("this-month")}>
                This Month
              </Button>
            </div>
          </div>}

        {loading ? <Card className="border-border shadow-card mt-6">
            <CardContent className="py-16 text-center">
              <Music2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
              <p className="text-muted-foreground">Loading shows...</p>
            </CardContent>
          </Card> : shows.length === 0 ? <Card className="border-border shadow-card mt-6">
            <CardContent className="py-16 text-center">
              <Music2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-xl font-semibold mb-2">No shows yet</h3>
              <p className="text-muted-foreground">
                Start logging your concert experiences!
              </p>
            </CardContent>
          </Card> : <>
            <TabsContent value="list">{renderListView()}</TabsContent>
            <TabsContent value="calendar">{renderCalendarView()}</TabsContent>
            <TabsContent value="top-rated">{renderListView()}</TabsContent>
            <TabsContent value="map">
              <MapView shows={shows} onEditShow={show => {
            setEditShow(show);
            setEditDialogOpen(true);
          }} />
            </TabsContent>
          </>}
      </Tabs>

      <ShareShowSheet show={shareShow} open={shareSheetOpen} onOpenChange={setShareSheetOpen} allShows={shows} rankings={rankings} />

      <ShowReviewSheet show={reviewShow} open={reviewSheetOpen} onOpenChange={setReviewSheetOpen} onEdit={show => {
      setEditShow(show);
      setEditDialogOpen(true);
    }} allShows={shows} rankings={rankings} />

      <AddShowFlow open={editDialogOpen} onOpenChange={setEditDialogOpen} editShow={editShow ? {
      id: editShow.id,
      venue: editShow.venue,
      date: editShow.date,
      datePrecision: editShow.datePrecision || 'exact',
      artists: editShow.artists,
      rating: editShow.rating,
      artistPerformance: editShow.artistPerformance,
      sound: editShow.sound,
      lighting: editShow.lighting,
      crowd: editShow.crowd,
      venueVibe: editShow.venueVibe,
      notes: editShow.notes,
      venueId: editShow.venueId
    } : null} />
    </div>;
};
export default Feed;