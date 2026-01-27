

# Tappable Stat Pills with Smart Navigation

## Overview

Transform the static stat pills at the top of the home page into interactive navigation triggers that link to the most valuable features. Replace the bottom "Explore" section with higher-value stat pills that drive engagement and make key data immediately actionable.

---

## Current vs. Proposed Layout

```text
CURRENT HOME LAYOUT                    PROPOSED HOME LAYOUT
+----------------------------------+   +----------------------------------+
| [All Time] [2026] [Activity] [S] |   | [47 Shows] [#1 Show] [3 Unranked]|
|        (static pills)            |   |        (tappable pills)          |
+----------------------------------+   +----------------------------------+
|                                  |   |                                  |
| [Dynamic Insight Card]           |   | [Dynamic Insight Card]           |
|                                  |   |                                  |
+----------------------------------+   +----------------------------------+
|                                  |   |                                  |
| Recent Shows                     |   | Recent Shows                     |
|   - Show Card 1                  |   |   - Show Card 1                  |
|   - Show Card 2                  |   |   - Show Card 2                  |
|   - Show Card 3                  |   |   - Show Card 3                  |
|                                  |   |                                  |
+----------------------------------+   +----------------------------------+
| Explore                          |   |                                  |
|  [Calendar] [Rankings] [Globe]   |   | (REMOVED - replaced by pills)    |
+----------------------------------+   +----------------------------------+
```

---

## Prioritized Stat Pills

Based on UX value and user engagement drivers:

| Priority | Pill | Value Displayed | Tap Action | Why It Matters |
|----------|------|-----------------|------------|----------------|
| 1 | **Total Shows** | "47 Shows" | Opens Rankings view | Identity anchor - users' core achievement |
| 2 | **#1 Show** | Artist name + Venue (truncated) | Opens that show's detail sheet | Most emotionally resonant stat |
| 3 | **Unranked** | "3 to Rank" | Switches to Rank tab | Clear call-to-action, drives engagement |
| 4 | **This Year** | "12 in 2026" | Opens Calendar view | Recency context |
| 5 | **Streak** (conditional) | "3mo streak" | Visual only (no nav) | Momentum indicator (only if streak > 0) |

---

## Data Flow Changes

```text
useHomeStats Hook                     StatPills Component
+--------------------------------+    +--------------------------------+
| Fetch:                         |    | Receives:                      |
|  - Total shows count           |    |  - statPills[] with:           |
|  - Shows this year             |    |    - id, label, value, icon    |
|  - Unranked count              |    |    - NEW: action, actionPayload|
|  - #1 ranked show details      | -> |                                |
|  - Current streak              |    | Renders tappable buttons       |
|                                |    | Calls onPillTap(action, payload)|
+--------------------------------+    +--------------------------------+
                                              |
                                              v
                                      Home Component
                                      +--------------------------------+
                                      | handlePillTap(action, payload) |
                                      |   - 'rankings' -> setViewMode  |
                                      |   - 'calendar' -> setViewMode  |
                                      |   - 'rank-tab' -> prop callback|
                                      |   - 'show-detail' -> open sheet|
                                      +--------------------------------+
```

---

## Component Changes

### 1. StatPills.tsx - Add Interactivity

**Current Interface:**
```typescript
interface StatPill {
  id: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  highlight?: boolean;
}
```

**New Interface:**
```typescript
interface StatPill {
  id: string;
  label: string;
  value: string | number;
  icon?: LucideIcon;
  highlight?: boolean;
  // NEW: Navigation properties
  action?: 'rankings' | 'calendar' | 'rank-tab' | 'show-detail' | 'globe' | null;
  actionPayload?: string; // e.g., show ID for show-detail
}

interface StatPillsProps {
  stats: StatPill[];
  isLoading?: boolean;
  onPillTap?: (action: string, payload?: string) => void; // NEW
}
```

**Visual Changes:**
- Add subtle tap feedback (scale animation on press)
- Add chevron indicator for tappable pills
- Slightly larger touch targets

### 2. useHomeStats.ts - Fetch #1 Show Data

Add fetching of the user's top-ranked show:

```typescript
interface TopShow {
  id: string;
  artistName: string;
  venueName: string;
}

// In fetchStats:
// Get top ranked show by ELO
const { data: topRankedData } = await supabase
  .from('show_rankings')
  .select('show_id, elo_score')
  .eq('user_id', userId)
  .order('elo_score', { ascending: false })
  .limit(1);

if (topRankedData?.[0]) {
  // Fetch show details
  const { data: showData } = await supabase
    .from('shows')
    .select('id, venue_name')
    .eq('id', topRankedData[0].show_id)
    .single();
    
  // Fetch headliner artist
  const { data: artistData } = await supabase
    .from('show_artists')
    .select('artist_name')
    .eq('show_id', topRankedData[0].show_id)
    .eq('is_headliner', true)
    .limit(1);
}
```

