import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { calculateShowScore } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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

interface ShowRanking {
  id: string;
  show_id: string;
  elo_score: number;
  comparisons_count: number;
}

export default function Rank() {
  const [shows, setShows] = useState<Show[]>([]);
  const [rankings, setRankings] = useState<ShowRanking[]>([]);
  const [showPair, setShowPair] = useState<[Show, Show] | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [comparedPairs, setComparedPairs] = useState<Set<string>>(new Set());
  const [totalComparisons, setTotalComparisons] = useState(0);

  // ELO calculation constants
  const K_BASE = 32; // Base K-factor
  const K_MIN_COMPARISONS = 10; // Minimum comparisons before reducing K-factor

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

      // Fetch or initialize rankings for all shows
      const { data: rankingsData, error: rankingsError } = await supabase
        .from("show_rankings")
        .select("*")
        .eq("user_id", user.id);

      if (rankingsError) throw rankingsError;

      // Initialize rankings for shows that don't have them yet
      const existingRankingIds = new Set(rankingsData?.map(r => r.show_id) || []);
      const newShows = showsData?.filter(show => !existingRankingIds.has(show.id)) || [];
      
      if (newShows.length > 0) {
        const { error: insertError } = await supabase
          .from("show_rankings")
          .insert(
            newShows.map(show => ({
              user_id: user.id,
              show_id: show.id,
              elo_score: 1200,
              comparisons_count: 0
            }))
          );

        if (insertError) throw insertError;

        // Refetch rankings after insert
        const { data: updatedRankings } = await supabase
          .from("show_rankings")
          .select("*")
          .eq("user_id", user.id);

        setRankings(updatedRankings || []);
      } else {
        setRankings(rankingsData || []);
      }

      // Fetch existing comparisons
      const { data: comparisonsData, error: comparisonsError } = await supabase
        .from("show_comparisons")
        .select("show1_id, show2_id")
        .eq("user_id", user.id);

      if (comparisonsError) throw comparisonsError;

      // Build a set of compared pairs (normalized)
      const comparedSet = new Set<string>();
      comparisonsData?.forEach((comp) => {
        const [id1, id2] = [comp.show1_id, comp.show2_id].sort();
        comparedSet.add(`${id1}-${id2}`);
      });
      setComparedPairs(comparedSet);
      setTotalComparisons(comparisonsData?.length || 0);

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
      
      const updatedRankingsData = rankingsData?.length ? rankingsData : 
        newShows.map(show => ({
          id: '',
          show_id: show.id,
          elo_score: 1200,
          comparisons_count: 0
        }));
      
      selectSmartPair(showsWithArtists, updatedRankingsData || [], comparedSet, comparisonsData?.length || 0);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching shows:", error);
      toast.error("Failed to load shows");
      setLoading(false);
    }
  };

  const calculateElo = (
    winnerElo: number,
    loserElo: number,
    winnerComparisons: number,
    loserComparisons: number
  ) => {
    // Dynamic K-factor: higher for shows with fewer comparisons
    const winnerK = winnerComparisons < K_MIN_COMPARISONS 
      ? K_BASE * (1 + (K_MIN_COMPARISONS - winnerComparisons) / K_MIN_COMPARISONS)
      : K_BASE;
    const loserK = loserComparisons < K_MIN_COMPARISONS
      ? K_BASE * (1 + (K_MIN_COMPARISONS - loserComparisons) / K_MIN_COMPARISONS)
      : K_BASE;

    // Expected scores
    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

    // New ratings
    const newWinnerElo = Math.round(winnerElo + winnerK * (1 - expectedWinner));
    const newLoserElo = Math.round(loserElo + loserK * (0 - expectedLoser));

    return { newWinnerElo, newLoserElo };
  };

  const selectSmartPair = (
    allShows: Show[], 
    allRankings: ShowRanking[], 
    pairsSet: Set<string>,
    currentTotalComparisons: number
  ) => {
    // Minimum comparisons threshold - stop after user has made enough comparisons
    const MIN_TOTAL_COMPARISONS = Math.max(15, allShows.length * 2);
    
    if (currentTotalComparisons >= MIN_TOTAL_COMPARISONS) {
      const avgComparisons = currentTotalComparisons / allShows.length;
      if (avgComparisons >= 3) {
        setShowPair(null);
        toast.success("That's all for now! Your rankings are up to date");
        return;
      }
    }

    // Create a map of show rankings
    const rankingMap = new Map(allRankings.map(r => [r.show_id, r]));

    // Score each possible pair based on "value" of comparison
    const pairScores: { pair: [Show, Show]; score: number }[] = [];

    for (let i = 0; i < allShows.length; i++) {
      for (let j = i + 1; j < allShows.length; j++) {
        const [id1, id2] = [allShows[i].id, allShows[j].id].sort();
        const pairKey = `${id1}-${id2}`;
        
        // Skip already compared pairs
        if (pairsSet.has(pairKey)) continue;

        const show1Ranking = rankingMap.get(allShows[i].id);
        const show2Ranking = rankingMap.get(allShows[j].id);

        if (!show1Ranking || !show2Ranking) continue;

        // Calculate "value score" for this comparison
        // Higher score = more valuable comparison
        
        // 1. ELO proximity (closer ELOs = more informative comparison)
        const eloDiff = Math.abs(show1Ranking.elo_score - show2Ranking.elo_score);
        const proximityScore = Math.max(0, 400 - eloDiff) / 400; // 0-1 scale

        // 2. Uncertainty (fewer comparisons = higher uncertainty = more valuable)
        const avgComparisons = (show1Ranking.comparisons_count + show2Ranking.comparisons_count) / 2;
        const uncertaintyScore = Math.max(0, (K_MIN_COMPARISONS - avgComparisons) / K_MIN_COMPARISONS);

        // Combined score (weighted average)
        const combinedScore = proximityScore * 0.6 + uncertaintyScore * 0.4;

        pairScores.push({
          pair: [allShows[i], allShows[j]],
          score: combinedScore
        });
      }
    }

    if (pairScores.length === 0) {
      setShowPair(null);
      toast.success("That's all for now! Your rankings are up to date");
      return;
    }

    // Sort by score and select from top candidates with some randomness
    pairScores.sort((a, b) => b.score - a.score);
    
    // Select from top 5 candidates to add variety
    const topCandidates = pairScores.slice(0, Math.min(5, pairScores.length));
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    
    setShowPair(topCandidates[randomIndex].pair);
  };

  const handleChoice = async (winnerId: string | null) => {
    if (!showPair) return;
    
    setComparing(true);
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Normalize the pair order (smaller UUID first)
      const [show1Id, show2Id] = [showPair[0].id, showPair[1].id].sort();

      // Save comparison to database
      const { error } = await supabase
        .from("show_comparisons")
        .insert({
          user_id: user.id,
          show1_id: show1Id,
          show2_id: show2Id,
          winner_id: winnerId,
        });

      if (error) throw error;

      // Update ELO scores if there's a winner (not "Can't Compare")
      if (winnerId) {
        const show1Ranking = rankings.find(r => r.show_id === showPair[0].id);
        const show2Ranking = rankings.find(r => r.show_id === showPair[1].id);

        if (show1Ranking && show2Ranking) {
          const isShow1Winner = winnerId === showPair[0].id;
          const winnerRanking = isShow1Winner ? show1Ranking : show2Ranking;
          const loserRanking = isShow1Winner ? show2Ranking : show1Ranking;

          const { newWinnerElo, newLoserElo } = calculateElo(
            winnerRanking.elo_score,
            loserRanking.elo_score,
            winnerRanking.comparisons_count,
            loserRanking.comparisons_count
          );

          // Update both rankings
          const { error: updateError } = await supabase
            .from("show_rankings")
            .upsert([
              {
                id: winnerRanking.id,
                user_id: user.id,
                show_id: winnerRanking.show_id,
                elo_score: newWinnerElo,
                comparisons_count: winnerRanking.comparisons_count + 1,
              },
              {
                id: loserRanking.id,
                user_id: user.id,
                show_id: loserRanking.show_id,
                elo_score: newLoserElo,
                comparisons_count: loserRanking.comparisons_count + 1,
              }
            ]);

          if (updateError) throw updateError;

          // Update local rankings state
          const updatedRankings = rankings.map(r => {
            if (r.show_id === winnerRanking.show_id) {
              return { ...r, elo_score: newWinnerElo, comparisons_count: r.comparisons_count + 1 };
            }
            if (r.show_id === loserRanking.show_id) {
              return { ...r, elo_score: newLoserElo, comparisons_count: r.comparisons_count + 1 };
            }
            return r;
          });
          setRankings(updatedRankings);
        }
      } else {
        // "Can't Compare" - still increment comparison counts without changing ELO
        const show1Ranking = rankings.find(r => r.show_id === showPair[0].id);
        const show2Ranking = rankings.find(r => r.show_id === showPair[1].id);

        if (show1Ranking && show2Ranking) {
          const { error: updateError } = await supabase
            .from("show_rankings")
            .upsert([
              {
                id: show1Ranking.id,
                user_id: user.id,
                show_id: show1Ranking.show_id,
                elo_score: show1Ranking.elo_score,
                comparisons_count: show1Ranking.comparisons_count + 1,
              },
              {
                id: show2Ranking.id,
                user_id: user.id,
                show_id: show2Ranking.show_id,
                elo_score: show2Ranking.elo_score,
                comparisons_count: show2Ranking.comparisons_count + 1,
              }
            ]);

          if (updateError) throw updateError;

          const updatedRankings = rankings.map(r => {
            if (r.show_id === showPair[0].id || r.show_id === showPair[1].id) {
              return { ...r, comparisons_count: r.comparisons_count + 1 };
            }
            return r;
          });
          setRankings(updatedRankings);
        }
      }

      // Update the compared pairs set
      const pairKey = `${show1Id}-${show2Id}`;
      const newComparedPairs = new Set([...comparedPairs, pairKey]);
      setComparedPairs(newComparedPairs);
      const newTotalComparisons = totalComparisons + 1;
      setTotalComparisons(newTotalComparisons);

      // Select a new smart pair
      setTimeout(() => {
        selectSmartPair(shows, rankings, newComparedPairs, newTotalComparisons);
        setComparing(false);
      }, 300);
    } catch (error) {
      console.error("Error saving comparison:", error);
      toast.error("Failed to save comparison");
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
        <div className="text-center space-y-2">
          <p className="text-foreground font-semibold">That's all for now!</p>
          <p className="text-muted-foreground text-sm">
            Your rankings are up to date
          </p>
        </div>
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

      <div className="flex flex-col md:flex-row gap-6 items-stretch justify-center">
        {renderShowCard(showPair[0], "left")}
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
