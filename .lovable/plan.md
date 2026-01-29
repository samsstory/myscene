
# Fix: FAB Button Not Visible in Spotlight Tour

## Problem Analysis

The FAB button is not visible inside the spotlight because of a **z-index stacking context conflict**:

1. **React-joyride overlay** uses `zIndex: 10000`
2. **FAB container** has `z-50` (which equals 50 in Tailwind)
3. The spotlight creates a visual "hole" in the overlay, but the **target element must render ABOVE the overlay** to be seen through that hole
4. Since 50 < 10000, the FAB renders behind the dark overlay and is invisible

The gray area visible in the spotlight is actually the underlying page content bleeding through - not the FAB button.

## Solution

Increase the FAB button's z-index to be higher than the Joyride overlay (10000) when the spotlight tour is active.

### Approach: Conditional Z-Index During Tour

Pass a prop or use a CSS class to elevate the FAB's z-index only when the tour is running:

```text
Normal state:    FAB z-index = 50
Tour active:     FAB z-index = 10001 (above overlay)
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Add conditional z-index class to FAB button when `showSpotlightTour` is true |

## Implementation Details

### Dashboard.tsx Changes

Update the FAB button container and button to use a higher z-index when the tour is running:

**Container div** (line 235):
```tsx
<div className={cn("relative", showSpotlightTour && "z-[10001]")}>
```

**FAB Button** (line 280-289):
```tsx
<button
  onClick={() => setShowFabMenu(!showFabMenu)}
  data-tour="fab"
  className={cn(
    "backdrop-blur-xl bg-primary/90 border border-white/30 text-primary-foreground rounded-full p-5 shadow-2xl transition-all hover:scale-105 active:scale-95",
    showSpotlightTour ? "z-[10001]" : "z-50",
    showFabMenu && "rotate-45 bg-white/20"
  )}
>
```

### Alternative: Also Elevate FAB Menu Items

When steps 2-3 target the FAB menu options, those buttons also need elevated z-index:

**Add from Photos button** (line 247):
```tsx
className={cn(
  "flex items-center gap-3 bg-card border border-border rounded-full pl-4 pr-5 py-3 shadow-lg hover:bg-accent transition-colors animate-in fade-in slide-in-from-bottom-2",
  showSpotlightTour && "z-[10001]"
)}
```

**Add Single Show button** (line 262):
```tsx
className={cn(
  "flex items-center gap-3 bg-card border border-border rounded-full pl-4 pr-5 py-3 shadow-lg hover:bg-accent transition-colors animate-in fade-in slide-in-from-bottom-2",
  showSpotlightTour && "z-[10001]"
)}
```

### FAB Menu Container

Also elevate the menu options container when tour is active:

**Menu Options div** (line 245):
```tsx
<div className={cn(
  "absolute bottom-16 right-0 flex flex-col gap-3 items-end",
  showSpotlightTour ? "z-[10001]" : "z-50"
)}>
```

## Summary of Changes

| Element | Current Z-Index | Tour Active Z-Index |
|---------|-----------------|---------------------|
| FAB container div | `relative` | `relative z-[10001]` |
| FAB button | `z-50` | `z-[10001]` |
| Menu options container | `z-50` | `z-[10001]` |
| Add from Photos button | none | `z-[10001]` |
| Add Single Show button | none | `z-[10001]` |

This ensures all tour target elements render above the Joyride overlay (z-index 10000) while maintaining normal z-index behavior when the tour is not active.
