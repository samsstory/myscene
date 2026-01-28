

# Enhanced Stacked Card Layout

## Summary

Update the "Rolodex" card stacking to create a true deck-of-cards effect where collapsed cards overlap slightly and the expanded card visually "pops" above cards both above and below it.

---

## Visual Concept

```text
Before (current):                    After (proposed):
┌─────────────────┐                  ┌─────────────────┐ z:1
│ Card 1          │ 8px gap          │ Card 1          │───┐
├─────────────────┤                  └───────┬─────────┘   │ overlap
│ Card 2          │ 8px gap              ┌───┴─────────┐ z:2
├─────────────────┤                      │ Card 2      │───┐
│ Card 3 EXPANDED │                      └───────┬─────┘   │
├─────────────────┤                  ╔═══════════╧═════════╗ z:10 (MAX)
│ Card 4          │                  ║                     ║
└─────────────────┘                  ║   EXPANDED CARD 3   ║
                                     ║                     ║
                                     ╚═══════════╤═════════╝
                                         ┌───────┴─────┐ z:2
                                         │ Card 4      │
                                         └─────────────┘ z:1
```

**Z-Index Logic:**
- Cards above expanded: z-index increases as you get closer to the expanded card
- Expanded card: highest z-index (always on top)
- Cards below expanded: z-index decreases as you move away from expanded card

---

## Changes

### 1. Increase Collapsed Card Height

**File:** `src/components/home/StackedShowCard.tsx`

Increase the padding in the collapsed state from `p-3` to `py-5 px-4` so the card is taller and the artist name has more visual breathing room.

```tsx
// Collapsed state CardContent
<CardContent className="relative py-5 px-4 flex items-center justify-between">
```

### 2. Overlap Cards with Negative Margin

**File:** `src/components/home/StackedShowList.tsx`

Change the margin from `8px` (gap) to `-20px` (overlap) so cards layer on top of each other.

```tsx
style={{
  marginTop: index === 0 ? 0 : "-20px",  // Negative margin creates overlap
  ...
}}
```

### 3. Dynamic Z-Index Calculation

**File:** `src/components/home/StackedShowList.tsx`

Implement z-index logic that makes the expanded card the highest, with cards ascending toward it from above and below:

```tsx
// Calculate z-index based on distance from expanded card
const getZIndex = (index: number, expandedIndex: number, total: number) => {
  if (expandedIndex === -1) {
    // No card expanded - simple descending order
    return total - index;
  }
  
  if (index === expandedIndex) {
    // Expanded card is always on top
    return total + 10;
  }
  
  // Distance from expanded card determines z-index
  // Cards closer to expanded have higher z-index
  const distance = Math.abs(index - expandedIndex);
  return total - distance;
};
```

**Usage in the map:**

```tsx
const expandedIndex = shows.findIndex(s => s.id === expandedId);

{shows.map((show, index) => (
  <div
    style={{
      marginTop: index === 0 ? 0 : "-20px",
      zIndex: getZIndex(index, expandedIndex, shows.length),
      position: "relative",
      pointerEvents: "auto",
    }}
  >
```

---

## Files to Modify

| File | Change |
|------|--------|
| `src/components/home/StackedShowCard.tsx` | Increase collapsed card padding from `p-3` to `py-5 px-4` |
| `src/components/home/StackedShowList.tsx` | Change margin from `8px` to `-20px`, add dynamic z-index calculation |

---

## Technical Details

**Z-Index Behavior Example** (5 cards, card 3 expanded):

| Card | Position | Distance from Expanded | Z-Index |
|------|----------|------------------------|---------|
| Card 1 | index 0 | 2 | 3 |
| Card 2 | index 1 | 1 | 4 |
| Card 3 | index 2 | 0 (expanded) | 15 |
| Card 4 | index 3 | 1 | 4 |
| Card 5 | index 4 | 2 | 3 |

This creates the "pyramid" effect where cards visually stack toward the expanded card from both directions.

