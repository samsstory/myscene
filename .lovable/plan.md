

# Globe Access via Stat Pill + Nav Layout Fix

## Overview

Add a geographic stat pill (Cities/Countries) to the Home page stat pills that navigates to the Globe view, while fixing the bottom navigation layout to have the pill centered and FAB right-aligned.

---

## Visual Before/After

```text
CURRENT BOTTOM NAV:
    +-------------------+  +---+
    |  [Home]   [Rank]  |  | + |   <- Both just centered together
    +-------------------+  +---+
           ^                  ^
      Pill + FAB together, gap-3

PROPOSED BOTTOM NAV:
|                                              |
| [spacer]    [Home]   [Rank]           [+]    |
|                                              |
      ^             ^                     ^
   Invisible    Centered pill        Right-aligned
   balancer      (2 items)           larger FAB
```

```text
CURRENT STAT PILLS:
[47 Shows] [#1 Show] [2026] [3mo Streak]

PROPOSED STAT PILLS:
[47 Shows] [#1 Show] [8 Cities] [2026] [3mo Streak]
                        ^
                   NEW - taps to Globe
```

---

## Changes Summary

| Component | Change |
|-----------|--------|
| `Dashboard.tsx` | Update nav layout: center pill, right-align FAB |
| `Dashboard.tsx` | Enlarge FAB (p-4, h-7 w-7 icons) |
| `useHomeStats.ts` | Add geographic stats (cities/countries count) |
| `useHomeStats.ts` | Add Cities/Countries stat pill with `'globe'` action |
| `StatPills.tsx` | Already supports `'globe'` action (no changes needed) |
| `Home.tsx` | Already handles `'globe'` action in `handlePillTap` (no changes needed) |

---

## Implementation Details

### 1. Dashboard.tsx - Fix Nav Layout

**Current (line 111):**
```tsx
<div className="fixed bottom-6 left-0 right-0 z-50 flex justify-center items-end gap-3 px-4">
```

**New:**
```tsx
<div className="fixed bottom-6 left-0 right-0 z-50 flex justify-between items-end px-6">
  {/* Left spacer to balance FAB for centering pill */}
  <div className="w-14" />
  
  {/* Glass Pill Navigation - now truly centered */}
  <nav className="backdrop-blur-xl bg-black/40 border border-white/20 rounded-full px-6 py-2 shadow-2xl">
    ...
  </nav>
  
  {/* Floating FAB - right aligned */}
  <div className="relative">
    ...
  </div>
</div>
```

### 2. Dashboard.tsx - Enlarge FAB

**Current FAB button (lines 190-198):**
```tsx
<button
  className={cn(
    "backdrop-blur-xl bg-primary/90 border border-white/30 text-primary-foreground rounded-full p-3 shadow-2xl...",
    ...
  )}
>
  {showFabMenu ? <X className="h-6 w-6" /> : <Plus className="h-6 w-6" />}
</button>
```

**New FAB button:**
```tsx
<button
  className={cn(
    "backdrop-blur-xl bg-primary/90 border border-white/30 text-primary-foreground rounded-full p-4 shadow-2xl...",
    ...
  )}
>
  {showFabMenu ? <X className="h-7 w-7" /> : <Plus className="h-7 w-7" />}
</button>
```

### 3. useHomeStats.ts - Add Geographic Stats

**Add to StatsData interface:**
```typescript
interface StatsData {
  allTimeShows: number;
  showsThisYear: number;
  showsThisMonth: number;
  activityRank: number;
  currentStreak: number;
  unrankedCount: number;
  topShow: TopShow | null;
  uniqueCities: number;    // NEW
  uniqueCountries: number; // NEW
}
```

