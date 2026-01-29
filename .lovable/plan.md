
# Focused Ranking Session for Under-Ranked Shows

## Overview

Create a focused ranking session that activates when shows have fewer than 3 comparisons. When triggered from the Home page insight, this opens a specialized ranking mode that prioritizes under-ranked shows until they all reach the comparison threshold.

## What You'll Get

- Updated insight notification: "X Shows to Rank" triggers when any show has <3 comparisons
- Tapping the notification opens a focused ranking session (not the general Rank tab)
- The session only presents pairs involving under-ranked shows
- Progress bar tracks shows reaching the 3-comparison threshold
- Session automatically ends with celebration when all shows are sufficiently ranked
- Seamless return to Home when complete

## Technical Design

### Progress Bar Calculation

The current progress bar uses total comparisons, which doesn't clearly show session completion. For the focused session:

```
Progress = (shows with >=3 comparisons) / (total shows in focus pool) * 100
```

This gives users a clear goal: "Get all shows to 3 comparisons."

### Smart Pairing Strategy for Focused Session

The pairing algorithm will:
1. Filter pool to shows with `comparisons_count < 3`
2. For each under-ranked show, pair with an established show (>=3 comparisons) when possible
3. Fallback: pair two under-ranked shows together
4. Prioritize by uncertainty (fewer comparisons = higher priority)

This ensures new shows quickly get anchored against stable rankings.

### Session Flow

```text
Home Page
    |
    v
[DynamicInsight Card]
"5 Shows to Rank"
"Compare a few shows to lock in your rankings"
    |
    v (tap)
[FocusedRankingSession Sheet - Full Screen]
+-----------------------------------+
| <- Complete Rankings              |
|                                   |
| SHOW RANKER                       |
|                                   |
| [====----] 3 of 5 complete        |
|                                   |
| +-------------+ +-------------+   |
| |   Show A    | |   Show B    |   |
| |  (1 comp)   | |  (7 comp)   |   |
| +-------------+ +-------------+   |
|                                   |
|     Tap to choose winner          |
|     Can't compare these           |
|                                   |
| [See current rankings]            |
+-----------------------------------+
    |
    v (all shows reach 3 comparisons)
[Confetti + Auto-close]
"Rankings locked in!"
```

## Implementation Details

### 1. Update Insight Logic

**File: `src/hooks/useHomeStats.ts`**
- Change unranked definition from `comparisons_count === 0` to `comparisons_count < 3`
- Update insight message to reflect the focused session
- Priority remains: after milestones and incomplete ratings

**Changes:**
```typescript
// Current: counts shows with 0 comparisons
const unrankedCount = totalShows - rankedShowIds.size;

// New: counts shows with <3 comparisons
const underRankedShows = rankings?.filter(r => r.comparisons_count < 3) || [];
const underRankedCount = underRankedShows.length;
```

**Insight copy updates:**
- Title: "X Shows to Rank" (unchanged)
- Message: "Compare a few shows to lock in your rankings"

### 2. Create Focused Ranking Session Component

**New File: `src/components/home/FocusedRankingSession.tsx`**

A full-screen sheet that wraps focused ranking logic:

**Props:**
```typescript
interface FocusedRankingSessionProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete: () => void;
}
```

**Key Features:**
- Fetches shows and rankings on mount
- Filters to under-ranked shows (<3 comparisons)
- Custom progress bar showing `completedCount / totalUnderRanked`
- Reuses existing `RankingCard` component for the comparison UI
- Modified pair selection to prioritize under-ranked shows
- Auto-closes with confetti when all shows reach threshold

**Internal State:**
```typescript
const [underRankedShows, setUnderRankedShows] = useState<Show[]>([]);
const [allShows, setAllShows] = useState<Show[]>([]);
const [rankings, setRankings] = useState<ShowRanking[]>([]);
const [showPair, setShowPair] = useState<[Show, Show] | null>(null);
const [completedCount, setCompletedCount] = useState(0);
const THRESHOLD = 3;
```

