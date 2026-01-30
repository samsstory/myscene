

# Plan: Fix Step 5 to Focus on "Shows" Stat Pill with Floating Target

## Overview
Step 5 of the spotlight tour currently targets `[data-tour="stat-shows"]` which highlights the "Shows" stat pill in the home page. However, there are two issues:
1. **Bug**: The `data-tour` attribute is not being applied because the condition checks for `id === 'shows'` but the actual pill id is `'total-shows'`
2. **Visibility**: Similar to Step 4 (Rank icon), the stat pill may appear muted behind the overlay and needs a FloatingTourTarget treatment to be bright and visible

## Technical Details

### Files to Modify

#### 1. `src/components/home/StatPills.tsx`
- Fix the `data-tour` attribute condition from `stat.id === 'shows'` to `stat.id === 'total-shows'`
- Add a prop to track when the tour is active on this step so we can hide the original during Step 5 (similar to how we handled the Rank icon)
- Accept a `ref` for the Shows pill so Dashboard can measure its position

#### 2. `src/pages/Dashboard.tsx`
- Add a ref (`showsStatRef`) to track the position of the "Shows" stat pill
- Pass tour state down to the Home/StatPills component to enable the hide/show behavior during Step 5
- Add a `FloatingTourTarget` for Step 5 (index 4) that renders a bright, glowing clone of the "Shows" stat pill above the overlay
- The floating target will use a portal to escape stacking contexts (the proven pattern from Step 4)

#### 3. `src/components/Home.tsx`
- Accept tour-related props to pass down to StatPills
- Forward the ref and tour state for the Shows pill

#### 4. `src/components/onboarding/SpotlightTour.tsx`
- Ensure Step 5 copy is appropriate (currently: "See all your shows ranked in order")

### Implementation Approach

```text
Step 5 Visibility Pattern (matching Step 4 solution):

+----------------------------------+
|      Dark Joyride Overlay        |
|      z-index: 10000              |
|                                  |
|    +------------------------+    |
|    |  Spotlight "hole"      |    |
|    |  (transparent center)  |    |
|    +------------------------+    |
|                                  |
+----------------------------------+
            ↑
   FloatingTourTarget (Portal to body)
   z-index: 10002
   - Bright cyan-glowing "Shows" pill clone
   - Positioned via getBoundingClientRect
   - Takes data-tour="stat-shows" during Step 5
```

### Visual Design for Floating Shows Pill
- Render a simplified pill with:
  - Music icon in cyan with glow effect
  - "SHOWS" label
  - Show count value
  - Double-layered drop-shadow using `--primary` HSL variable
  - Same glassmorphism styling as original

### Step Behavior
- User does NOT need to tap the pill to advance
- This is an informational step (user clicks "Next" button on tooltip)
- The floating clone is purely for visibility above the overlay

## Summary of Changes

| File | Change |
|------|--------|
| `StatPills.tsx` | Fix `data-tour` condition; add optional `showsTourActive` + `showsRef` props |
| `Home.tsx` | Forward tour props to StatPills |
| `Dashboard.tsx` | Add `showsStatRef`, render `FloatingTourTarget` for Step 5 |
| `SpotlightTour.tsx` | No changes needed (Step 5 config already correct) |

