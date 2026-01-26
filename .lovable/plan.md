
# Fix: Top Shows Tab Ranking Order

## Problem Identified

The "Top Shows" tab displays shows in the wrong visual order. For example, you see #2 before #1 because:

1. **The list is sorted correctly** by ELO score (highest first)
2. **But the rank badges are calculated globally** against ALL rankings, not scoped to the current filter

This creates a mismatch where a show might be #1 in "This Year" filter but displays as #3 because that's its global all-time rank.

## Solution

Update the `getShowRankInfo` function to respect the current time filter and recalculate positions within the filtered context.

## Implementation Steps

### Step 1: Update getShowRankInfo to Accept Filter Context

Modify the function to accept the current filter and filtered shows list:

```text
getShowRankInfo(showId, filteredShowIds) 
  → Only consider rankings for shows in the current view
  → Recalculate position within that subset
```

### Step 2: Pass Filter Context to Rank Calculation

In `renderListView()`, pass the sorted/filtered show IDs to `getShowRankInfo`:

```text
const sortedShows = getSortedShows();
const filteredShowIds = sortedShows.map(s => s.id);

// When rendering each show:
const rankInfo = getShowRankInfo(show.id, filteredShowIds);
```

### Step 3: Recalculate Position Within Filtered Set

Update the position calculation to only consider shows in the current filter:

```text
// Filter rankings to only include shows in current view
const filteredRankings = rankings.filter(r => 
  filteredShowIds.includes(r.show_id)
);

// Sort and find position within filtered set
const sortedRankings = [...filteredRankings].sort((a, b) => 
  b.elo_score - a.elo_score
);
const position = sortedRankings.findIndex(r => r.show_id === showId) + 1;
```

## Technical Details

| File | Change |
|------|--------|
| `src/components/Feed.tsx` | Update `getShowRankInfo` signature to accept `filteredShowIds?: string[]` parameter |
| `src/components/Feed.tsx` | Update `renderListView` to compute and pass filtered show IDs |
| `src/components/Feed.tsx` | Update `total` in rank info to reflect filtered count, not global count |

## Expected Result

After this fix:
- **All Time**: Shows display as #1, #2, #3... in correct order
- **This Year**: Shows are re-ranked within just 2026 shows (#1 of year, #2 of year, etc.)
- **This Month**: Shows are re-ranked within just January 2026 shows

The rank badge will always match the show's position in the currently displayed list.
