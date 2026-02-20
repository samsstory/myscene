import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import RankingCard from "./rankings/RankingCard";
import RankingProgressBar from "./rankings/RankingProgressBar";
import SceneLogo from "./ui/SceneLogo";
import BrandedLoader from "./ui/BrandedLoader";
import ConfirmationRing from "./ui/ConfirmationRing";
import { 
  selectSmartPair as selectSmartPairUtil, 
  areRankingsComplete,
  type Show,
  type ShowRanking,
  type Comparison 
} from "@/lib/smart-pairing";

interface RankProps {
  onAddShow?: () => void;
  onViewAllShows?: () => void;
}

export default function Rank({ onAddShow, onViewAllShows }: RankProps) {
  const [allShows, setAllShows] = useState<Show[]>([]);
  const [rankings, setRankings] = useState<ShowRanking[]>([]);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [showPair, setShowPair] = useState<[Show, Show] | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [comparedPairs, setComparedPairs] = useState<Set<string>>(new Set());
  const [totalComparisons, setTotalComparisons] = useState(0);
  
  // Pool filtering
  const [activePool, setActivePool] = useState<'set' | 'show' | 'festival'>('set');
  
  // Debug: preview empty states
  const [debugState, setDebugState] = useState<'none' | 'no-shows' | 'one-show' | 'all-ranked'>('none');
  
  // Animation states
  const [pairKey, setPairKey] = useState(0);
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Derived: shows filtered to the active pool
  const shows = allShows.filter(s => s.show_type === activePool);

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

  // Re-select pair when pool changes
  useEffect(() => {
    if (loading || shows.length < 2) return;
    const poolRankings = rankings.filter(r => shows.some(s => s.id === r.show_id));
    const nextPair = selectSmartPairUtil({
      shows,
      rankings: poolRankings,
      comparisons,
      comparedPairs,
    });
    setShowPair(nextPair);
    setPairKey(prev => prev + 1);
  }, [activePool, allShows.length]); // only re-run on pool switch or data load

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
        .select("show1_id, show2_id, winner_id")
        .eq("user_id", user.id);

      if (comparisonsError) throw comparisonsError;

      const comparedSet = new Set<string>();
      const formattedComparisons: Comparison[] = [];
      comparisonsData?.forEach((comp) => {
        const [id1, id2] = [comp.show1_id, comp.show2_id].sort();
        comparedSet.add(`${id1}-${id2}`);
        formattedComparisons.push({
          show1_id: comp.show1_id,
          show2_id: comp.show2_id,
          winner_id: comp.winner_id,
        });
      });
      setComparedPairs(comparedSet);
      setComparisons(formattedComparisons);
      setTotalComparisons(comparisonsData?.length || 0);

      if (!showsData || showsData.length < 2) {
        setLoading(false);
        return;
      }

      const showsWithArtists = await Promise.all(
        showsData.map(async (show) => {
          const { data: artistsData } = await supabase
            .from("show_artists")
            .select("artist_name, is_headliner, artist_image_url")
            .eq("show_id", show.id)
            .order("is_headliner", { ascending: false });

          return {
            ...show,
            artists: artistsData || [],
          };
        })
      );

      setAllShows(showsWithArtists);
      
      // Auto-select the pool with the most shows
      const poolCounts = { set: 0, show: 0, festival: 0 } as Record<string, number>;
      showsWithArtists.forEach(s => {
        const t = s.show_type || 'set';
        if (t in poolCounts) poolCounts[t]++;
      });
      const bestPool = ([...(['set', 'show', 'festival'] as const)]).sort((a, b) => poolCounts[b] - poolCounts[a])[0];
      setActivePool(bestPool);
      
      const updatedRankingsData = rankingsData?.length ? rankingsData : 
        newShows.map(show => ({
          id: '',
          show_id: show.id,
          elo_score: 1200,
          comparisons_count: 0
        }));
      
      // Use smart pairing utility — filter to the best pool
      const poolShows = showsWithArtists.filter(s => (s.show_type || 'set') === bestPool);
      const nextPair = selectSmartPairUtil({
        shows: poolShows,
        rankings: updatedRankingsData || [],
        comparisons: formattedComparisons,
        comparedPairs: comparedSet,
      });
      
      if (!nextPair) {
        setShowPair(null);
      } else {
        setShowPair(nextPair);
        setPairKey(prev => prev + 1);
      }
      
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

  // Use smart pairing to select next pair
  const getNextPair = useCallback((
    allShows: Show[],
    allRankings: ShowRanking[],
    allComparisons: Comparison[],
    pairsSet: Set<string>,
    shouldCelebrate: boolean = false
  ) => {
    const nextPair = selectSmartPairUtil({
      shows: allShows,
      rankings: allRankings,
      comparisons: allComparisons,
      comparedPairs: pairsSet,
    });
    
    if (!nextPair) {
      setShowPair(null);
      if (shouldCelebrate) {
        triggerConfetti();
      }
      toast.success("That's all for now! Your rankings are up to date");
    } else {
      setShowPair(nextPair);
      setPairKey(prev => prev + 1);
    }
  }, [triggerConfetti]);

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
      
      // Add new comparison to the list
      const newComparison: Comparison = {
        show1_id: show1Id,
        show2_id: show2Id,
        winner_id: winnerId,
      };
      const newComparisons = [...comparisons, newComparison];
      setComparisons(newComparisons);

      // Reset animation states and select next pair
      setSelectedWinner(null);
      getNextPair(shows, rankings, newComparisons, newComparedPairs, true);
      setComparing(false);
    } catch (error) {
      console.error("Error saving comparison:", error);
      toast.error("Failed to save comparison");
      setComparing(false);
      setSelectedWinner(null);
    }
  };

  if (loading) {
    return <BrandedLoader />;
  }

  // Debug override for testing empty states
  const effectiveShowCount = debugState === 'no-shows' ? 0 : debugState === 'one-show' ? 1 : shows.length;
  const effectivePair = debugState === 'all-ranked' ? null : showPair;

  // Debug toggle bar — only visible in preview/dev, hidden on published site
  const isDevMode = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname.includes('-preview--') ||
    window.location.hostname.includes('preview.lovable.app')
  );

  const debugBar = isDevMode ? (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1 px-2 py-1 rounded-full bg-black/80 backdrop-blur-sm border border-white/10 text-[10px]">
      <span className="text-white/40 mr-1">Debug:</span>
      {(['none', 'no-shows', 'one-show', 'all-ranked'] as const).map(state => (
        <button
          key={state}
          onClick={() => setDebugState(state)}
          className={cn(
            "px-2 py-0.5 rounded-full transition-all",
            debugState === state ? "bg-primary text-primary-foreground" : "text-white/50 hover:text-white/80"
          )}
        >
          {state === 'none' ? 'Normal' : state === 'no-shows' ? '0 shows' : state === 'one-show' ? '1 show' : 'All ranked'}
        </button>
      ))}
    </div>
  ) : null;

  if (!shows || effectiveShowCount < 2) {
    return (
      <>
        {debugBar}
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-5 px-6">
          <SceneLogo size="md" />
          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
              {effectiveShowCount === 0 ? "No shows yet" : "One more to go!"}
            </h2>
            <p className="text-sm text-muted-foreground max-w-[260px] mx-auto">
              {effectiveShowCount === 0 
                ? "Log your first shows to start ranking them head-to-head."
                : "Add one more show to start ranking them head-to-head."}
            </p>
          </div>
          <button
            onClick={() => onAddShow?.()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] hover:border-primary/50 hover:shadow-[0_0_16px_hsl(var(--primary)/0.15)]"
          >
            + Add a show
          </button>
        </div>
      </>
    );
  }

  // "All ranked" is now rendered inline below instead of early-returning

  // Calculate pool-scoped confirmation percentage
  const calculateGlobalConfirmation = () => {
    if (shows.length === 0) return 0;
    const MAX_BACK_TO_BACKS = 10;
    const poolShowIds = new Set(shows.map(s => s.id));
    const poolRankings = rankings.filter(r => poolShowIds.has(r.show_id));
    const totalCapped = poolRankings.reduce((sum, r) => sum + Math.min(r.comparisons_count, MAX_BACK_TO_BACKS), 0);
    return (totalCapped / (shows.length * MAX_BACK_TO_BACKS)) * 100;
  };

  const globalConfirmation = calculateGlobalConfirmation();

  return (
    <>
    {debugBar}
    <div className="max-w-md mx-auto px-4 py-6 space-y-8 animate-fade-in">
      {/* Page Header */}
      <div className="text-center space-y-3">
        <h3
          className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground/60"
          style={{ textShadow: "0 0 12px hsl(var(--primary) / 0.3)" }}
        >
          Head To Head
        </h3>

        {/* Pool Tabs */}
        <div className="flex items-center justify-center gap-1">
          {(['set', 'show', 'festival'] as const).map(pool => {
            const count = allShows.filter(s => (s.show_type || 'set') === pool).length;
            if (count === 0) return null;
            return (
              <button
                key={pool}
                onClick={() => setActivePool(pool)}
                className={cn(
                  "px-3 py-1.5 rounded-full text-[11px] font-medium transition-all duration-200",
                  activePool === pool
                    ? "bg-white/[0.12] text-foreground border border-white/[0.16]"
                    : "text-muted-foreground/50 hover:text-muted-foreground/80"
                )}
              >
                {pool === 'set' ? 'Sets' : pool === 'show' ? 'Shows' : 'Festivals'}
                <span className="ml-1 text-[10px] opacity-60">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Confirmation Ring */}
      <div className="flex justify-center">
        <ConfirmationRing 
          percentage={globalConfirmation} 
          size="md" 
          showLabel={true}
          labelPosition="right"
        />
      </div>

      {!effectivePair ? (
        /* All Ranked State - inline */
        <div className="flex flex-col items-center justify-center space-y-5 py-8">
          <SceneLogo size="md" />
          <div className="text-center space-y-2">
            <h2 className="text-lg font-bold" style={{ textShadow: '0 0 10px rgba(255,255,255,0.3)' }}>
              All ranked!
            </h2>
            <p className="text-sm text-muted-foreground max-w-[280px] mx-auto">
              You've compared all your shows. Add more to keep ranking head-to-head.
            </p>
          </div>
          <button
            onClick={() => onAddShow?.()}
            className="px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] hover:border-primary/50 hover:shadow-[0_0_16px_hsl(var(--primary)/0.15)]"
          >
            + Add more shows
          </button>
        </div>
      ) : (
        <>
          {/* VS Battle Cards */}
          <div className="relative flex gap-3 items-start pt-4">
            <RankingCard
              show={effectivePair[0]}
              onClick={() => handleChoice(effectivePair[0].id)}
              disabled={comparing}
              position="left"
              isWinner={selectedWinner === effectivePair[0].id}
              isLoser={selectedWinner !== null && selectedWinner !== effectivePair[0].id}
              animationKey={pairKey}
              isExpanded={showDetails}
            />

            <div className="absolute left-1/2 -translate-x-1/2 z-20 top-1/2 -translate-y-1/2 pointer-events-none">
              <div className="w-7 h-7 rounded-full bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] flex items-center justify-center">
                <span className="text-[10px] font-medium text-white/50">VS</span>
              </div>
            </div>

            <RankingCard
              show={effectivePair[1]}
              onClick={() => handleChoice(effectivePair[1].id)}
              disabled={comparing}
              position="right"
              isWinner={selectedWinner === effectivePair[1].id}
              isLoser={selectedWinner !== null && selectedWinner !== effectivePair[1].id}
              animationKey={pairKey}
              isExpanded={showDetails}
            />
          </div>

          {/* Instruction Text */}
          <div className="text-center space-y-3">
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
          </div>

          <div className="flex-1 flex items-start justify-center pt-4">
            <button
              onClick={() => onViewAllShows?.()}
              className="px-4 py-2 rounded-full text-xs font-medium text-foreground/90 backdrop-blur-xl transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]"
              style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0.05) 100%)',
                boxShadow: '0 4px 24px -4px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.1)',
              }}
            >
              See current rankings
            </button>
          </div>
        </>
      )}
    </div>
    </>
  );
}
