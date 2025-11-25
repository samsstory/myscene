import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { calculateShowScore } from "@/lib/utils";
import { Loader2 } from "lucide-react";

interface Show {
  id: string;
  venue_name: string;
  show_date: string;
  rating: number;
  artist_performance: number | null;
  sound: number | null;
  lighting: number | null;
  crowd: number | null;
  venue_vibe: number | null;
  photo_url: string | null;
  artists: Array<{ artist_name: string; is_headliner: boolean }>;
}

export default function Rank() {
  const [shows, setShows] = useState<Show[]>([]);
  const [showPair, setShowPair] = useState<[Show, Show] | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);

  useEffect(() => {
    fetchShows();
  }, []);

  const fetchShows = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: showsData, error: showsError } = await supabase
        .from("shows")
        .select("*")
        .eq("user_id", user.id)
        .order("show_date", { ascending: false });

      if (showsError) throw showsError;

      if (!showsData || showsData.length < 2) {
        setLoading(false);
        return;
      }

      const showsWithArtists = await Promise.all(
        showsData.map(async (show) => {
          const { data: artistsData } = await supabase
            .from("show_artists")
            .select("artist_name, is_headliner")
            .eq("show_id", show.id)
            .order("is_headliner", { ascending: false });

          return {
            ...show,
            artists: artistsData || [],
          };
        })
      );

      setShows(showsWithArtists);
      selectRandomPair(showsWithArtists);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching shows:", error);
      setLoading(false);
    }
  };

  const selectRandomPair = (showsList: Show[]) => {
    if (showsList.length < 2) return;
    
    const shuffled = [...showsList].sort(() => Math.random() - 0.5);
    setShowPair([shuffled[0], shuffled[1]]);
  };

  const handleChoice = async (winnerId: string | null) => {
    if (!showPair) return;
    
    setComparing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // TODO: Save comparison to database once schema is created
      console.log("Comparison:", {
        show1_id: showPair[0].id,
        show2_id: showPair[1].id,
        winner_id: winnerId,
      });

      // Select next random pair
      selectRandomPair(shows);
    } catch (error) {
      console.error("Error saving comparison:", error);
    } finally {
      setComparing(false);
    }
  };

  const renderShowCard = (show: Show, position: "left" | "right") => {
    const score = calculateShowScore(
      show.rating,
      show.artist_performance,
      show.sound,
      show.lighting,
      show.crowd,
      show.venue_vibe
    );

    const headliners = show.artists.filter((a) => a.is_headliner);
    const openers = show.artists.filter((a) => !a.is_headliner);
    const displayArtists = [...headliners, ...openers].slice(0, 2);
    const remainingCount = show.artists.length - displayArtists.length;

    return (
      <Card 
        className="flex-1 cursor-pointer transition-all hover:scale-105 hover:border-primary"
        onClick={() => !comparing && handleChoice(show.id)}
      >
        <CardContent className="p-6 space-y-4">
          {show.photo_url && (
            <div className="w-full h-48 rounded-lg overflow-hidden">
              <img
                src={show.photo_url}
                alt="Show photo"
                className="w-full h-full object-cover"
              />
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-primary">{score}</div>
            </div>
            
            <div className="space-y-1">
              <div className="font-semibold text-lg">
                {displayArtists.map((a) => a.artist_name).join(", ")}
                {remainingCount > 0 && (
                  <span className="text-muted-foreground text-sm ml-1">
                    +{remainingCount} more
                  </span>
                )}
              </div>
              
              <div className="text-sm text-muted-foreground">
                {show.venue_name}
              </div>
              
              <div className="text-xs text-muted-foreground">
                {new Date(show.show_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!shows || shows.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-4">
        <p className="text-muted-foreground text-center">
          You need at least 2 shows to start ranking them against each other.
        </p>
        <p className="text-sm text-muted-foreground">
          Add more shows to unlock this feature!
        </p>
      </div>
    );
  }

  if (!showPair) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <p className="text-muted-foreground">No shows available to compare.</p>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-bold">Which show was better?</h2>
        <p className="text-muted-foreground">
          Help us understand your preferences by comparing shows
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-6 items-stretch">
        {renderShowCard(showPair[0], "left")}
        
        <div className="flex items-center justify-center">
          <div className="text-2xl font-bold text-muted-foreground">VS</div>
        </div>
        
        {renderShowCard(showPair[1], "right")}
      </div>

      <div className="flex justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={() => handleChoice(null)}
          disabled={comparing}
          className="min-w-[200px]"
        >
          {comparing ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            "Can't Compare"
          )}
        </Button>
      </div>
    </div>
  );
}
