
# Plan: Context-Aware Rank Toggle Options

## Overview

Modify the rank toggle popup in the PhotoOverlayEditor to display context-appropriate time period options based on when the show occurred. Shows from different time periods will have different toggle behaviors:

- **This year's shows**: Show popup with "All Time" and "This Year" options
- **Last year's shows**: Show popup with "All Time" and "Last Year" options  
- **Older shows (2+ years ago)**: No popup - tapping rank icon simply toggles rank on/off (always shows "All Time")

## Current Behavior

The rank toggle currently always shows two static options:
- "All Time"
- "This Year"

This doesn't make sense for shows from previous years - a 2023 show can't be ranked for "This Year" (2025).

## Proposed Logic

```text
┌─────────────────────────────────────────────────────────────┐
│                    Show Date Analysis                        │
├─────────────────────────────────────────────────────────────┤
│  If show_date is in current year (2025):                    │
│    → Show popup: "All Time" | "This Year"                   │
│                                                             │
│  If show_date is in last year (2024):                       │
│    → Show popup: "All Time" | "Last Year"                   │
│                                                             │
│  If show_date is older than last year (2023 or earlier):    │
│    → No popup - just toggle rank visibility (All Time only) │
└─────────────────────────────────────────────────────────────┘
```

## Implementation Details

### 1. Add Helper Function for Show Age Category

Add a new function to determine the show's time category:

```typescript
// Determine show age category for rank options
const getShowAgeCategory = (): "this-year" | "last-year" | "older" => {
  const showDate = new Date(show.show_date);
  const showYear = showDate.getFullYear();
  const currentYear = new Date().getFullYear();
  
  if (showYear === currentYear) return "this-year";
  if (showYear === currentYear - 1) return "last-year";
  return "older";
};

const showAgeCategory = getShowAgeCategory();
```

### 2. Update Ranking Time Filter Type

Expand the type to support "last-year":

```typescript
const [rankingTimeFilter, setRankingTimeFilter] = useState<"all-time" | "this-year" | "last-year">("all-time");
```

### 3. Update filterShowsByTime Function

Add support for "last-year" filter:

```typescript
const filterShowsByTime = (shows: Show[], timeFilter: string) => {
  if (timeFilter === "all-time") return shows;
  
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  
  return shows.filter(s => {
    const showDate = new Date(s.show_date);
    
    if (timeFilter === "this-year") {
      return showDate.getFullYear() === currentYear;
    } else if (timeFilter === "last-year") {
      return showDate.getFullYear() === currentYear - 1;
    } else if (timeFilter === "this-month") {
      return showDate.getFullYear() === currentYear && 
             showDate.getMonth() === currentMonth;
    }
    return true;
  });
};
```

### 4. Update Rank Toggle Click Handler

Modify the rank icon button behavior based on show age:

```typescript
onClick={(e) => { 
  e.stopPropagation(); 
  if (item.key === "showRank") {
    const ageCategory = getShowAgeCategory();
    
    if (ageCategory === "older") {
      // Old shows: just toggle rank on/off, no popup
      toggleConfig("showRank");
      setRankingTimeFilter("all-time"); // Force all-time for old shows
    } else {
      // Recent shows: show popup
      if (!overlayConfig.showRank) {
        toggleConfig("showRank");
      }
      setShowRankOptions(!showRankOptions);
    }
  } else {
    toggleConfig(item.key);
  }
}}
```

### 5. Update Rank Options Popup UI

Render context-appropriate options based on show age:

```typescript
{/* Rank options - context-aware based on show date */}
{showRankOptions && overlayConfig.showRank && showAgeCategory !== "older" && (
  <div 
    className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-1 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl"
    onClick={(e) => e.stopPropagation()}
  >
    <button
      onClick={() => { setRankingTimeFilter("all-time"); setShowRankOptions(false); }}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        rankingTimeFilter === "all-time" 
          ? "bg-white/20 text-white shadow-sm" 
          : "text-white/60 hover:text-white/80"
      }`}
    >
      All Time
    </button>
    <button
      onClick={() => { 
        setRankingTimeFilter(showAgeCategory === "this-year" ? "this-year" : "last-year"); 
        setShowRankOptions(false); 
      }}
      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
        (showAgeCategory === "this-year" && rankingTimeFilter === "this-year") ||
        (showAgeCategory === "last-year" && rankingTimeFilter === "last-year")
          ? "bg-white/20 text-white shadow-sm" 
          : "text-white/60 hover:text-white/80"
      }`}
    >
      {showAgeCategory === "this-year" ? "This Year" : "Last Year"}
    </button>
  </div>
)}
```

### 6. Update Rank Display Text

The rank display text in the overlay footer already dynamically shows the filter label. Add support for "last-year":

```typescript
{overlayConfig.showRank && rankData.total > 0 ? (
  <span 
    className={`font-semibold bg-gradient-to-r ${getRankGradient(rankData.percentile)} bg-clip-text text-transparent cursor-pointer transition-opacity hover:opacity-70`}
    onClick={(e) => { e.stopPropagation(); toggleConfig("showRank"); }}
  >
    #{rankData.position} {rankingTimeFilter === 'this-year' ? 'this year' : rankingTimeFilter === 'last-year' ? 'last year' : 'all time'}
  </span>
) : (
  <span />
)}
```

### 7. Update Canvas Export

Update the canvas drawing logic to handle "last-year" label:

```typescript
// Rank text label
const rankLabel = rankingTimeFilter === 'this-year' 
  ? 'this year' 
  : rankingTimeFilter === 'last-year' 
    ? 'last year' 
    : 'all time';
ctx.fillText(`#${rankData.position} ${rankLabel}`, overlayX + padding, bottomY);
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/PhotoOverlayEditor.tsx` | Add show age helper, expand time filter type, update filter function, modify click handler logic, update popup UI, update display text |

## Visual Behavior Summary

| Show Date | Popup Visible? | Options |
|-----------|---------------|---------|
| 2025 (this year) | Yes | "All Time" / "This Year" |
| 2024 (last year) | Yes | "All Time" / "Last Year" |
| 2023 or earlier | No | Rank toggles on/off (All Time only) |

## Edge Cases

1. **Show from January 1st of current year**: Correctly categorized as "this-year"
2. **Show from December 31st of last year**: Correctly categorized as "last-year"
3. **Filter mismatch prevention**: When opening an old show, force `rankingTimeFilter` to "all-time" to prevent stale filter state
