

# Fix: Spotlight Tour Step 1 - FAB Button Visibility & Tap-to-Advance

## Problem Analysis

Looking at the screenshot, the FAB button (blue circle with +) is completely hidden behind the dark overlay. The spotlight creates a "hole" but the actual button isn't visible through it.

**Root Causes:**

1. **Z-Index Issue**: The react-joyride overlay uses `zIndex: 10000`. Although we added `z-[10001]` to the FAB when `showSpotlightTour` is true, the parent container `fixed bottom-6...` has `z-50` which creates a stacking context that traps the FAB's higher z-index inside it.

2. **Stacking Context Hierarchy**:
   ```
   Joyride overlay (z-index: 10000)
   └── Fixed nav container (z-index: 50) ← Creates stacking context
       └── FAB container (z-index: 10001) ← Trapped inside parent's z-50
           └── FAB button (z-index: 10001) ← Still behind overlay!
   ```

3. **spotlightClicks is disabled**: Currently set to `false`, which prevents users from tapping the highlighted element.

## Solution

### 1. Fix Z-Index Stacking Context

The **parent fixed container** (line 184) also needs elevated z-index during the tour:

```tsx
<div className={cn(
  "fixed bottom-6 left-0 right-0 flex justify-between items-end px-6 gap-4",
  showSpotlightTour ? "z-[10001]" : "z-50"
)}>
```

### 2. Enable Spotlight Clicks for Tap-to-Advance

In SpotlightTour.tsx, change:
```tsx
spotlightClicks={false}  →  spotlightClicks={true}
```

This allows users to tap the highlighted UI element to interact with it.

### 3. Handle Step Advancement on User Interaction

Since users will tap the FAB to advance, we need to:
- Listen for FAB click during tour
- Programmatically advance to next step when FAB is tapped
- Use Joyride's controlled mode with `stepIndex` state

### 4. Simplify Step 1 to Just FAB

For Step 1, only show the FAB with pulsing glow. The user taps it to open the menu, which naturally leads to Step 2.

## Files to Modify

| File | Changes |
|------|---------|
| `src/pages/Dashboard.tsx` | Elevate parent fixed container z-index during tour; pass `onFabClick` callback to SpotlightTour |
| `src/components/onboarding/SpotlightTour.tsx` | Enable `spotlightClicks`, use controlled `stepIndex`, advance step when user interacts |

## Implementation Details

### Dashboard.tsx Changes

**Line 184 - Fixed Nav Container:**
```tsx
<div className={cn(
  "fixed bottom-6 left-0 right-0 flex justify-between items-end px-6 gap-4",
  showSpotlightTour ? "z-[10001]" : "z-50"
)}>
```

**FAB Button onClick - Advance Tour:**
```tsx
onClick={() => {
  setShowFabMenu(!showFabMenu);
  // If tour is on step 1 (FAB), opening menu advances to step 2
}}
```

### SpotlightTour.tsx Changes

**Enable spotlightClicks:**
```tsx
spotlightClicks={true}
```

**Use controlled step index:**
```tsx
const [stepIndex, setStepIndex] = useState(0);

// In callback, advance based on user actions
const handleCallback = (data: CallBackProps) => {
  const { status, action, type } = data;
  
  if (action === "next" || type === "step:after") {
    setStepIndex(prev => prev + 1);
  }
  
  // ... rest of logic
};

<Joyride
  stepIndex={stepIndex}
  // ...
/>
```

### Spotlight Pulse Animation

The existing CSS animation in `index.css` is correct:
```css
@keyframes spotlight-pulse {
  0%, 100% {
    box-shadow: 0 0 0 4px hsl(189 94% 55% / 0.8), 0 0 30px...;
  }
  50% {
    box-shadow: 0 0 0 8px hsl(189 94% 55% / 0.6), 0 0 40px...;
  }
}
```

## Step 1 Expected Behavior

1. Dark overlay covers entire screen
2. FAB button (blue circle with +) is visible through spotlight hole
3. Pulsing cyan glow animates around the FAB
4. Tooltip appears to the left: "Tap here to log your first show"
5. User taps the FAB → Menu opens → Tour advances to Step 2

## Summary of Changes

| Element | Current | Fixed |
|---------|---------|-------|
| Fixed nav container | `z-50` | `z-[10001]` when tour active |
| spotlightClicks | `false` | `true` |
| Tour mode | Uncontrolled | Controlled with `stepIndex` |

