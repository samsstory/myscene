

# Dynamic Insight Priority & Tappable CTA

## Overview

Refine the Dynamic Insight card to prioritize actionable CTAs (ranking reminder) over celebratory stats (streak), make the insight card tappable for direct navigation, lower the streak threshold, and remove the redundant "To Rank" stat pill.

---

## Current vs. Proposed Behavior

```text
CURRENT PRIORITY ORDER              PROPOSED PRIORITY ORDER
1. Welcome (no shows)               1. Welcome (no shows)
2. Milestone (25/50/100/200)        2. Milestone (25/50/100/200)
3. Streak (≥3 months)      ←        3. Ranking Reminder (≥3 unranked) ← SWAPPED
4. Ranking Reminder (≥3)   ←        4. Streak (≥2 months)             ← SWAPPED + LOWERED

INSIGHT CARD BEHAVIOR               INSIGHT CARD BEHAVIOR
- Static display only               - Tappable when actionable
- No navigation                     - "Rank reminder" → Rank tab
```

---

## Visual Before/After

```text
BEFORE (Stat Pills Row):
[47 Shows] [#1 Show] [3 To Rank] [2026] [3mo Streak]
                        ↑
                   Redundant pill

AFTER (Stat Pills Row):
[47 Shows] [#1 Show] [2026] [3mo Streak]
                       ↑
                  Cleaner, CTA moved to Insight card

INSIGHT CARD (Tappable):
+------------------------------------------+
|  🎯  3 Shows to Rank                     |
|  Tap to compare your recent shows.   >   |
+------------------------------------------+
         ↑                              ↑
    Action-focused               Chevron indicates tap
```

---

## Changes Summary

| Component | Change |
|-----------|--------|
| `useHomeStats.ts` | Swap priority: ranking reminder before streak |
| `useHomeStats.ts` | Lower streak threshold from ≥3 to ≥2 months |
| `useHomeStats.ts` | Remove "To Rank" pill from statPills array |
| `useHomeStats.ts` | Return `insight` with `actionable` flag |
| `DynamicInsight.tsx` | Accept `onAction` prop for tap handling |
| `DynamicInsight.tsx` | Add chevron indicator for actionable insights |
| `DynamicInsight.tsx` | Wrap in button for tappable insights |
| `Home.tsx` | Pass `onInsightAction` handler to DynamicInsight |

---

## Technical Details

### 1. Update useHomeStats.ts - Insight Priority

**Current Logic (lines 144-171):**
```typescript
if (totalShows === 0) { /* welcome */ }
else if ([25, 50, 100, 200].includes(totalShows)) { /* milestone */ }
else if (streak >= 3) { /* streak */ }        // ← Currently higher priority
else if (unrankedCount >= 3) { /* ranking */ } // ← Should be higher
```

**New Logic:**
```typescript
if (totalShows === 0) { /* welcome */ }
else if ([25, 50, 100, 200].includes(totalShows)) { /* milestone */ }
else if (unrankedCount >= 3) {
  // Ranking reminder - actionable CTA (higher priority)
  generatedInsight = {
    type: 'ranking_reminder',
    title: `${unrankedCount} Shows to Rank`,
    message: 'Tap to compare your recent shows.',
    actionable: true,  // NEW
    action: 'rank-tab' // NEW
  };
}
else if (streak >= 2) {  // Lowered threshold
  // Streak - celebratory (lower priority)
  generatedInsight = {
    type: 'streak_active',
    title: `${streak}-Month Streak`,
    message: `You've been to shows ${streak} months in a row!`,
    actionable: false
  };
}
```

### 2. Update InsightData Interface

**In DynamicInsight.tsx:**
```typescript
export interface InsightData {
  type: InsightType;
  title: string;
  message: string;
  actionable?: boolean;  // NEW: Whether card is tappable
  action?: 'rank-tab' | 'calendar' | 'rankings';  // NEW: Navigation action
}
```

### 3. Remove "To Rank" Pill from statPills

**Current (lines 213-220):**
```typescript
// Unranked -> Rank Tab (if > 0)
...(stats.unrankedCount > 0 ? [{
  id: 'unranked',
  label: 'To Rank',
  value: stats.unrankedCount,
  icon: Target,
  action: 'rank-tab' as StatPillAction,
}] : []),
```

**New:** Remove this entire block. The CTA is now in the Dynamic Insight card.

### 4. Update DynamicInsight.tsx - Tappable Card

```typescript
interface DynamicInsightProps {
  insight: InsightData | null;
  onAction?: (action: string) => void;  // NEW
}

