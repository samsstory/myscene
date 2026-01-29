
# Fix Winner/Loser Animation Behavior

## Problem Analysis
The animations aren't working correctly because:

1. **Animation conflicts**: The slide-in animations (`slide-in-left`, `slide-in-right`) use `transform: translateX()` while winner/loser animations use `transform: scale()`. When both are applied, they override each other.

2. **Opacity override**: The inline `style={{ opacity: 0 }}` always sets opacity to 0, which interferes with the animation states.

3. **Animation class stacking**: Tailwind applies both slide-in AND winner/loser animation classes simultaneously, causing conflicts.

## Solution

### 1. Separate Animation States
Only apply slide-in animations when loading a new pair. Only apply winner/loser animations after selection.

### 2. Update Keyframes
- **winner-glow**: Keep scale effect but add green glow via boxShadow (no translateX)
- **loser-shrink**: Fade and shrink in place (no translateX)

### 3. Update RankingCard Component Logic
- Remove slide-in animation class when `isWinner` or `isLoser` is true
- Remove the inline `opacity: 0` style when winner/loser animations are active
- Only apply one animation type at a time (slide-in OR winner/loser)

## Files to Modify

### tailwind.config.ts
Keep the current keyframes as they are correctly defined. The issue is in the component logic.

### src/components/rankings/RankingCard.tsx
Update the className and style logic:

```tsx
// Current problematic code:
className={cn(
  "...",
  slideAnimation,  // Always applied
  isWinner && "animate-winner-glow z-10",  // Also applied when winner
  isLoser && "animate-loser-shrink"        // Also applied when loser
)}
style={{ opacity: 0 }}  // Always 0!
```

Change to:
```tsx
// Fixed logic - mutually exclusive animations:
const shouldSlideIn = !isWinner && !isLoser;

className={cn(
  "flex-1 text-left cursor-pointer transition-all duration-200",
  "hover:scale-[1.02] active:scale-[0.98]",
  "disabled:pointer-events-none",
  // Only apply slide-in when NOT in winner/loser state
  shouldSlideIn && slideAnimation,
  shouldSlideIn && position === "right" && "[animation-delay:150ms]",
  // Apply winner/loser animations exclusively
  isWinner && "animate-winner-glow z-10",
  isLoser && "animate-loser-shrink"
)}
style={{
  // Only set initial opacity to 0 for slide-in animation
  opacity: shouldSlideIn ? 0 : undefined,
}}
```

## Expected Behavior After Fix

1. **New pair loads**: Cards slide in from left/right with staggered timing
2. **User taps winner**: 
   - Winner card: Green glow appears, slight scale-up pulse, stays in place
   - Loser card: Immediately starts fading out and shrinking in place
3. **Next pair loads**: Both cards slide in fresh
