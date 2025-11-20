import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Music2, MapPin, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Your Show History</h2>
        <Badge variant="secondary" className="text-sm">
          {shows.length} shows
        </Badge>
      </div>

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
      ) : (
        <div className="grid gap-4">
          {shows.map((show) => (
            <Card
              key={show.id}
              className="border-border shadow-card hover:shadow-glow transition-all duration-300 group"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Music2 className="h-5 w-5 text-primary" />
                        <h3 className="text-xl font-bold group-hover:text-primary transition-colors">
                          {show.artists
                            .filter((a) => a.isHeadliner)
                            .map((a) => a.name)
                            .join(", ")}
                        </h3>
                      </div>
                      {show.artists.filter((a) => !a.isHeadliner).length > 0 && (
                        <p className="text-sm text-muted-foreground ml-7">
                          with{" "}
                          {show.artists
                            .filter((a) => !a.isHeadliner)
                            .map((a) => a.name)
                            .join(", ")}
                        </p>
                      )}
                    </div>

                    <div className="flex flex-wrap gap-4 text-sm text-muted-foreground ml-7">
                      <div className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        <span>{show.venue.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>{new Date(show.date).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-4xl ml-4">{getRatingEmoji(show.rating)}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Feed;
