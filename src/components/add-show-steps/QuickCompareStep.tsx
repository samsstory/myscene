import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Loader2, MapPin, CalendarDays, Sparkles, SkipForward } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { selectBestAnchor } from "@/lib/smart-pairing";

interface QuickCompareStepProps {
  newShowId: string;
  newShowArtists: Array<{ name: string; isHeadliner: boolean }>;
  newShowVenue: string;
  newShowDate: string;
  onComplete: () => void;
  onSkip: () => void;
}

interface ExistingShow {
  id: string;
  venue_name: string;
  show_date: string;
  photo_url: string | null;
  artists: Array<{ artist_name: string; is_headliner: boolean }>;
}

const QuickCompareStep = ({
  newShowId,
  newShowArtists,
  newShowVenue,
  newShowDate,
  onComplete,
  onSkip,
}: QuickCompareStepProps) => {
  const [existingShow, setExistingShow] = useState<ExistingShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchRandomShow();
  }, [newShowId]);

  const fetchRandomShow = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get all existing shows (not the one we just added)
      const { data: showsData, error: showsError } = await supabase
        .from("shows")
        .select("id, venue_name, show_date, photo_url")
        .eq("user_id", user.id)
        .neq("id", newShowId)
        .order("show_date", { ascending: false })
        .limit(20);

      if (showsError) throw showsError;

      if (!showsData || showsData.length === 0) {
        // No other shows to compare with
        setExistingShow(null);
        setLoading(false);
        return;
      }

      // Get rankings to use smart anchor selection
      const { data: rankingsData } = await supabase
        .from("show_rankings")
        .select("id, show_id, elo_score, comparisons_count")
        .eq("user_id", user.id);

      // Use smart anchor selection to pick the best show to compare against
      const anchorShow = selectBestAnchor({
        newShowId,
        existingShows: showsData,
        rankings: rankingsData || [],
      });

      const selectedShow = anchorShow || showsData[Math.floor(Math.random() * showsData.length)];

      // Fetch artists for this show
      const { data: artistsData } = await supabase
        .from("show_artists")
        .select("artist_name, is_headliner")
        .eq("show_id", selectedShow.id)
        .order("is_headliner", { ascending: false });

      setExistingShow({
        ...selectedShow,
        artists: artistsData || [],
      });
    } catch (error) {
      console.error("Error fetching show:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChoice = async (winnerId: string) => {
    if (!existingShow || submitting) return;

    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Normalize the pair order
      const [show1Id, show2Id] = [newShowId, existingShow.id].sort();

      // Save comparison
      await supabase.from("show_comparisons").insert({
        user_id: user.id,
        show1_id: show1Id,
        show2_id: show2Id,
        winner_id: winnerId,
      });

      // Initialize or update ELO scores
      const { data: rankings } = await supabase
        .from("show_rankings")
        .select("*")
        .eq("user_id", user.id)
        .in("show_id", [newShowId, existingShow.id]);

      const rankingMap = new Map(rankings?.map(r => [r.show_id, r]) || []);

      // Get or create rankings
      const newShowRanking = rankingMap.get(newShowId) || {
        id: null,
        show_id: newShowId,
        elo_score: 1200,
        comparisons_count: 0,
      };
      const existingShowRanking = rankingMap.get(existingShow.id) || {
        id: null,
        show_id: existingShow.id,
        elo_score: 1200,
        comparisons_count: 0,
      };

      // Calculate new ELO
      const K = 32;
      const winnerRanking = winnerId === newShowId ? newShowRanking : existingShowRanking;
      const loserRanking = winnerId === newShowId ? existingShowRanking : newShowRanking;

      const expectedWinner = 1 / (1 + Math.pow(10, (loserRanking.elo_score - winnerRanking.elo_score) / 400));
      const expectedLoser = 1 / (1 + Math.pow(10, (winnerRanking.elo_score - loserRanking.elo_score) / 400));

      const newWinnerElo = Math.round(winnerRanking.elo_score + K * (1 - expectedWinner));
      const newLoserElo = Math.round(loserRanking.elo_score + K * (0 - expectedLoser));

      // Upsert rankings
      await supabase.from("show_rankings").upsert([
        {
          ...(winnerRanking.id ? { id: winnerRanking.id } : {}),
          user_id: user.id,
          show_id: winnerRanking.show_id,
          elo_score: newWinnerElo,
          comparisons_count: winnerRanking.comparisons_count + 1,
        },
        {
          ...(loserRanking.id ? { id: loserRanking.id } : {}),
          user_id: user.id,
          show_id: loserRanking.show_id,
          elo_score: newLoserElo,
          comparisons_count: loserRanking.comparisons_count + 1,
        },
      ]);

      onComplete();
    } catch (error) {
      console.error("Error saving comparison:", error);
      onComplete(); // Still complete even on error
    }
  };

  const renderShowCard = (
    id: string,
    artists: Array<{ name?: string; artist_name?: string; is_headliner?: boolean; isHeadliner?: boolean }>,
    venue: string,
    date: string,
    photoUrl?: string | null,
    isNew?: boolean
  ) => {
    const displayArtists = artists.slice(0, 2);
    const remainingCount = artists.length - displayArtists.length;

    return (
      <Card
        className={`flex-1 cursor-pointer transition-all hover:scale-[1.02] hover:border-primary ${
          isNew ? "ring-2 ring-primary/30" : ""
        }`}
        onClick={() => !submitting && handleChoice(id)}
      >
        <CardContent className="p-4 space-y-3">
          {photoUrl && (
            <div className="w-full aspect-video rounded-lg overflow-hidden">
              <img
                src={photoUrl}
                alt="Show photo"
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {isNew && (
            <div className="flex items-center gap-1.5 text-xs text-primary font-medium">
              <Sparkles className="h-3 w-3" />
              Just added
            </div>
          )}

          <div className="space-y-1.5">
            <div className="font-semibold text-base leading-tight">
              {displayArtists.map((a, idx) => (
                <span key={idx}>
                  {a.name || a.artist_name}
                  {idx < displayArtists.length - 1 && " • "}
                </span>
              ))}
              {remainingCount > 0 && (
                <span className="text-muted-foreground text-sm"> +{remainingCount}</span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{venue}</span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{format(parseISO(date), "MMM d, yyyy")}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12 space-y-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground text-sm">Finding a show to compare...</p>
      </div>
    );
  }

  if (!existingShow) {
    // No other shows - this is the user's first show
    return (
      <div className="flex flex-col items-center text-center space-y-4 py-6">
        <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
          <Sparkles className="h-7 w-7 text-primary" />
        </div>
        <div className="space-y-2">
          <h3 className="text-lg font-bold">First Show Logged!</h3>
          <p className="text-muted-foreground text-sm max-w-xs">
            Add more shows to start ranking them against each other.
          </p>
        </div>
        <Button onClick={onSkip} className="w-full mt-4">
          Done
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h3 className="text-lg font-bold">Quick Compare</h3>
        <p className="text-muted-foreground text-sm">
          Which show was better? Tap to choose.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {renderShowCard(
          newShowId,
          newShowArtists,
          newShowVenue,
          newShowDate,
          null,
          true
        )}
        {renderShowCard(
          existingShow.id,
          existingShow.artists,
          existingShow.venue_name,
          existingShow.show_date,
          existingShow.photo_url
        )}
      </div>

      <Button
        variant="ghost"
        className="w-full text-muted-foreground"
        onClick={onSkip}
        disabled={submitting}
      >
        <SkipForward className="h-4 w-4 mr-2" />
        Skip for now
      </Button>
    </div>
  );
};

export default QuickCompareStep;
