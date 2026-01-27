

# Hybrid Home Page Redesign: Implementation Plan

## Overview

Transform the current fragmented Feed + Stats experience into a unified, minimal home page that surfaces key metrics upfront while making deeper features easily discoverable.

---

## Current State Analysis

```
CURRENT STRUCTURE                    NAVIGATION
┌─────────────────────────┐         ┌────────────────────────┐
│ Dashboard.tsx           │         │ Home │ Rank │ + │Stats│ Profile│
├─────────────────────────┤         └────────────────────────┘
│  activeTab: feed        │──────▶  Feed.tsx (4 sub-tabs)
│  activeTab: rank        │──────▶  Rank.tsx
│  activeTab: stats       │──────▶  Stats.tsx (separate page)
│  activeTab: profile     │──────▶  Profile.tsx
└─────────────────────────┘
```

**Issues:**
- Stats tab requires extra navigation to see key metrics
- Feed has 4 internal tabs (Recent, Calendar, Top Shows, Globe) - too complex
- Visual hierarchy is flat - every show card has equal weight
- No personalized insights or "at-a-glance" summary

---

## Proposed Architecture

```
NEW HOME STRUCTURE (Feed.tsx → Home.tsx)
┌───────────────────────────────────────────────────────┐
│                                                       │
│  ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐                 │
│  │  47  │ │  12  │ │ Top  │ │ 3-   │   ← Stat Pills  │
│  │Shows │ │ This │ │  5%  │ │Show  │                 │
│  │      │ │ Year │ │      │ │Streak│                 │
│  └──────┘ └──────┘ └──────┘ └──────┘                 │
│                                                       │
│  ┌─────────────────────────────────────────────────┐ │
│  │  🔥 New Personal Best!                          │ │  ← Dynamic Insight
│  │  "Mind Against at Charlotte" is now your #2    │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Recent Shows                                         │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ┌──────┐                                        │ │
│  │ │photo │  Mind Against  •  Charlotte            │ │
│  │ └──────┘  Dec 15  ·························#2   │ │  ← High-impact cards
│  └─────────────────────────────────────────────────┘ │
│  ┌─────────────────────────────────────────────────┐ │
│  │ ┌──────┐                                        │ │
│  │ │photo │  Anyma  •  Madison Square Garden       │ │
│  │ └──────┘  Dec 10  ························#15   │ │
│  └─────────────────────────────────────────────────┘ │
│                                                       │
│  Explore                                              │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐    │
│  │ 📅 Calendar │ │ 🏆 Rankings │ │ 🌍 Globe    │    │  ← Discovery Cards
│  └─────────────┘ └─────────────┘ └─────────────┘    │
│                                                       │
└───────────────────────────────────────────────────────┘
```

---

## Navigation Changes

### Bottom Nav Updates (Dashboard.tsx)

```
CURRENT                          PROPOSED
[Home] [Rank] [+] [Stats] [👤]   [Home] [Rank] [+] [👤]
  ↓      ↓         ↓                ↓      ↓      ↓
Feed   Rank     Stats            Home   Rank   Profile
                                  (merged stats)
```

**Changes:**
- Remove Stats tab from bottom navigation
- Stats data integrated into the new Home component
- Profile moves to the 4th position (fills Stats gap)
- Cleaner 4-tab layout: Home, Rank, +, Profile

---

## Component Breakdown

### 1. StatPills Component (New)

Horizontal scrollable row of key metrics at the top of the home page.

```typescript
// src/components/home/StatPills.tsx
interface StatPill {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  gradient?: string;
}

const StatPills = ({ stats, isLoading }: StatPillsProps) => (
  <ScrollArea orientation="horizontal">
    <div className="flex gap-3 pb-2">
      {stats.map((stat) => (
        <div className="flex-shrink-0 px-4 py-3 rounded-full bg-card border border-border">
          <div className="text-xs text-muted-foreground">{stat.label}</div>
          <div className="text-lg font-bold">{stat.value}</div>
        </div>
      ))}
    </div>
  </ScrollArea>
);
```

**Displayed Stats:**
- Total Shows (all time)
- Shows This Year
- Activity Rank (e.g., "Top 5%")
- Current Streak (e.g., "3-show streak")

---

### 2. DynamicInsight Component (New)

Contextual, personalized message that changes based on user activity.

```typescript
// src/components/home/DynamicInsight.tsx
type InsightType = 
  | 'new_personal_best'    // A show moved up in rankings
  | 'milestone_reached'    // Hit 50/100/etc shows
  | 'streak_active'        // Currently on a streak
  | 'inactive_prompt'      // Haven't logged in a while
  | 'ranking_reminder'     // Shows need ranking
  | null;                  // No insight to show

const DynamicInsight = ({ insight }: { insight: InsightData | null }) => {
  if (!insight) return null;
  
  return (
    <div className="p-4 rounded-xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20">
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">{insight.title}</span>
      </div>
      <p className="text-sm text-muted-foreground mt-1">{insight.message}</p>
    </div>
  );
};
```

**Insight Priority Logic:**
1. New personal best (show rank improved)
2. Milestone reached (50, 100, 200 shows)
3. Active streak
4. Unranked shows need attention
5. No shows yet - welcome message

---

### 3. RecentShowCard Component (New)

Larger, more impactful show cards for the home page.

