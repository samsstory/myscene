
# Improve Top Shows Filter Design

## Current State

The Top Shows tab displays 3 horizontal buttons for time period filtering:
- All Time | This Year | This Month

You want to add:
1. **Last Year** as a time period option
2. **Sort direction toggle** (Best to Worst / Worst to Best)

The concern is that adding more buttons makes the UI feel cluttered.

## Proposed Solution: Compact Two-Row Filter Bar

Instead of adding more horizontal buttons, I'll create a cleaner layout with two distinct controls:

```text
+------------------------------------------+
|  [All Time ▼]              [Best ▲▼ Worst]  |
+------------------------------------------+
```

**Left side**: Dropdown select for time period (compact, expandable)
**Right side**: Sort direction toggle with up/down arrows

This approach:
- Reduces visual clutter by hiding time options in a dropdown
- Makes room for the sort toggle without adding a third row
- Scales better if you add more time filters later (e.g., "Last 6 Months")

## Filter Options

**Time Period Dropdown:**
| Option | Filter Logic |
|--------|--------------|
| All Time | No date filter |
| This Month | Current month of current year |
| This Year | Shows from 2026 |
| Last Year | Shows from 2025 |

**Sort Direction Toggle:**
| Option | Display |
|--------|---------|
| Best First | Shows ranked #1, #2, #3... (default) |
| Worst First | Shows ranked from worst to best |

## Visual Design

The filter bar will be a single row with flexbox layout:
- Time dropdown on the left with subtle styling
- Sort toggle on the right using a button pair or single toggle button
- Icons: `ArrowUp` / `ArrowDown` from lucide-react to indicate direction
- Consistent with the dark theme and existing component styling

## Implementation Steps

### Step 1: Update State Variables

Add new state for sort direction:
```typescript
const [sortDirection, setSortDirection] = useState<"best-first" | "worst-first">("best-first");
```

Update the time filter type to include "last-year":
```typescript
const [topRatedFilter, setTopRatedFilter] = useState<"all-time" | "this-year" | "last-year" | "this-month">("all-time");
```

### Step 2: Update getSortedShows Logic

Add the "last-year" filter case and reverse sort when direction is "worst-first":
```typescript
if (topRatedFilter === "last-year") {
  const lastYear = currentYear - 1;
  filteredShows = shows.filter(show => {
    const showDate = parseISO(show.date);
    return showDate.getFullYear() === lastYear;
  });
}

// After ELO sort, reverse if worst-first
if (sortDirection === "worst-first") {
  sortedShows.reverse();
}
```

### Step 3: Replace Button Row with New Filter Bar

Replace the current 3-button row with a flex container:
- Left: `<Select>` dropdown with time period options
- Right: Toggle button for sort direction with arrow icon

### Step 4: Update Rank Display for Reversed Order

When sorting worst-first, the rank badges should still show the true rank position (not reversed), so users understand where shows actually stand in their rankings.

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/Feed.tsx` | Add `sortDirection` state, update filter type, modify `getSortedShows`, replace filter UI |

## Expected Result

- Cleaner, more professional filter UI
- Easy one-tap access to switch between best/worst ordering
- Time period options neatly tucked into a dropdown
- Scalable design for future filter additions