const DynamicInsight = ({ insight, onAction }: DynamicInsightProps) => {
  if (!insight || !insight.type) return null;

  const config = insightConfig[insight.type];
  const Icon = config.icon;
  const isActionable = insight.actionable && insight.action;

  const content = (
    <div className={cn(
      "p-4 rounded-xl bg-gradient-to-r border transition-all",
      config.gradient,
      isActionable && "cursor-pointer hover:border-primary/50 active:scale-[0.98]"
    )}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 text-primary flex-shrink-0" />
          <span className="text-sm font-medium">{insight.title}</span>
        </div>
        {isActionable && (
          <ChevronRight className="h-4 w-4 text-muted-foreground" />
        )}
      </div>
      <p className="text-sm text-muted-foreground mt-1">{insight.message}</p>
    </div>
  );

  if (isActionable) {
    return (
      <button 
        onClick={() => onAction?.(insight.action!)} 
        className="w-full text-left"
      >
        {content}
      </button>
    );
  }

  return content;
};
```

### 5. Wire Up in Home.tsx

```typescript
// In renderHomeView():
<DynamicInsight 
  insight={insight} 
  onAction={(action) => {
    if (action === 'rank-tab') {
      onNavigateToRank?.();
    }
  }} 
/>
```

---

## Updated Stat Pills Array

After removing "To Rank" pill:

```typescript
const statPills: StatPill[] = [
  // Total Shows -> Rankings
  {
    id: 'total-shows',
    label: 'Shows',
    value: stats.allTimeShows,
    icon: Music,
    highlight: true,
    action: 'rankings',
  },
  // #1 Show -> Show Detail (if exists)
  ...(stats.topShow ? [{
    id: 'top-show',
    label: '#1 Show',
    value: truncate(stats.topShow.artistName, 12),
    icon: Trophy,
    action: 'show-detail',
    actionPayload: stats.topShow.id,
  }] : []),
  // This Year -> Calendar
  {
    id: 'this-year',
    label: new Date().getFullYear().toString(),
    value: stats.showsThisYear,
    icon: Calendar,
    action: 'calendar',
  },
  // Streak (no action, just display) - now ≥2 months
  ...(stats.currentStreak >= 2 ? [{
    id: 'streak',
    label: 'Streak',
    value: `${stats.currentStreak}mo`,
    icon: Flame,
    action: null,
  }] : []),
];
```

---

## File Changes

| File | Change Type | Description |
|------|-------------|-------------|
| `src/hooks/useHomeStats.ts` | Modify | Swap insight priority, lower streak threshold, remove "To Rank" pill, add actionable/action to insight |
| `src/components/home/DynamicInsight.tsx` | Modify | Add `onAction` prop, make card tappable, add chevron indicator |
| `src/components/Home.tsx` | Modify | Pass `onAction` handler to DynamicInsight |

---

## Implementation Steps

1. **Update InsightData interface** in `DynamicInsight.tsx` with `actionable` and `action` fields
2. **Add `onAction` prop** to DynamicInsight component
3. **Make insight card tappable** - wrap in button when actionable, add chevron
4. **Update insight priority logic** in `useHomeStats.ts` - ranking reminder before streak
5. **Lower streak threshold** from ≥3 to ≥2 months
6. **Remove "To Rank" pill** from statPills array
7. **Wire up handler** in Home.tsx to navigate to Rank tab

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No unranked shows, streak ≥2 | Show streak insight (non-tappable) |
| Unranked shows exist + streak | Show ranking reminder (tappable) - takes priority |
| New user, no shows | Show welcome insight |
| All shows ranked, no streak | No insight card shown |

