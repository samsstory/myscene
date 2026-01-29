

# WelcomeCarousel Mockup Update Plan

## Overview
Replace the current placeholder visuals in the WelcomeCarousel with cropped, straight (no tilt) versions of the existing landing page mockups. Each mockup will be tightly framed to show only the most critical UI elements.

## Slide-by-Slide Implementation

### Slide 1: "Never forget a show"
**Source**: LandingHero.tsx `MockShowCard` component

**What to show** (based on your cropping reference):
- Scene logo header
- Fred again.. expanded show card (#1 All Time)
- Stacked collapsed cards (Odesza through T-Pain)
- No bottom navigation bar (cropped out)

**Cropping approach**:
- Show from header down through the stacked cards
- Exclude the bottom nav pill + FAB to focus on the show collection

---

### Slide 2: "Rate and rank your top moments"  
**Source**: CaptureShowcase.tsx `ShowReviewMockup` component

**What to show** (based on your cropping reference):
- Scene logo watermark on photo
- Rufus Du Sol hero image with glass metadata bar
- "HOW IT FELT" rating bars (Show, Sound, Lighting, Crowd, Vibe)
- Notes quote card
- No header navigation, no bottom nav (cropped out)

**Cropping approach**:
- Start from the photo section (below dynamic island area)
- Show through the notes quote
- Exclude action buttons and bottom nav

---

### Slide 3: "Share and compare your stories"
**Source**: ShareExperience.tsx `StoryMockup` component

**What to show** (based on your cropping reference):
- Instagram story header (@jamie__xx speechless..)
- Jamie xx photo with light trussing
- Glass overlay card (#3 All Time, rating bar, score)
- No Scene logo footer (cropped out)

**Cropping approach**:
- Full-height Instagram story feel
- Focus on the photo + overlay card area
- Show the caption text at top

---

## Technical Implementation

### Component Structure
Create inline mockup components within WelcomeCarousel that:
1. Replicate the exact UI from landing page mockups
2. Use `overflow-hidden` containers to crop
3. Apply no rotation (unlike PhoneMockup's tilt prop)
4. Size appropriately for the carousel aspect ratio (4:3)

### Visual Container
```text
+------------------------+
|   Cropped mockup area  |
|   (4:3 aspect ratio)   |
|   rounded corners      |
|   subtle shadow        |
+------------------------+
```

- **Container**: `rounded-2xl overflow-hidden shadow-2xl` with subtle border glow
- **No phone chrome**: Direct UI content without device frame
- **Aspect ratio**: Maintain 4:3 for consistent slide layout

### Files to Modify
| File | Changes |
|------|---------|
| `src/components/onboarding/WelcomeCarousel.tsx` | Replace placeholder visuals with cropped mockup components |

### Code Changes

The slide visual rendering will be replaced with inline components that mirror the landing page mockups but are cropped to show only the critical UI:

**Slide 1 mockup**: Stacked cards from header to last collapsed card
- Reuse collapsedCards data structure
- Fred again.. expanded card with photo
- Stack of 5 collapsed artist cards

**Slide 2 mockup**: Review sheet content only
- 16:10 hero photo with Rufus Du Sol
- Glass metadata overlay
- Rating bars section with cyan-to-coral gradients
- Notes quote card

**Slide 3 mockup**: Instagram story share
- Full-bleed Jamie xx concert photo
- @jamie__xx speechless.. caption
- Glass overlay with ranking + score

Each mockup will be wrapped in a container with:
- `aspect-[4/3]` to match existing layout
- `rounded-2xl overflow-hidden` for clean edges
- Subtle `boxShadow` with primary color glow

