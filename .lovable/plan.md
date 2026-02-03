
# Ranking Section Mockup Redesign

## Objective
Transform the Ranking section from an analytical, gamified UI into an emotional, memory-driven experience that communicates Scene's core mechanic: simple instinctive choices that reveal taste without effort.

---

## Changes Overview

### 1. Copy Updates

**Headline** (already implemented - needs line break)
```
Choose your favorite.
We'll do the ranking.
```
- Add line break between the two sentences using `<br />` or separate elements

**Subheadline** (already implemented - no changes needed)
```
No scores. No overthinking. Just choose the show you loved more.
```

**New: Micro-prompt above cards**
```
Which night meant more?
```
- Styled as light, secondary copy (small, muted color)
- Positioned above the comparison cards inside the phone mockup

---

### 2. Remove Analytical UI Elements

Remove from the phone mockup:
- **Progress bar** (lines 109-113) - the cyan progress indicator
- **MiniRatingBar component** (lines 6-22) - entire component can be removed
- **Ratings display in ShowCard** (lines 70-76) - the sound/crowd/lighting bars
- **Notes section in ShowCard** (lines 78-81) - the quoted notes

Remove from data:
- `ratings` object from show data
- `notes` field from show data

---

### 3. Simplified ShowCard Component

Each card will show only:
| Element | Style |
|---------|-------|
| Large photo | Primary focus, larger aspect ratio (e.g., 3:4 or 1:1 for more immersion) |
| Artist name | White, semibold, slightly larger |
| Venue + City | Muted, small |
| Date | Muted, small (same line as venue) |

Update show data to include city:
- Left: "The Gorge, WA"
- Right: "Red Rocks, CO"

---

### 4. VS Indicator Styling

Current: `w-10 h-10` with gradient background and bold text
Updated:
- Smaller size: `w-8 h-8`
- Subtler styling: reduce border opacity, softer glow
- Smaller text: `text-[10px]`
- Keep the VS but make it feel like a gentle separator, not a competition badge

---

### 5. Interaction Cue Update

Current text: "Tap to choose the winner"
New text: "Tap the show you loved more"

Styling:
- Small (`text-[10px]`)
- Neutral/muted (`text-white/30`)
- Reassuring, not instructional

---

### 6. Visual Hierarchy in Phone Mockup

Final order (top to bottom):
1. Scene logo (keep as is)
2. **Micro-prompt**: "Which night meant more?" - new addition
3. **Comparison cards** - larger, cleaner, more immersive
4. **Interaction hint**: "Tap the show you loved more" - subtle

---

## Technical Implementation

### Files to Modify
- `src/components/landing/v2/RankingSpotlightV2.tsx`

### Code Changes

1. **Delete `MiniRatingBar` component** (lines 5-22)

2. **Simplify show data** (lines 24-48)
   - Remove `ratings` and `notes` fields
   - Add `city` field to venue

3. **Redesign `ShowCard` component** (lines 50-83)
   - Larger photo (change aspect ratio to 1:1 or 4:5)
   - Remove ratings section
   - Remove notes section
   - Display venue with city
   - Cleaner, more minimal card styling

4. **Update `RankingMockup` component** (lines 85-146)
   - Remove progress bar (lines 109-113)
   - Add micro-prompt "Which night meant more?" above cards
   - Make VS badge smaller and subtler
   - Update interaction hint text

5. **Update headline in outer section** (lines 166-168)
   - Add line break between sentences

---

## Expected Result

The mockup will feel like comparing two memories side-by-side:
- Clean, photo-forward cards
- No analytical data (ratings, progress, categories)
- Subtle VS indicator
- Gentle interaction prompt
- Calm, confident, effortless emotional tone

This aligns with the design philosophy: "revealing taste without effort."
