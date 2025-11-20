import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Music2, MapPin, Calendar as CalendarIcon, List, Trophy, Share2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, parseISO } from "date-fns";
import { ShareShowSheet } from "./ShareShowSheet";

interface Artist {
  name: string;
  isHeadliner: boolean;
}

interface Show {
  id: string;
  artists: Artist[];
  venue: { name: string; location: string };
  date: string;
  rating: number;
}

const getRatingEmoji = (rating: number) => {
  const emojis = ["😞", "😕", "😐", "😊", "🤩"];
  return emojis[rating - 1] || "😐";
};

const Feed = () => {
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"list" | "calendar" | "top-rated">("list");
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [shareShow, setShareShow] = useState<Show | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);

  useEffect(() => {
    fetchShows();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('shows_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'shows'
        },
        () => {
          fetchShows();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
        .select('*')
        .eq('user_id', user.id)
        .order('show_date', { ascending: false });

      if (showsError) throw showsError;

      // Fetch artists for each show
      const showsWithArtists = await Promise.all(
        (showsData || []).map(async (show) => {
          const { data: artistsData } = await supabase
            .from('show_artists')
            .select('*')
            .eq('show_id', show.id);

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
            rating: show.rating
          };
        })
      );

      setShows(showsWithArtists);
    } catch (error) {
      console.error('Error fetching shows:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSortedShows = () => {
    if (viewMode === "top-rated") {
      return [...shows].sort((a, b) => {
        if (b.rating !== a.rating) {
          return b.rating - a.rating;
        }
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      });
    }
    return shows;
  };

  const getShowsForDate = (date: Date) => {
    return shows.filter(show => isSameDay(parseISO(show.date), date));
  };

  const renderListView = () => {
    const sortedShows = getSortedShows();
    
    return (
      <div className="grid gap-4">
        {sortedShows.map((show) => (
          <Card
            key={show.id}
            className="border-border shadow-card hover:shadow-glow transition-all duration-300 overflow-hidden"
          >
            <CardContent className="p-0">
              <div className="flex items-center gap-4 p-6">
                <div className="flex-1 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <Music2 className="h-5 w-5 text-primary" />
                        <div className="flex flex-wrap gap-2">
                          {show.artists.map((artist, idx) => (
                            <span key={idx} className="text-lg font-bold">
                              {artist.name}
                              {artist.isHeadliner && (
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  Headliner
                                </Badge>
                              )}
                              {idx < show.artists.length - 1 && <span className="mx-1">•</span>}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <MapPin className="h-4 w-4" />
                          <span>
                            {show.venue.name}
                            {show.venue.location && ` • ${show.venue.location}`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CalendarIcon className="h-4 w-4" />
                          <span>{format(parseISO(show.date), "MMM d, yyyy")}</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <div className="text-4xl">{getRatingEmoji(show.rating)}</div>
                      {viewMode === "top-rated" && (
                        <Badge variant="outline" className="text-xs">
                          {show.rating}/5
                        </Badge>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2"
                        onClick={() => {
                          setShareShow(show);
                          setShareSheetOpen(true);
                        }}
                      >
                        <Share2 className="h-4 w-4 mr-1" />
                        Share
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderCalendarView = () => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const startDay = monthStart.getDay();

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-2xl font-bold">{format(currentMonth, "MMMM yyyy")}</h3>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1))}
              className="px-3 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors"
            >
              ←
            </button>
            <button
              onClick={() => setCurrentMonth(new Date())}
              className="px-3 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors text-sm"
            >
              Today
            </button>
            <button
              onClick={() => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1))}
              className="px-3 py-1 rounded bg-secondary hover:bg-secondary/80 transition-colors"
            >
              →
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-2">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(day => (
            <div key={day} className="text-center text-sm font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
          
          {Array.from({ length: startDay }).map((_, i) => (
            <div key={`empty-${i}`} className="aspect-square" />
          ))}
          
          {days.map(day => {
            const dayShows = getShowsForDate(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div
                key={day.toISOString()}
                className={`aspect-square border rounded-lg p-2 ${
                  isToday ? "border-primary bg-primary/10" : "border-border"
                } ${dayShows.length > 0 ? "bg-card" : "bg-background"}`}
              >
                <div className="text-xs font-medium mb-1">{format(day, "d")}</div>
                <div className="flex flex-wrap gap-1">
                  {dayShows.slice(0, 3).map((show, idx) => (
                    <div
                      key={show.id}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 flex items-center justify-center text-xs border border-primary/20"
                      title={`${show.artists.map(a => a.name).join(", ")} - ${getRatingEmoji(show.rating)}`}
                    >
                      {getRatingEmoji(show.rating)}
                    </div>
                  ))}
                  {dayShows.length > 3 && (
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-xs">
                      +{dayShows.length - 3}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Show History</h2>
        <Badge variant="secondary" className="text-sm">
          {shows.length} shows
        </Badge>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)} className="mb-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            <span className="hidden sm:inline">List</span>
          </TabsTrigger>
          <TabsTrigger value="calendar" className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Calendar</span>
          </TabsTrigger>
          <TabsTrigger value="top-rated" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Top Rated</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <Card className="border-border shadow-card">
          <CardContent className="py-16 text-center">
            <Music2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground animate-pulse" />
            <p className="text-muted-foreground">Loading shows...</p>
          </CardContent>
        </Card>
      ) : shows.length === 0 ? (
        <Card className="border-border shadow-card">
          <CardContent className="py-16 text-center">
            <Music2 className="h-16 w-16 mx-auto mb-4 text-muted-foreground" />
            <h3 className="text-xl font-semibold mb-2">No shows yet</h3>
            <p className="text-muted-foreground">
              Start logging your concert experiences!
            </p>
          </CardContent>
        </Card>
      ) : viewMode === "calendar" ? (
        renderCalendarView()
      ) : (
        renderListView()
      )}

      <ShareShowSheet
        show={shareShow}
        open={shareSheetOpen}
        onOpenChange={setShareSheetOpen}
      />
    </div>
  );
};

export default Feed;
