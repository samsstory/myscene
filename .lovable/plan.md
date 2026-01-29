
# Add Centered "See Full Details" Toggle

## Overview
Add a single minimal toggle button centered above the "Tap to choose the winner" instruction that expands both ranking cards simultaneously to show all ratings and complete notes.

## Current Layout (Bottom Section)
```text
   [Left Card]  VS  [Right Card]
   
           Tap to choose the winner
           Can't compare these
```

## Proposed Layout
```text
   [Left Card]  VS  [Right Card]
   
         See full details  ▼     <- NEW: centered toggle
       Tap to choose the winner
         Can't compare these
```

## Implementation Approach

### 1. Add Shared Expand State in Rank.tsx
- Add `showDetails` boolean state to `Rank.tsx` 
- This controls both cards expanding together (not individually)

### 2. Create Minimal Toggle Button in Rank.tsx  
- Position above "Tap to choose the winner" text
- Minimal styling: small text, muted color, centered
- Include `ChevronDown` icon that rotates when expanded
- Text toggles between "See full details" / "Hide details"

### 3. Pass Expand State to RankingCard
- Add `isExpanded` prop to RankingCard component
- When `true`, card shows:
  - All 5 rating bars (not just top 3)
  - Full notes text without truncation

### 4. Update RankingCard Display Logic
- When `isExpanded={false}` (current behavior):
  - Show top 3 aspects with values
  - Truncate notes to 60 chars
- When `isExpanded={true}`:
  - Show all 5 aspects that have values
  - Show complete notes without truncation

## Files to Modify

### src/components/Rank.tsx
- Add `showDetails` state
- Add toggle button with ChevronDown icon between cards section and instruction text
- Pass `isExpanded={showDetails}` to both RankingCard components

### src/components/rankings/RankingCard.tsx
- Add `isExpanded?: boolean` prop to interface
- Conditionally render all aspects vs top 3 based on prop
- Conditionally render full notes vs truncated based on prop

## Visual Design

Toggle button styling:
- `text-xs text-muted-foreground/70`
- Centered with flex layout
- Small gap between text and chevron icon
- Subtle hover state
- Chevron rotates 180° when expanded

Expanded card content:
- Smooth height transition using CSS
- All rating bars maintain same styling
- Full notes text wraps naturally
