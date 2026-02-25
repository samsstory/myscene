import { motion } from "framer-motion";
import { CalendarPlus, ChevronRight, Trophy } from "lucide-react";
import RankingCard from "@/components/rankings/RankingCard";
import { useVSHeroPair } from "@/hooks/useVSHeroPair";
import { Skeleton } from "@/components/ui/skeleton";

interface VSHeroWidgetProps {
  onNavigateToRank?: () => void;
  onAddShow?: () => void;
}

export default function VSHeroWidget({
  onNavigateToRank,
  onAddShow,
}: VSHeroWidgetProps) {
  const {
    pair,
    pairKey,
    isLoading,
    comparing,
    selectedWinner,
    showCount,
    handleChoice,
    allRankedUp,
  } = useVSHeroPair();

  // Loading skeleton
  if (isLoading) {
    return (
      <section className="space-y-3">
        <div className="space-y-1">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-52" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="flex-1 aspect-[3/4] rounded-2xl" />
          <Skeleton className="flex-1 aspect-[3/4] rounded-2xl" />
        </div>
      </section>
    );
  }

  // Empty state: fewer than 2 shows
  if (showCount < 2) {
    return (
      <section className="rounded-2xl border border-primary/20 bg-primary/[0.04] p-5 space-y-3">
        <div className="space-y-1">
          <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
            <Trophy className="h-4 w-4 text-primary" />
            Start Ranking
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Log 2 shows to start comparing your concerts head-to-head.
          </p>
        </div>
        <button
          onClick={onAddShow}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-primary/15 border border-primary/30 text-primary text-sm font-medium hover:bg-primary/25 transition-colors"
        >
          <CalendarPlus className="h-4 w-4" />
          Add a show
        </button>
      </section>
    );
  }

  // All ranked up — compact nudge
  if (allRankedUp) {
    return (
      <section className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4">
        <button
          onClick={onNavigateToRank}
          className="w-full flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-green-500/15 border border-green-500/30 flex items-center justify-center">
              <Trophy className="h-4 w-4 text-green-400" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground">
                You're all caught up
              </p>
              <p className="text-xs text-muted-foreground">
                View your rankings →
              </p>
            </div>
          </div>
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        </button>
      </section>
    );
  }

  // Main VS widget with pair
  if (!pair) return null;

  return (
    <section className="space-y-3">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-foreground">Which was better?</h2>
        <p className="text-sm text-muted-foreground">
          Tap to settle the score
        </p>
      </div>

      {/* Cards + VS badge */}
      <div className="relative flex gap-3 items-start">
        <RankingCard
          show={pair[0]}
          onClick={() => handleChoice(pair[0].id)}
          disabled={comparing}
          position="left"
          isWinner={selectedWinner === pair[0].id}
          isLoser={!!selectedWinner && selectedWinner !== pair[0].id}
          animationKey={pairKey}
        />

        {/* VS Badge — glowing, centered on photo area
            Photo is aspect-[4/3] on each card. We use a helper div
            that mirrors the photo aspect ratio to position the badge. */}
        <div className="absolute left-1/2 top-0 -translate-x-1/2 z-10 pointer-events-none"
          style={{ width: "calc((100% - 12px) / 2)", aspectRatio: "4/3" }}
        >
          <motion.div
            key={pairKey}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{
              type: "spring",
              stiffness: 400,
              damping: 15,
              delay: 0.1,
            }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2
              w-6 h-6 rounded-full flex items-center justify-center
              bg-gradient-to-br from-[#00D9FF] to-[#7B61FF]
              -rotate-[5deg] pointer-events-auto"
            style={{
              boxShadow: "0 0 12px rgba(0,217,255,0.4)",
            }}
          >
            <span className="text-white font-bold text-[10px]">VS</span>
          </motion.div>
        </div>

        <RankingCard
          show={pair[1]}
          onClick={() => handleChoice(pair[1].id)}
          disabled={comparing}
          position="right"
          isWinner={selectedWinner === pair[1].id}
          isLoser={!!selectedWinner && selectedWinner !== pair[1].id}
          animationKey={pairKey}
        />
      </div>

      {/* Link to full rankings */}
      <button
        onClick={onNavigateToRank}
        className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
      >
        See all matchups →
      </button>
    </section>
  );
}
