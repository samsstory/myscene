import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Music2, MapPin, Calendar as CalendarIcon, List, Trophy, Share2, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { ShareShowSheet } from "./ShareShowSheet";
import { ShowReviewSheet } from "./ShowReviewSheet";
import MapView from "./MapView";
import AddShowFlow from "./AddShowFlow";
import { calculateShowScore, getScoreGradient } from "@/lib/utils";
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

      // Sort by rating (descending) and then by date (descending)
      return [...filteredShows].sort((a, b) => {
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }
    return filteredShows;
  };
  const getShowsForDate = (date: Date) => {
    return shows.filter(show => isSameDay(parseISO(show.date), date));
  };
  const renderListView = () => {
    const sortedShows = getSortedShows();
    return <div className="grid gap-4">
        {sortedShows.map((show, index) => <Card key={show.id} className={`border-border shadow-card hover:shadow-glow transition-all duration-300 overflow-visible cursor-pointer relative ${viewMode === "top-rated" ? "ml-8" : ""}`} onClick={() => {
        setReviewShow(show);
        setReviewSheetOpen(true);
      }}>
            <CardContent className="p-6 py-[24px] px-[10px] mx-0 rounded-none">
              <div className="flex items-start gap-6">
                {/* Leaderboard ranking number (only in top-rated view) */}
                {viewMode === "top-rated" && <div className="absolute -left-4 top-1/2 -translate-y-1/2 text-5xl font-black text-primary z-10" style={{
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)'
            }}>
                    {index + 1}
                  </div>}

                {/* Photo thumbnail (only if photo exists) */}
                {show.photo_url && <div className="relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0">
                    <img src={show.photo_url} alt="Show photo" className="w-full h-full object-cover" style={{
                maskImage: 'radial-gradient(circle at center, black 50%, transparent 100%)',
                WebkitMaskImage: 'radial-gradient(circle at center, black 50%, transparent 100%)'
              }} />
                  </div>}

                {/* Left section: Artist and show details */}
                <div className="flex-1 space-y-4">
                  {/* Artist names */}
                  <div className="flex items-center gap-2">
                    <Music2 className="h-5 w-5 text-primary flex-shrink-0" />
                    <div className="flex flex-wrap gap-2">
                      {show.artists.slice(0, 2).map((artist, idx) => <span key={idx} className="text-lg font-bold">
                          {artist.name}
                          {idx < Math.min(show.artists.length - 1, 1) && <span className="mx-1">•</span>}
                        </span>)}
                      {show.artists.length > 2 && <span className="text-lg font-bold text-muted-foreground">
                          + {show.artists.length - 2} more
                        </span>}
                    </div>
                  </div>

                  {/* Venue and Date in a clean grid */}
                  <div className="grid gap-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-4 w-4 flex-shrink-0" />
                      <span>{show.venue.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <CalendarIcon className="h-4 w-4 flex-shrink-0" />
                      <span>{format(parseISO(show.date), "MMM d, yyyy")}</span>
                    </div>
                  </div>
                </div>

                {/* Right section: Rating and Share button */}
                <div className="flex flex-col items-center gap-3 min-w-[100px]">
                  <div className={`text-4xl font-black bg-gradient-to-r ${getScoreGradient(calculateShowScore(show.rating, show.artistPerformance, show.sound, show.lighting, show.crowd, show.venueVibe))} bg-clip-text text-transparent`}>
                    {calculateShowScore(show.rating, show.artistPerformance, show.sound, show.lighting, show.crowd, show.venueVibe).toFixed(1)}
                  </div>
                  {viewMode === "top-rated" && <Badge variant="outline" className="text-xs">
                      {calculateShowScore(show.rating, show.artistPerformance, show.sound, show.lighting, show.crowd, show.venueVibe).toFixed(1)}/10
                    </Badge>}
                  <Button size="sm" variant="default" className="w-full" onClick={e => {
                e.stopPropagation();
                setShareShow(show);
                setShareSheetOpen(true);
              }}>
                    <Share2 className="h-4 w-4 mr-1" />
                    Share
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>)}
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
          return <div key={day.toISOString()} className={`aspect-square border rounded-lg p-2 flex items-center justify-center ${isToday ? "border-primary bg-primary/10" : "border-border"} ${dayShows.length > 0 ? "bg-card" : "bg-background"}`}>
              {dayShows.length > 0 ? <div className="flex flex-wrap gap-1 items-center justify-center">
                    {dayShows.map(show => {
                      const score = calculateShowScore(show.rating, show.artistPerformance, show.sound, show.lighting, show.crowd, show.venueVibe);
                      const getDotColor = (score: number) => {
                        if (score >= 9.0) return "bg-[hsl(45,93%,58%)]"; // Gold
                        if (score >= 7.0) return "bg-[hsl(189,94%,55%)]"; // Blue
                        if (score >= 5.0) return "bg-[hsl(17,88%,60%)]"; // Coral
                        return "bg-[hsl(0,84%,60%)]"; // Red
                      };
                      return (
                        <button 
                          key={show.id} 
                          className={`w-3 h-3 rounded-full ${getDotColor(score)} hover:scale-125 transition-transform cursor-pointer shadow-lg`}
                          title={`${show.artists.map(a => a.name).join(", ")} - ${show.venue.name} (${score.toFixed(1)}/10)`} 
                          onClick={() => {
                            setReviewShow(show);
                            setReviewSheetOpen(true);
                          }}
                        />
                      );
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

      <Tabs value={viewMode} onValueChange={v => setViewMode(v as typeof viewMode)} className="mb-6">
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
            <MapPin className="h-4 w-4" />
            <span className="hidden sm:inline">Show Globe</span>
          </TabsTrigger>
        </TabsList>

        {/* Time period filters for Top Rated view */}
        {viewMode === "top-rated" && <div className="flex justify-center gap-2 mt-4">
            <Button variant={topRatedFilter === "all-time" ? "default" : "outline"} size="sm" onClick={() => setTopRatedFilter("all-time")}>
              All Time
            </Button>
            <Button variant={topRatedFilter === "this-year" ? "default" : "outline"} size="sm" onClick={() => setTopRatedFilter("this-year")}>
              This Year
            </Button>
            <Button variant={topRatedFilter === "this-month" ? "default" : "outline"} size="sm" onClick={() => setTopRatedFilter("this-month")}>
              This Month
            </Button>
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

      <ShareShowSheet show={shareShow} open={shareSheetOpen} onOpenChange={setShareSheetOpen} />

      <ShowReviewSheet show={reviewShow} open={reviewSheetOpen} onOpenChange={setReviewSheetOpen} onEdit={show => {
      setEditShow(show);
      setEditDialogOpen(true);
    }} />

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