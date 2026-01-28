

# Rankings Page Polish with Scene Aesthetic

## Overview
Transform the Rankings page to match the Scene aesthetic with glassmorphism styling, larger thumbnails, swipe-to-delete gesture, and an empty state for filtered results. The page will be renamed "Top Ranked Shows" and visually align with the glowing, premium feel of the home page.

## Current State
The Rankings view in `Home.tsx` (lines 390-501) uses standard Card components with:
- 64px thumbnail images
- Visible delete (X) button on each card creating visual clutter
- Standard border and shadow styling
- No empty state when filters return 0 results

## Implementation Details

### 1. Rename Page Title
Change the header from "Top Shows" to "Top Ranked Shows" in `renderSubViewHeader()`.

**File:** `src/components/Home.tsx`

```typescript
// In the main return JSX around line 620
{viewMode === 'rankings' && (
  <>
    {renderSubViewHeader('Top Ranked Shows')} // Changed from 'Top Shows'
    {renderRankingsView()}
  </>
)}
```

---

### 2. Apply Glassmorphism Styling

Update card styling to use Scene aesthetic - glass backgrounds, subtle borders, glowing text:

**Current Card (lines 430-434):**
```typescript
<Card 
  className="border-border shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer relative"
>
```

**New Card:**
```typescript
<Card 
  className="border-white/[0.08] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 cursor-pointer relative overflow-hidden"
>
```

Update text styling to include subtle glow effects consistent with StackedShowCard:

```typescript
// Artist name with glow
<div 
  className="font-bold text-base leading-tight truncate"
  style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}
>

// Venue text - slightly muted glow
<div 
  className="text-sm text-white/60 truncate"
  style={{ textShadow: "0 0 8px rgba(255,255,255,0.15)" }}
>

// Date text - matching muted style
<div 
  className="text-sm text-white/60"
  style={{ textShadow: "0 0 8px rgba(255,255,255,0.15)" }}
>
```

---

### 3. Increase Thumbnail Size (64px → 80px)

**Current (lines 462-470):**
```typescript
<div className="w-16 h-16 rounded-lg ...">
```

**New:**
```typescript
<div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md border border-white/10">
```

Also update the Music2 icon fallback to match:
```typescript
<div className="w-20 h-20 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0 border border-white/[0.08]">
  <Music2 className="h-8 w-8 text-white/30" />
</div>
```

---

### 4. Remove Delete Button, Add Swipe-to-Delete

Create a new `SwipeableRankingCard` component that wraps each ranking card with touch gesture handling:

**New File:** `src/components/rankings/SwipeableRankingCard.tsx`

```text
Component Structure:
┌─────────────────────────────────────────────┐
│  [Delete Background]     │   [Card Content] │  ← Swipe left reveals delete
│      🗑 Delete           │                  │
└─────────────────────────────────────────────┘
```

**Implementation approach:**
- Track touch start/move/end positions
- Calculate horizontal swipe distance
- If swipe exceeds threshold (80px), reveal delete action
- Animate card translation with spring-like easing
- Tap on revealed delete button triggers the delete confirmation
- Tap anywhere else or swipe right resets the card

**State management:**
```typescript
const [translateX, setTranslateX] = useState(0);
const [isRevealed, setIsRevealed] = useState(false);
const touchStartX = useRef(0);
const currentX = useRef(0);
```

**Touch handlers:**
```typescript
onTouchStart: Record start position
onTouchMove: Calculate delta, update translateX (clamped to 0 to -120px)
onTouchEnd: If delta > 80px threshold, snap to revealed state (-100px); else snap back to 0
```

**Visual design:**
- Delete background: `bg-destructive/80` with Trash2 icon
- Card slides left to reveal the delete action
- Spring transition: `transition-transform duration-300 ease-out`

---

### 5. Add Empty State for Filtered Results

When `sortedShows.length === 0` after filtering, display an empty state:

```text
┌─────────────────────────────────────────────┐
│                                             │
│           🎵 (Music2 icon, glowing)         │
│                                             │
│        No shows match this filter           │
│                                             │
│     Try selecting a different time period   │
│                                             │
└─────────────────────────────────────────────┘
```

**Implementation:**
```typescript
// In renderRankingsView(), after the filter bar
{sortedShows.length === 0 ? (
  <div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="relative mb-4">
      <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl animate-pulse" />
      <div className="relative w-16 h-16 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center">
        <Music2 className="h-8 w-8 text-white/40" />
      </div>
    </div>
    <h3 
      className="text-lg font-semibold text-white/80 mb-1"
      style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}
    >
      No shows match this filter
    </h3>
    <p className="text-sm text-white/50">
      Try selecting a different time period
    </p>
  </div>
) : (
  // Existing show list
)}
```

---

### 6. Update Filter Bar Styling

Match the filter bar to the Scene aesthetic:

```typescript
// Select dropdown styling
<Select ...>
  <SelectTrigger className="w-[140px] bg-white/[0.05] border-white/[0.08] text-white/80">

// Sort button styling  
<Button
  variant="outline"
  size="sm"
  className="bg-white/[0.05] border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white"
>
```

---

## Files to Create/Edit

| File | Changes |
|------|---------|
| `src/components/rankings/SwipeableRankingCard.tsx` | **NEW** - Swipeable card wrapper with delete gesture |
| `src/components/Home.tsx` | Update `renderRankingsView()` with glassmorphism styling, larger thumbnails, empty state, renamed header, integrate SwipeableRankingCard |

## Visual Summary

```text
Before:                              After:
┌──────────────────────┐            ┌──────────────────────────┐
│ [img] Artist       X │            │ ┌────┐ Artist            │  ← Glass background
│       Venue          │            │ │img │ Venue              │     Larger thumbnail
│       Date     [#3]  │            │ │80px│ Date         [#3]  │     Glowing text
└──────────────────────┘            │ └────┘                    │     No X button
                                    └──────────────────────────┘
                                             ← Swipe left reveals delete
```

## Component Structure

```text
renderRankingsView()
├── Filter Bar (glassmorphism styled)
├── Empty State (when sortedShows.length === 0)
└── Show List
    └── SwipeableRankingCard (for each show)
        ├── Delete Background (revealed on swipe)
        └── Card Content (glassmorphism styled)
            ├── 80px Thumbnail
            ├── Show Details (glowing text)
            ├── Instagram Share Button
            └── ShowRankBadge
```

