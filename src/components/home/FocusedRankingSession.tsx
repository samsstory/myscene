import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ArrowLeft, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import RankingCard from "../rankings/RankingCard";
import RankingProgressBar from "../rankings/RankingProgressBar";
import SceneLogo from "../ui/SceneLogo";

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

interface FocusedRankingSessionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}

const COMPARISON_THRESHOLD = 3;
const K_BASE = 32;
const K_MIN_COMPARISONS = 10;

const FocusedRankingSession = ({ open, onOpenChange, onComplete }: FocusedRankingSessionProps) => {
  const [shows, setShows] = useState<Show[]>([]);
  const [rankings, setRankings] = useState<ShowRanking[]>([]);
  const [showPair, setShowPair] = useState<[Show, Show] | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [comparedPairs, setComparedPairs] = useState<Set<string>>(new Set());
  
  // Progress tracking
  const [initialUnderRankedCount, setInitialUnderRankedCount] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  
  // Animation states
  const [pairKey, setPairKey] = useState(0);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Trigger confetti celebration
  const triggerConfetti = useCallback(() => {
    const colors = ['#22d3ee', '#f97316', '#fbbf24'];
    
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors,
    });
    
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

  // Fetch data when sheet opens
  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    setLoading(true);
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

      // Ensure all shows have rankings
      const existingRankingIds = new Set(rankingsData?.map(r => r.show_id) || []);
      const newShows = showsData?.filter(show => !existingRankingIds.has(show.id)) || [];
      
      if (newShows.length > 0) {
        await supabase
          .from("show_rankings")
          .insert(newShows.map(show => ({
            user_id: user.id,
            show_id: show.id,
            elo_score: 1200,
            comparisons_count: 0
          })));

        const { data: updatedRankings } = await supabase
          .from("show_rankings")
          .select("*")
          .eq("user_id", user.id);

        setRankings(updatedRankings || []);
      } else {
        setRankings(rankingsData || []);
      }

      // Get compared pairs
      const { data: comparisonsData } = await supabase
        .from("show_comparisons")
        .select("show1_id, show2_id")
        .eq("user_id", user.id);

      const comparedSet = new Set<string>();
      comparisonsData?.forEach((comp) => {
        const [id1, id2] = [comp.show1_id, comp.show2_id].sort();
        comparedSet.add(`${id1}-${id2}`);
      });
      setComparedPairs(comparedSet);

      // Load shows with artists
      const showsWithArtists = await Promise.all(
        (showsData || []).map(async (show) => {
          const { data: artistsData } = await supabase
            .from("show_artists")
            .select("artist_name, is_headliner")
            .eq("show_id", show.id)
            .order("is_headliner", { ascending: false });

          return { ...show, artists: artistsData || [] };
        })
      );

      setShows(showsWithArtists);

      // Calculate initial under-ranked count
      const allRankings = rankingsData?.length ? rankingsData : 
        newShows.map(show => ({
          id: '',
          show_id: show.id,
          elo_score: 1200,
          comparisons_count: 0
        }));
      
      const underRanked = showsWithArtists.filter(show => {
        const ranking = allRankings?.find(r => r.show_id === show.id);
        return !ranking || ranking.comparisons_count < COMPARISON_THRESHOLD;
      });
      
      setInitialUnderRankedCount(underRanked.length);
      
      // Calculate how many are already complete
      const alreadyComplete = showsWithArtists.length - underRanked.length;
      setCompletedCount(showsWithArtists.length > 0 ? showsWithArtists.length - underRanked.length : 0);

      // Select first pair
      selectFocusedPair(showsWithArtists, allRankings || [], comparedSet, false);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching data:", error);
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

  const selectFocusedPair = (
    allShows: Show[], 
    allRankings: ShowRanking[], 
    pairsSet: Set<string>,
    shouldCelebrate: boolean = false
  ) => {
    const rankingMap = new Map(allRankings.map(r => [r.show_id, r]));
    
    // Get shows below threshold
    const needsRanking = allShows.filter(show => {
      const ranking = rankingMap.get(show.id);
      return !ranking || ranking.comparisons_count < COMPARISON_THRESHOLD;
    }).sort((a, b) => {
      // Sort by comparison count (lowest first)
      const aCount = rankingMap.get(a.id)?.comparisons_count || 0;
      const bCount = rankingMap.get(b.id)?.comparisons_count || 0;
      return aCount - bCount;
    });

    // Update completed count
    const completed = allShows.length - needsRanking.length;
    setCompletedCount(completed);

    if (needsRanking.length === 0) {
      // All done!
      setShowPair(null);
      if (shouldCelebrate) {
        triggerConfetti();
        toast.success("Rankings locked in!");
        setTimeout(() => {
          onComplete();
        }, 1500);
      }
      return;
    }

    // Find established shows (>=3 comparisons)
    const established = allShows.filter(show => {
      const ranking = rankingMap.get(show.id);
      return ranking && ranking.comparisons_count >= COMPARISON_THRESHOLD;
    });

    // Primary show is the one with fewest comparisons
    const primaryShow = needsRanking[0];
    
    // Build pair candidates
    const pairCandidates: { show: Show; score: number }[] = [];
    
    // Prefer pairing with established shows
    for (const show of established) {
      const [id1, id2] = [primaryShow.id, show.id].sort();
      if (pairsSet.has(`${id1}-${id2}`)) continue;
      
      const eloDiff = Math.abs(
        (rankingMap.get(primaryShow.id)?.elo_score || 1200) - 
        (rankingMap.get(show.id)?.elo_score || 1200)
      );
      const proximityScore = Math.max(0, 400 - eloDiff) / 400;
      pairCandidates.push({ show, score: proximityScore + 1 }); // Bonus for established
    }
    
    // Fallback: pair with other under-ranked shows
    if (pairCandidates.length === 0) {
      for (const show of needsRanking.slice(1)) {
        const [id1, id2] = [primaryShow.id, show.id].sort();
        if (pairsSet.has(`${id1}-${id2}`)) continue;
        
        const eloDiff = Math.abs(
          (rankingMap.get(primaryShow.id)?.elo_score || 1200) - 
          (rankingMap.get(show.id)?.elo_score || 1200)
        );
        const proximityScore = Math.max(0, 400 - eloDiff) / 400;
        pairCandidates.push({ show, score: proximityScore });
      }
    }

    if (pairCandidates.length === 0) {
      // No valid pairs - session complete
      setShowPair(null);
      if (shouldCelebrate) {
        triggerConfetti();
        toast.success("Rankings locked in!");
        setTimeout(() => {
          onComplete();
        }, 1500);
      }
      return;
    }

    // Sort by score and pick from top candidates
    pairCandidates.sort((a, b) => b.score - a.score);
    const topCandidates = pairCandidates.slice(0, Math.min(3, pairCandidates.length));
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    
    setShowPair([primaryShow, topCandidates[randomIndex].show]);
    setPairKey(prev => prev + 1);
  };

  const handleChoice = async (winnerId: string | null) => {
    if (!showPair || comparing) return;
    
    // Haptic feedback
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }
    
    if (winnerId) {
      setSelectedWinner(winnerId);
    }
    
    setComparing(true);
    await new Promise(resolve => setTimeout(resolve, 400));
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [show1Id, show2Id] = [showPair[0].id, showPair[1].id].sort();

      await supabase
        .from("show_comparisons")
        .insert({
          user_id: user.id,
          show1_id: show1Id,
          show2_id: show2Id,
          winner_id: winnerId,
        });

      let updatedRankings = [...rankings];

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

          await supabase
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

          updatedRankings = rankings.map(r => {
            if (r.show_id === winnerRanking.show_id) {
              return { ...r, elo_score: newWinnerElo, comparisons_count: r.comparisons_count + 1 };
            }
            if (r.show_id === loserRanking.show_id) {
              return { ...r, elo_score: newLoserElo, comparisons_count: r.comparisons_count + 1 };
            }
            return r;
          });
        }
      } else {
        const show1Ranking = rankings.find(r => r.show_id === showPair[0].id);
        const show2Ranking = rankings.find(r => r.show_id === showPair[1].id);

        if (show1Ranking && show2Ranking) {
          await supabase
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

          updatedRankings = rankings.map(r => {
            if (r.show_id === showPair[0].id || r.show_id === showPair[1].id) {
              return { ...r, comparisons_count: r.comparisons_count + 1 };
            }
            return r;
          });
        }
      }

      setRankings(updatedRankings);

      const newPairKey = `${show1Id}-${show2Id}`;
      const newComparedPairs = new Set([...comparedPairs, newPairKey]);
      setComparedPairs(newComparedPairs);

      setSelectedWinner(null);
      selectFocusedPair(shows, updatedRankings, newComparedPairs, true);
      setComparing(false);
    } catch (error) {
      console.error("Error saving comparison:", error);
      toast.error("Failed to save comparison");
      setComparing(false);
      setSelectedWinner(null);
    }
  };

  const renderContent = () => {
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
            You need at least 2 shows to start ranking.
          </p>
        </div>
      );
    }

    if (!showPair) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <SceneLogo size="md" />
          <div className="text-center space-y-2">
            <p className="text-foreground font-semibold">All done!</p>
            <p className="text-muted-foreground text-sm">
              Your rankings are locked in
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6 animate-fade-in">
        {/* Header */}
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
          mode="focused"
          completedCount={completedCount}
          targetCount={shows.length}
        />

        {/* VS Battle Cards */}
        <div className="relative flex gap-3 items-start pt-4">
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

        {/* Instructions & Actions */}
        <div className="text-center space-y-4">
          <p className="text-sm text-muted-foreground">
            Tap the show that was better
          </p>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleChoice(null)}
            disabled={comparing}
            className="text-muted-foreground hover:text-foreground"
          >
            Can't compare these
          </Button>

          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex items-center justify-center gap-1 mx-auto text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <span>{showDetails ? 'Hide' : 'See full'} details</span>
            <ChevronDown className={cn(
              "h-3 w-3 transition-transform duration-200",
              showDetails && "rotate-180"
            )} />
          </button>
        </div>
      </div>
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[95vh] rounded-t-3xl px-4 pb-8">
        <SheetHeader className="pb-2">
          <div className="flex items-center justify-between">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="text-muted-foreground"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SheetTitle className="text-sm font-medium text-muted-foreground">
              Complete Rankings
            </SheetTitle>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </SheetHeader>
        
        <div className="overflow-y-auto h-full pb-16">
          {renderContent()}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default FocusedRankingSession;
