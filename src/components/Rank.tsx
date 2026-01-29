import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import RankingCard from "./rankings/RankingCard";
import RankingProgressBar from "./rankings/RankingProgressBar";
import SceneLogo from "./ui/SceneLogo";

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
  notes: string | null;
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
  
  // Animation states
  const [pairKey, setPairKey] = useState(0);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const K_BASE = 32;
  const K_MIN_COMPARISONS = 10;

  // Trigger confetti celebration
  const triggerConfetti = useCallback(() => {
    const colors = ['#22d3ee', '#f97316', '#fbbf24']; // cyan, coral, gold
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors,
    });
    
    // Second burst for more impact
    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
        colors,
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
        colors,
      });
    }, 150);
  }, []);

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

      const { data: rankingsData, error: rankingsError } = await supabase
        .from("show_rankings")
        .select("*")
        .eq("user_id", user.id);

      if (rankingsError) throw rankingsError;

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

        const { data: updatedRankings } = await supabase
          .from("show_rankings")
          .select("*")
          .eq("user_id", user.id);

        setRankings(updatedRankings || []);
      } else {
        setRankings(rankingsData || []);
      }

      const { data: comparisonsData, error: comparisonsError } = await supabase
        .from("show_comparisons")
        .select("show1_id, show2_id")
        .eq("user_id", user.id);

      if (comparisonsError) throw comparisonsError;

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
    const winnerK = winnerComparisons < K_MIN_COMPARISONS 
      ? K_BASE * (1 + (K_MIN_COMPARISONS - winnerComparisons) / K_MIN_COMPARISONS)
      : K_BASE;
    const loserK = loserComparisons < K_MIN_COMPARISONS
      ? K_BASE * (1 + (K_MIN_COMPARISONS - loserComparisons) / K_MIN_COMPARISONS)
      : K_BASE;

    const expectedWinner = 1 / (1 + Math.pow(10, (loserElo - winnerElo) / 400));
    const expectedLoser = 1 / (1 + Math.pow(10, (winnerElo - loserElo) / 400));

    const newWinnerElo = Math.round(winnerElo + winnerK * (1 - expectedWinner));
    const newLoserElo = Math.round(loserElo + loserK * (0 - expectedLoser));

    return { newWinnerElo, newLoserElo };
  };

  const selectSmartPair = (
    allShows: Show[], 
    allRankings: ShowRanking[], 
    pairsSet: Set<string>,
    currentTotalComparisons: number,
    shouldCelebrate: boolean = false
  ) => {
    const MIN_TOTAL_COMPARISONS = Math.max(15, allShows.length * 2);
    
    if (currentTotalComparisons >= MIN_TOTAL_COMPARISONS) {
      const avgComparisons = currentTotalComparisons / allShows.length;
      if (avgComparisons >= 3) {
        setShowPair(null);
        if (shouldCelebrate) {
          triggerConfetti();
        }
        toast.success("That's all for now! Your rankings are up to date");
        return;
      }
    }

    const rankingMap = new Map(allRankings.map(r => [r.show_id, r]));
    const pairScores: { pair: [Show, Show]; score: number }[] = [];

    for (let i = 0; i < allShows.length; i++) {
      for (let j = i + 1; j < allShows.length; j++) {
        const [id1, id2] = [allShows[i].id, allShows[j].id].sort();
        const pairKey = `${id1}-${id2}`;
        
        if (pairsSet.has(pairKey)) continue;

        const show1Ranking = rankingMap.get(allShows[i].id);
        const show2Ranking = rankingMap.get(allShows[j].id);

        if (!show1Ranking || !show2Ranking) continue;

        const eloDiff = Math.abs(show1Ranking.elo_score - show2Ranking.elo_score);
        const proximityScore = Math.max(0, 400 - eloDiff) / 400;

        const avgComparisons = (show1Ranking.comparisons_count + show2Ranking.comparisons_count) / 2;
        const uncertaintyScore = Math.max(0, (K_MIN_COMPARISONS - avgComparisons) / K_MIN_COMPARISONS);

        const combinedScore = proximityScore * 0.6 + uncertaintyScore * 0.4;

        pairScores.push({
          pair: [allShows[i], allShows[j]],
          score: combinedScore
        });
      }
    }

    if (pairScores.length === 0) {
      setShowPair(null);
      if (shouldCelebrate) {
        triggerConfetti();
      }
      toast.success("That's all for now! Your rankings are up to date");
      return;
    }

    pairScores.sort((a, b) => b.score - a.score);
    const topCandidates = pairScores.slice(0, Math.min(5, pairScores.length));
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    
    setShowPair(topCandidates[randomIndex].pair);
    setPairKey(prev => prev + 1); // Trigger slide-in animation
  };

  const handleChoice = async (winnerId: string | null) => {
    if (!showPair || comparing) return;
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    // Set winner for animation
    if (winnerId) {
      setSelectedWinner(winnerId);
    }
    
    setComparing(true);
    
    // Wait for animation to play
    await new Promise(resolve => setTimeout(resolve, 400));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [show1Id, show2Id] = [showPair[0].id, showPair[1].id].sort();

      const { error } = await supabase
        .from("show_comparisons")
        .insert({
          user_id: user.id,
          show1_id: show1Id,
          show2_id: show2Id,
          winner_id: winnerId,
        });

      if (error) throw error;

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

      const newPairKey = `${show1Id}-${show2Id}`;
      const newComparedPairs = new Set([...comparedPairs, newPairKey]);
      setComparedPairs(newComparedPairs);
      const newTotalComparisons = totalComparisons + 1;
      setTotalComparisons(newTotalComparisons);

      // Reset animation states and select next pair
      setSelectedWinner(null);
      selectSmartPair(shows, rankings, newComparedPairs, newTotalComparisons, true);
      setComparing(false);
    } catch (error) {
      console.error("Error saving comparison:", error);
      toast.error("Failed to save comparison");
      setComparing(false);
      setSelectedWinner(null);
    }
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
        <SceneLogo size="md" />
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <SceneLogo size="md" />
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
    <div className="max-w-md mx-auto px-4 py-6 space-y-8 animate-fade-in">
      {/* Header with brand glow */}
      <div className="text-center">
        <h1 
          className="text-lg font-black tracking-[0.15em] uppercase"
          style={{
            textShadow: '0 0 8px rgba(255,255,255,0.4), 0 0 20px rgba(255,255,255,0.15)'
          }}
        >
          Show Ranker
        </h1>
      </div>

      {/* Progress Bar */}
      <RankingProgressBar 
        comparisons={totalComparisons} 
        totalShows={shows.length} 
      />

      {/* VS Battle Cards */}
      <div className="relative flex gap-3 items-start pt-4">
        {/* Left Card */}
        <RankingCard
          show={showPair[0]}
          onClick={() => handleChoice(showPair[0].id)}
          disabled={comparing}
          position="left"
          isWinner={selectedWinner === showPair[0].id}
          isLoser={selectedWinner !== null && selectedWinner !== showPair[0].id}
          animationKey={pairKey}
          isExpanded={showDetails}
        />

        {/* VS Badge - positioned relative to photo aspect ratio (4:3), not full card */}
        <div 
          className="absolute left-1/2 -translate-x-1/2 z-10"
          style={{ top: 'calc((100vw - 2rem - 0.75rem) / 2 * 0.75 / 2 + 1rem)' }}
        >
          <div 
            className="bg-primary text-primary-foreground font-bold text-sm px-4 py-2 rounded-full"
            style={{ 
              boxShadow: '0 0 20px hsl(var(--primary) / 0.5), 0 4px 12px rgba(0,0,0,0.3)' 
            }}
          >
            VS
          </div>
        </div>

        {/* Right Card */}
        <RankingCard
          show={showPair[1]}
          onClick={() => handleChoice(showPair[1].id)}
          disabled={comparing}
          position="right"
          isWinner={selectedWinner === showPair[1].id}
          isLoser={selectedWinner !== null && selectedWinner !== showPair[1].id}
          animationKey={pairKey}
          isExpanded={showDetails}
        />
      </div>

      {/* Instruction Text */}
      <div className="text-center space-y-3">
        {/* See Full Details Toggle */}
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="flex items-center justify-center gap-1 mx-auto text-xs text-muted-foreground/70 hover:text-muted-foreground transition-colors"
        >
          {showDetails ? "Hide details" : "See full details"}
          <ChevronDown className={cn(
            "h-3 w-3 transition-transform duration-200",
            showDetails && "rotate-180"
          )} />
        </button>
        
        <p className="text-sm text-muted-foreground">
          Tap to choose the winner
        </p>
        
        {/* Can't Compare */}
        <button
          onClick={() => handleChoice(null)}
          disabled={comparing}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline-offset-4 hover:underline"
        >
          {comparing ? (
            <span className="flex items-center gap-2 justify-center">
              <Loader2 className="h-3 w-3 animate-spin" />
              Got it
            </span>
          ) : (
            "Can't compare these"
          )}
        </button>

        {/* See Current Rankings - Liquid Glass Button */}
        <button
          onClick={() => {
            // Navigate to Feed with Top Shows tab
            window.location.href = '/dashboard?tab=feed&view=top';
          }}
          className="mt-2 px-4 py-2 rounded-full text-xs font-medium text-foreground/90 backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
            boxShadow: '0 4px 24px -4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
          }}
        >
          See current rankings
        </button>
      </div>
    </div>
  );
}