### 3. Home.tsx - Handle Pill Navigation

Add handler and wire up navigation:

```typescript
const handlePillTap = (action: string, payload?: string) => {
  switch (action) {
    case 'rankings':
      setViewMode('rankings');
      break;
    case 'calendar':
      setViewMode('calendar');
      break;
    case 'rank-tab':
      onNavigateToRank?.(); // Prop from Dashboard
      break;
    case 'show-detail':
      if (payload) {
        const show = shows.find(s => s.id === payload);
        if (show) {
          setReviewShow(show);
          setReviewSheetOpen(true);
        }
      }
      break;
  }
};
```

### 4. Remove DiscoveryCards Section

- Delete the "Explore" section from `renderHomeView()`
- Remove import of `DiscoveryCards`
- Keep `DiscoveryCards.tsx` file (could be useful elsewhere) or delete if unused

---

## Updated Stat Pills Configuration

In `useHomeStats.ts`, the new `statPills` array:

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
  // Unranked -> Rank Tab (if > 0)
  ...(stats.unrankedCount > 0 ? [{
    id: 'unranked',
    label: 'To Rank',
    value: stats.unrankedCount,
    icon: Target,
    action: 'rank-tab',
  }] : []),
  // This Year -> Calendar
  {
    id: 'this-year',
    label: new Date().getFullYear().toString(),
    value: stats.showsThisYear,
    icon: Calendar,
    action: 'calendar',
  },
  // Streak (no action, just display)
  ...(stats.currentStreak >= 2 ? [{
    id: 'streak',
    label: 'Streak',
    value: `${stats.currentStreak}mo`,
    icon: Flame,
    action: null, // No navigation
  }] : []),
];
```

---

## File Changes Summary

| File | Change Type | Description |
|------|-------------|-------------|
| `src/components/home/StatPills.tsx` | Modify | Add `onPillTap` prop, button wrapper, tap animation |
| `src/hooks/useHomeStats.ts` | Modify | Add top show fetch, unranked count, action properties |
| `src/components/Home.tsx` | Modify | Add `handlePillTap`, remove DiscoveryCards section, add `onNavigateToRank` prop |
| `src/pages/Dashboard.tsx` | Modify | Pass `onNavigateToRank` callback to Home component |
| `src/components/home/DiscoveryCards.tsx` | Optional Delete | No longer used in home view |

---

## Implementation Steps

### Phase 1: Extend StatPill Interface
1. Update `StatPill` interface in `StatPills.tsx` with `action` and `actionPayload`
2. Add `onPillTap` prop to `StatPillsProps`
3. Wrap pills in `<button>` elements with tap handlers
4. Add visual feedback (hover/active states, optional chevron)

### Phase 2: Enhance useHomeStats Hook
1. Add `topShow` and `unrankedCount` to stats state
2. Fetch top-ranked show by ELO score with artist/venue details
3. Calculate unranked count (shows without comparisons)
4. Update `statPills` array with new action properties

### Phase 3: Wire Up Navigation in Home
1. Add `handlePillTap` function with switch statement
2. Pass handler to `<StatPills onPillTap={handlePillTap} />`
3. Add `onNavigateToRank` prop to Home component interface
4. Remove `<DiscoveryCards>` section from `renderHomeView()`

### Phase 4: Update Dashboard Integration
1. Pass `onNavigateToRank={() => setActiveTab("rank")}` to Home
2. Verify navigation flows work correctly

### Phase 5: Polish
1. Add loading states for new data
2. Test edge cases (no shows, no rankings, etc.)
3. Ensure smooth animations on pill tap

---

## Visual Design Details

### Tappable Pill Styling

```text
+----------------------------------+
|  [Music Icon]  Shows             |  <- Label with icon
|       47           >             |  <- Value + chevron indicator
+----------------------------------+
     ^                    ^
     |                    |
  Highlight gradient    Chevron shows
  for primary pill      it's tappable
```

- **Touch target**: Minimum 44px height
- **Tap feedback**: `active:scale-95` + opacity change
- **Chevron**: Small `ChevronRight` icon (only for actionable pills)
- **Non-actionable pills** (like Streak): No chevron, no hover state

### Pill Order (Left to Right)
1. Total Shows (highlighted, primary)
2. #1 Show (if exists)
3. Unranked (if > 0)
4. This Year
5. Streak (if >= 2 months)

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No shows yet | Only show "0 Shows" pill (tappable but shows empty rankings) |
| No rankings yet | Skip "#1 Show" pill, show "X to Rank" pill |
| All shows ranked | Skip "To Rank" pill |
| No streak | Skip "Streak" pill |
| Tap #1 Show but show data unavailable | Silently fail (show not found in local state) |