**Add to fetchStats function (after fetching shows):**
```typescript
// Calculate unique cities and countries from venue locations
const cities = new Set<string>();
const countries = new Set<string>();

// Helper function to extract country from location
const getCountryFromLocation = (location: string): string => {
  const parts = location.split(',').map(p => p.trim());
  const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 
    'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 
    'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 
    'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 
    'WA', 'WV', 'WI', 'WY'];
  
  const lastPart = parts[parts.length - 1];
  if (['USA', 'US', 'United States'].includes(lastPart)) return 'United States';
  
  for (const part of parts) {
    const cleanedPart = part.replace(/\s*\d+\s*$/, '').trim();
    if (usStates.includes(cleanedPart)) return 'United States';
  }
  
  return parts.length >= 2 ? lastPart : 'United States';
};

// Helper function to extract city from location
const getCityFromLocation = (location: string): string => {
  const parts = location.split(',').map(p => p.trim());
  if (parts.length >= 3 && /^\d/.test(parts[0])) {
    return `${parts[1]}, ${parts[2].replace(/\s*\d+\s*$/, '').trim()}`;
  }
  if (parts.length >= 2) {
    return `${parts[0]}, ${parts[1].replace(/\s*\d+\s*$/, '').trim()}`;
  }
  return parts[0];
};

// Fetch shows with venue_location for geographic stats
const { data: showsWithLocation } = await supabase
  .from('shows')
  .select('venue_location')
  .eq('user_id', userId)
  .not('venue_location', 'is', null);

showsWithLocation?.forEach(show => {
  if (show.venue_location) {
    cities.add(getCityFromLocation(show.venue_location));
    countries.add(getCountryFromLocation(show.venue_location));
  }
});
```

### 4. useHomeStats.ts - Add Cities Stat Pill

**Add Globe icon import:**
```typescript
import { Music, Calendar, Trophy, Flame, Globe } from "lucide-react";
```

**Add to statPills array (after #1 Show, before Year):**
```typescript
// Cities -> Globe View
...(stats.uniqueCities > 0 ? [{
  id: 'cities',
  label: stats.uniqueCountries > 1 ? 'Places' : 'Cities',
  value: stats.uniqueCountries > 1 
    ? `${stats.uniqueCities}/${stats.uniqueCountries}` 
    : stats.uniqueCities,
  icon: Globe,
  action: 'globe' as StatPillAction,
}] : []),
```

**Smart label logic:**
- If user has shows in multiple countries: Show "8 Cities / 3 Countries" or "8/3" with label "Places"
- If user is in one country: Show just city count with label "Cities"

---

## Stat Pill Display Logic

| Scenario | Pill Label | Pill Value | Example |
|----------|------------|------------|---------|
| Single country, 5 cities | Cities | 5 | "5 Cities" |
| Multiple countries (3), 8 cities | Places | 8/3 | "8/3 Places" |
| No location data | (hidden) | - | - |

---

## File Changes

| File | Change Type | Lines Affected |
|------|-------------|----------------|
| `src/pages/Dashboard.tsx` | Modify | ~111-200 (nav layout + FAB) |
| `src/hooks/useHomeStats.ts` | Modify | Interface, fetchStats, statPills array |

---

## Layout Spacing Details

```text
Screen width
|<----------------------------------------->|
|  [spacer]      [    PILL    ]       [FAB] |
|    w-14          centered            w-14 |
      ^                ^                 ^
   Balances         Home+Rank         Right
   the FAB          centered          edge
```

**Container changes:**
- `justify-between` instead of `justify-center`
- `px-6` instead of `px-4` for better edge spacing
- Remove `gap-3` (no longer needed with justify-between)

**FAB sizing:**
- Padding: `p-3` → `p-4` (48px → 56px total)
- Icon: `h-6 w-6` → `h-7 w-7`
- Menu position: Adjust `bottom-14` → `bottom-16` for larger FAB

---

## Existing Infrastructure (No Changes Needed)

The `'globe'` action is already wired up:

**StatPills.tsx (line 50):**
```typescript
export type StatPillAction = 'rankings' | 'calendar' | 'rank-tab' | 'show-detail' | 'globe' | null;
```

**Home.tsx (lines 243-266):**
```typescript
const handlePillTap = (action: StatPillAction, payload?: string) => {
  switch (action) {
    case 'globe':
      setViewMode('globe');
      break;
    ...
  }
};
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| No shows with location | Cities pill is hidden |
| All shows in one city | Shows "1" with label "Cities" |
| International user | Shows "8/3" format with "Places" label |
| User taps Cities pill | Navigates to Globe view within Home |

