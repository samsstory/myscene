import { useState, useEffect, useCallback } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import RankingCard from "./rankings/RankingCard";
import RankingProgressBar from "./rankings/RankingProgressBar";
import SceneLogo from "./ui/SceneLogo";
import BrandedLoader from "./ui/BrandedLoader";
import ConfirmationRing from "./ui/ConfirmationRing";
import { useDemoData } from "@/hooks/useDemoData";
import { 
  selectSmartPair as selectSmartPairUtil, 
  type Show,
  type ShowRanking,
  type Comparison 
} from "@/lib/smart-pairing";

/**
 * Demo version of the Rank component.
 * Uses local state for comparisons - nothing persists to the database.
 * Allows users to try the ranking experience without signing up.
 */
export default function DemoRank() {
  const { shows: demoShows, rankings: demoRankings, isLoading } = useDemoData();
  
  const [shows, setShows] = useState<Show[]>([]);
  const [rankings, setRankings] = useState<ShowRanking[]>([]);
  const [comparisons, setComparisons] = useState<Comparison[]>([]);
  const [showPair, setShowPair] = useState<[Show, Show] | null>(null);
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

  // Initialize local state from demo data
  useEffect(() => {
    if (!isLoading && demoShows.length >= 2) {
      // Transform demo shows to match Show type
      const formattedShows: Show[] = demoShows.map(show => ({
        id: show.id,
        venue_name: show.venue.name,
        venue_location: show.venue.location,
        show_date: show.date,
        rating: show.rating,
        photo_url: show.photo_url,
        notes: show.notes,
        artist_performance: null,
        sound: null,
        lighting: null,
        crowd: null,
        venue_vibe: null,
        tags: [],
        artists: show.artists.map(a => ({
          artist_name: a.name,
          is_headliner: a.isHeadliner,
        })),
      }));

      // Transform rankings
      const formattedRankings: ShowRanking[] = demoRankings.map(r => ({
        id: r.show_id,
        show_id: r.show_id,
        elo_score: r.elo_score,
        comparisons_count: r.comparisons_count,
      }));

      setShows(formattedShows);
      setRankings(formattedRankings);
      
      // Start with empty comparisons for fresh demo experience
      const nextPair = selectSmartPairUtil({
        shows: formattedShows,
        rankings: formattedRankings,
        comparisons: [],
        comparedPairs: new Set(),
      });
      
      if (nextPair) {
        setShowPair(nextPair);
        setPairKey(1);
      }
    }
  }, [isLoading, demoShows, demoRankings]);

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
      toast.success("That's all for now! Sign up to save your rankings");
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
    
    if (winnerId) {
      setSelectedWinner(winnerId);
    }
    
    setComparing(true);
    
    // Wait for animation
    await new Promise(resolve => setTimeout(resolve, 400));
    
    // LOCAL STATE ONLY - no database writes
    const [show1Id, show2Id] = [showPair[0].id, showPair[1].id].sort();

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
      // "Can't compare" - increment both counts
      const updatedRankings = rankings.map(r => {
        if (r.show_id === showPair[0].id || r.show_id === showPair[1].id) {
          return { ...r, comparisons_count: r.comparisons_count + 1 };
        }
        return r;
      });
      setRankings(updatedRankings);
    }

    const newPairKey = `${show1Id}-${show2Id}`;
    const newComparedPairs = new Set([...comparedPairs, newPairKey]);
    setComparedPairs(newComparedPairs);
    setTotalComparisons(prev => prev + 1);
    
    const newComparison: Comparison = {
      show1_id: show1Id,
      show2_id: show2Id,
      winner_id: winnerId,
    };
    const newComparisons = [...comparisons, newComparison];
    setComparisons(newComparisons);

    setSelectedWinner(null);
    getNextPair(shows, rankings, newComparisons, newComparedPairs, true);
    setComparing(false);
  };

  if (isLoading) {
    return <BrandedLoader />;
  }

  if (!shows || shows.length < 2) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4 px-4">
        <SceneLogo size="md" />
        <p className="text-muted-foreground text-center">
          Loading demo shows...
        </p>
      </div>
    );
  }

  if (!showPair) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
        <SceneLogo size="md" />
        <div className="text-center space-y-2">
          <p className="text-foreground font-semibold">Nice work!</p>
          <p className="text-muted-foreground text-sm">
            Sign up to save your rankings
          </p>
        </div>
      </div>
    );
  }

  const calculateGlobalConfirmation = () => {
    if (shows.length === 0) return 0;
    const MAX_BACK_TO_BACKS = 10;
    const totalCapped = rankings.reduce((sum, r) => sum + Math.min(r.comparisons_count, MAX_BACK_TO_BACKS), 0);
    return (totalCapped / (shows.length * MAX_BACK_TO_BACKS)) * 100;
  };

  const globalConfirmation = calculateGlobalConfirmation();

  return (
    <div className="max-w-md mx-auto px-4 py-6 space-y-8 animate-fade-in">
      {/* Demo Mode Badge */}
      <div className="flex justify-center">
        <div className="px-3 py-1 rounded-full bg-primary/20 border border-primary/30 text-xs text-primary font-medium">
          Demo Mode · Rankings won't save
        </div>
      </div>

      {/* Header */}
      <div className="text-center space-y-3">
        <h1 
          className="text-lg font-black tracking-[0.15em] uppercase"
          style={{
            textShadow: '0 0 8px rgba(255,255,255,0.4), 0 0 20px rgba(255,255,255,0.15)'
          }}
        >
          Show Ranker
        </h1>
        
        <div className="flex justify-center">
          <ConfirmationRing 
            percentage={globalConfirmation} 
            size="md" 
            showLabel={true}
            labelPosition="right"
          />
        </div>
      </div>

      {/* Progress Bar */}
      <RankingProgressBar 
        comparisons={totalComparisons} 
        totalShows={shows.length} 
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
          className="absolute left-1/2 -translate-x-1/2 z-20"
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

      {/* Instructions */}
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
        
        <p className="text-sm text-muted-foreground">
          Tap to choose the winner
        </p>
        
        <button
          onClick={() => handleChoice(null)}
          disabled={comparing}
          className="text-xs text-muted-foreground/60 hover:text-muted-foreground transition-colors underline-offset-4 hover:underline"
        >
          {comparing ? "Got it" : "Can't compare these"}
        </button>
      </div>
    </div>
  );
}