**Pair Selection Logic:**
```typescript
const selectFocusedPair = () => {
  // Get shows below threshold
  const needsRanking = allShows.filter(show => {
    const ranking = rankings.find(r => r.show_id === show.id);
    return !ranking || ranking.comparisons_count < THRESHOLD;
  });
  
  if (needsRanking.length === 0) {
    // All done!
    triggerConfetti();
    onComplete();
    return;
  }
  
  // Find established shows (>=3 comparisons)
  const established = allShows.filter(show => {
    const ranking = rankings.find(r => r.show_id === show.id);
    return ranking && ranking.comparisons_count >= THRESHOLD;
  });
  
  // Pair under-ranked with established when possible
  const primaryShow = needsRanking[0]; // Lowest comparison count
  const pairedShow = established.length > 0 
    ? pickBestEstablishedPair(primaryShow, established)
    : needsRanking[1];
  
  setShowPair([primaryShow, pairedShow]);
};
```

### 3. Wire Up Home Component

**File: `src/components/Home.tsx`**

**Add imports and state:**
```typescript
import FocusedRankingSession from "./home/FocusedRankingSession";

const [focusedRankingOpen, setFocusedRankingOpen] = useState(false);
```

**Update insight action handler:**
```typescript
const handleInsightAction = (action: InsightAction) => {
  if (action === 'rank-tab') {
    // OLD: onNavigateToRank?.();
    // NEW: Open focused session
    setFocusedRankingOpen(true);
  } else if (action === 'incomplete-ratings') {
    setIncompleteRatingsOpen(true);
  }
};
```

**Add component to JSX:**
```typescript
<FocusedRankingSession
  open={focusedRankingOpen}
  onOpenChange={setFocusedRankingOpen}
  onComplete={() => {
    setFocusedRankingOpen(false);
    refetchStats();
    toast.success("Rankings locked in!");
  }}
/>
```

### 4. Update Progress Bar Component

**File: `src/components/rankings/RankingProgressBar.tsx`**

Add support for focused mode with explicit counts:

```typescript
interface RankingProgressBarProps {
  comparisons?: number;
  totalShows?: number;
  // New props for focused mode
  mode?: 'general' | 'focused';
  completedCount?: number;
  targetCount?: number;
}

const RankingProgressBar = ({ 
  comparisons, 
  totalShows,
  mode = 'general',
  completedCount,
  targetCount
}: RankingProgressBarProps) => {
  let progress: number;
  
  if (mode === 'focused' && completedCount !== undefined && targetCount) {
    progress = (completedCount / targetCount) * 100;
  } else {
    const targetComparisons = Math.max(15, (totalShows || 0) * 2.5);
    progress = Math.min(100, ((comparisons || 0) / targetComparisons) * 100);
  }
  
  return (
    <div className="w-full px-6">
      {mode === 'focused' && (
        <p className="text-xs text-muted-foreground text-center mb-2">
          {completedCount} of {targetCount} shows ranked
        </p>
      )}
      <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};
```

## File Changes Summary

| File | Action |
|------|--------|
| `src/hooks/useHomeStats.ts` | Modify - update unranked threshold to <3 comparisons |
| `src/components/home/FocusedRankingSession.tsx` | Create - new focused ranking session sheet |
| `src/components/Home.tsx` | Modify - add state and handler for focused session |
| `src/components/rankings/RankingProgressBar.tsx` | Modify - add focused mode with count display |

## Edge Cases Handled

1. **Only 1 under-ranked show**: Pairs with established shows for quick ranking
2. **All shows under-ranked**: Pairs shows together, session takes longer but still works
3. **User closes mid-session**: Progress saved, can resume later via notification
4. **No shows at all**: Insight doesn't appear (existing behavior)
5. **Session complete during comparison**: Waits for current comparison to finish, then celebrates

## UX Polish

- Haptic feedback on selection (existing)
- Slide-in card animations (reuse from Rank.tsx)
- Confetti burst at 100% progress
- Success toast: "Rankings locked in!"
- Back button returns to Home without losing progress
