

# Interactive Spotlight Tour Implementation Plan

## Overview
Implement Phase 2 of the onboarding experience: an Interactive Spotlight Tour using `react-joyride` that guides new users through the core navigation elements of the Scene app immediately after the Welcome Carousel completes.

## Tour Steps Breakdown

| Step | Target | Message |
|------|--------|---------|
| 1 | FAB (+) button | "Tap here to log your first show" |
| 2 | Add From Photos button | "Upload multiple shows at once by adding 1 photo per show" |
| 3 | Add Single Show button | "No Photo? Add by artist/venue" |
| 4 | Rank nav button | "Rank shows against each other" |
| 5 | Rankings/Shows link | "See all your shows ranked in order" |
| 6 | Share to Instagram button | "Add your show review to your photo and share to Instagram or send to friends" |
| 7 | Globe nav button | "See everywhere you've been" |
| 8 | Scale nav button | "Your personal rankings live here" |

## Technical Implementation

### 1. Install react-joyride dependency
Add `react-joyride` to package.json for the guided tour functionality.

### 2. Create SpotlightTour Component
New file: `src/components/onboarding/SpotlightTour.tsx`

**Component responsibilities:**
- Accept `run` prop to control tour activation
- Accept `onComplete` callback for when tour finishes
- Define tour steps with glassmorphism-styled tooltips matching Scene aesthetic
- Handle FAB menu opening automatically when reaching step 2/3
- Target elements using `data-tour` attributes

**Glassmorphism tooltip styling:**
```text
+----------------------------------+
|  bg-black/40 backdrop-blur-xl    |
|  border border-white/20          |
|  rounded-xl shadow-2xl           |
|  Text with Scene glow effects    |
+----------------------------------+
```

### 3. Add data-tour attributes to Dashboard.tsx
Target elements need identification for react-joyride:

| Element | Attribute |
|---------|-----------|
| FAB button | `data-tour="fab"` |
| Add from Photos button | `data-tour="add-photos"` |
| Add Single Show button | `data-tour="add-single"` |
| Rank nav button | `data-tour="nav-rank"` |
| Globe nav button | `data-tour="nav-globe"` |

### 4. Add data-tour attributes to Home.tsx
For the rankings view target:
| Element | Attribute |
|---------|-----------|
| Rankings section header/link | `data-tour="shows-ranked"` |

### 5. Add data-tour attributes to ShowReviewSheet.tsx
For the share button:
| Element | Attribute |
|---------|-----------|
| Share to Instagram button | `data-tour="share-instagram"` |

### 6. Update onboarding state machine in Dashboard.tsx

**Current flow:**
```text
welcome_carousel -> completed
```

**New flow:**
```text
welcome_carousel -> spotlight_tour -> completed
```

**State changes:**
- Add `showSpotlightTour` state
- When carousel completes, set `onboarding_step` to `spotlight_tour` and trigger tour
- When tour completes, set `onboarding_step` to `completed`
- Need to ensure FAB menu opens programmatically when tour reaches step 2

### 7. Subtle pulse animation on targets
Add CSS keyframes for a subtle glowing pulse effect on tour targets:
- Use `box-shadow` animation with primary color
- 2-second cycle, gentle opacity pulsing

## Files to Create/Modify

| File | Action | Changes |
|------|--------|---------|
| `package.json` | Modify | Add `react-joyride` dependency |
| `src/components/onboarding/SpotlightTour.tsx` | Create | New component with tour logic and glassmorphism tooltips |
| `src/pages/Dashboard.tsx` | Modify | Add tour state, data-tour attributes, integrate SpotlightTour component |
| `src/components/Home.tsx` | Modify | Add data-tour attribute to rankings section |
| `src/components/ShowReviewSheet.tsx` | Modify | Add data-tour attribute to Share to Instagram button |
| `src/index.css` | Modify | Add pulse animation keyframes for tour targets |

## Tour Flow Logic

```text
User completes Welcome Carousel
         |
         v
Dashboard sets onboarding_step = 'spotlight_tour'
         |
         v
SpotlightTour mounts with run=true
         |
         v
Step 1: Highlight FAB -> User sees "Tap here to log your first show"
         |
         v
Step 2: Programmatically open FAB menu, highlight Add Photos
         |
         v
Step 3: Highlight Add Single Show
         |
         v
Step 4: Close FAB menu, highlight Rank nav
         |
         v
Step 5: Highlight rankings section (or skip if not visible)
         |
         v
Step 6: Open a sample show review sheet, highlight Share button
         |
         v
Step 7: Highlight Globe nav
         |
         v
Step 8: Highlight Scale nav
         |
         v
Tour complete -> set onboarding_step = 'completed'
```

## Simplified Alternative Approach

Given the complexity of opening sheets/dialogs mid-tour, a simpler approach focusing only on the persistent navigation elements:

| Step | Target | Message |
|------|--------|---------|
| 1 | FAB (+) button | "Tap here to log your first show" |
| 2 | Globe nav | "See everywhere you've been" |
| 3 | Rank nav (Scale) | "Your personal rankings live here" |

This ensures all targets are always visible and the tour runs smoothly without needing to programmatically open menus or sheets.

## Styling Details

**Tooltip component customization:**
- Background: `bg-black/60 backdrop-blur-xl`
- Border: `border border-white/20`
- Border radius: `rounded-xl`
- Shadow: `shadow-2xl` with primary color glow
- Text: White with subtle textShadow glow effect
- Buttons: Primary gradient styling matching Scene CTA buttons
- Arrow: Styled to match glassmorphism theme

**Spotlight overlay:**
- Dark overlay with ~60% opacity
- Primary color glow around target element
- Subtle pulsing animation on the target