```typescript
// src/components/home/RecentShowCard.tsx
const RecentShowCard = ({ show, rankInfo, onTap }: Props) => (
  <Card className="overflow-hidden" onClick={() => onTap(show)}>
    <div className="flex gap-4 p-4">
      {/* Photo thumbnail - larger than current */}
      <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0">
        {show.photo_url ? (
          <img src={show.photo_url} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-muted flex items-center justify-center">
            <Music2 className="h-8 w-8 text-muted-foreground/50" />
          </div>
        )}
      </div>
      
      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="font-bold text-base truncate">{artistName}</div>
        <div className="text-sm text-muted-foreground truncate">{venue}</div>
        <div className="text-xs text-muted-foreground mt-1">{formattedDate}</div>
      </div>
      
      {/* Rank badge - right aligned */}
      <div className="flex-shrink-0 self-center">
        <ShowRankBadge position={rankInfo.position} total={rankInfo.total} />
      </div>
    </div>
  </Card>
);
```

---

### 4. DiscoveryCards Component (New)

Navigation cards to access Calendar, Top Shows, and Globe features.

```typescript
// src/components/home/DiscoveryCards.tsx
const features = [
  { id: 'calendar', icon: Calendar, label: 'Calendar', description: 'View by month' },
  { id: 'rankings', icon: Trophy, label: 'Rankings', description: 'Your top shows' },
  { id: 'globe', icon: Globe, label: 'Show Globe', description: 'Map your travels' },
];

const DiscoveryCards = ({ onNavigate }: { onNavigate: (view: string) => void }) => (
  <div className="grid grid-cols-3 gap-3">
    {features.map((feature) => (
      <button
        key={feature.id}
        onClick={() => onNavigate(feature.id)}
        className="flex flex-col items-center p-4 rounded-xl bg-card border border-border hover:bg-accent transition-colors"
      >
        <feature.icon className="h-6 w-6 text-primary mb-2" />
        <span className="text-sm font-medium">{feature.label}</span>
      </button>
    ))}
  </div>
);
```

---

## Data Flow

### Home Component Data Fetching

The new Home component will consolidate data fetching from both Feed.tsx and Stats.tsx:

```typescript
// src/components/Home.tsx
const Home = () => {
  // Shows data (from current Feed.tsx)
  const [shows, setShows] = useState<Show[]>([]);
  const [rankings, setRankings] = useState<ShowRanking[]>([]);
  
  // Stats data (from current Stats.tsx) 
  const [stats, setStats] = useState<StatsData>({
    allTimeShows: 0,
    showsThisYear: 0,
    showsThisMonth: 0,
    activityRank: 0,
    currentStreak: 0,
    topRankedShow: null,
  });
  
  // Dynamic insight
  const [insight, setInsight] = useState<InsightData | null>(null);
  
  // View mode for sub-views
  const [viewMode, setViewMode] = useState<'home' | 'calendar' | 'rankings' | 'globe'>('home');
  
  useEffect(() => {
    fetchAllData();
  }, []);
  
  // Unified fetch that combines shows + stats
  const fetchAllData = async () => {
    // Parallel fetch for performance
    const [showsResult, statsResult] = await Promise.all([
      fetchShows(),
      fetchStats(),
    ]);
    
    // Generate dynamic insight based on data
    const insight = generateInsight(showsResult, statsResult);
    setInsight(insight);
  };
};
```

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/Feed.tsx` | **Rename** → `Home.tsx` | Major refactor to new home layout |
| `src/components/home/StatPills.tsx` | **Create** | Horizontal stat pills component |
| `src/components/home/DynamicInsight.tsx` | **Create** | Personalized insight card |
| `src/components/home/RecentShowCard.tsx` | **Create** | Enhanced show card for home |
| `src/components/home/DiscoveryCards.tsx` | **Create** | Feature navigation cards |
| `src/pages/Dashboard.tsx` | **Modify** | Remove Stats tab, update nav |
| `src/components/Stats.tsx` | **Delete** | No longer needed as separate page |

---

## Implementation Steps

### Phase 1: Create New Components

1. Create `src/components/home/` directory
2. Build `StatPills.tsx` with horizontal scroll
3. Build `DynamicInsight.tsx` with insight logic
4. Build `RecentShowCard.tsx` with enhanced layout
5. Build `DiscoveryCards.tsx` for feature navigation

### Phase 2: Refactor Feed → Home

1. Create new `Home.tsx` based on Feed.tsx
2. Integrate stat fetching logic from Stats.tsx
3. Build unified data layer with parallel fetching
4. Implement view mode switching for sub-views (calendar, rankings, globe)
5. Add insight generation logic

### Phase 3: Update Navigation

1. Modify Dashboard.tsx to remove Stats tab
2. Update bottom nav to 4-tab layout
3. Replace Feed component import with Home
4. Test navigation flow

### Phase 4: Polish and Test

1. Add loading skeletons for stat pills
2. Test insight generation across scenarios
3. Verify sub-view navigation works correctly
4. Clean up unused Stats.tsx file

---

## Visual Design Notes

### Stat Pills

- Pill shape with rounded-full corners
- Subtle gradient or border on primary stat
- Horizontal scroll with fade edges
- Fixed height, variable width based on content

### Recent Show Cards

- Larger photo thumbnails (80x80px vs current 64x64px)
- More generous padding
- Subtle shadow on hover
- Rank badge aligned right

### Discovery Cards

- Square-ish aspect ratio
- Icon + label centered
- Subtle hover state
- Equal width via grid

### Color Palette

- Keep existing dark theme
- Primary color for highlights
- Muted backgrounds for cards
- Gradient accents for special elements (insights, milestones)

---

## Technical Considerations

### Performance

- Parallel data fetching for shows + stats
- Limit recent shows to 5-10 on home (not full list)
- Lazy load Calendar/Globe when navigating to sub-views
- Memoize stat calculations

### State Management

- Single useEffect for initial data load
- Separate state for each sub-view to avoid re-fetches
- Use React Query patterns for caching if needed

### Accessibility

- Proper heading hierarchy (h1 for page, h2 for sections)
- aria-labels on icon-only elements
- Keyboard navigation for discovery cards

