

# Landing Page Copy & Section Overhaul

## Overview
This plan transforms the landing page to clearly communicate the three value props (Capture → Rank → Share) with improved copy, a new globe section, and better messaging that connects emotionally with music lovers.

---

## Section Order

```text
LandingHero → CaptureShowcase → RankingSpotlight → ShareExperience → GlobeShowcase → LandingCTA
```

---

## Section 1: LandingHero

### Changes

**Headline:**
```
Before: "Your concert memories, beautifully curated, ranked, and shared."
After: "Your love of concerts deserves more than a ticket stub."
```

**Subhead:**
```
Before: "The app for music lovers who want more than a ticket stub."
After: "The app to capture, review, rank, and share your favorite music memories."
```

**Buttons:** Keep as-is ("Get Started" / "View Demo")

---

## Section 2: CaptureShowcase

### Changes

**Headline:**
```
Before: "Your concert history, ranked."
After: "Every show. One place."
```

**Subhead:**
```
Before: "Every show you've ever been to, beautifully organized..."
After: "Never forget who opened for who, which venue had the best sound, or what night changed everything."
```

**Phone Mockup:** Replace ranked list with **Show Review Sheet** mockup

The Show Review Sheet displays:
- 4:3 hero photo with concert image
- Glass metadata bar (artist name, venue, date, score badge)
- Compact rating bars (Show, Sound, Lighting, Crowd, Vibe)
- Notes quote card
- **"Compare with friends" button**
- "Share to Instagram" button

**Feature List (benefit-driven):**
```
• Never forget who opened for who
• Rate every detail — sound, lighting, crowd, vibe
• Add photos that capture the moment
• Your personal concert archive, always with you
```

---

## Section 3: RankingSpotlight

### Changes

**Headline:** Keep as-is
```
"Your #1 show, proven."
```

**Subhead:**
```
Before: "Forget arbitrary star ratings. Scene uses head-to-head comparisons..."
After: "Finally answer: what's my all-time #1 show? Head-to-head picks reveal your true feelings."
```

**Second paragraph:**
```
"The more you compare, the more accurate your rankings become."
```

**Coming Soon Teaser:** Keep "Compare with friends"

---

## Section 4: ShareExperience

### Changes

**Headline:**
```
Before: "Made for stories."
After: "Share and compare."
```

**Subhead:**
```
Before: "Your best concert moments, ready to share..."
After: "Share your ratings, reviews, and rankings on social."
```

**Feature List:** Single item only
```
• Compare ratings with your friends (coming soon)
```

---

## Section 5: GlobeShowcase (NEW)

### Layout
- Two-column grid (matches other sections)
- Phone mockup on LEFT (tilt="left")
- Copy on RIGHT
- Placed after ShareExperience, before final CTA

### Phone Mockup Content
Display a simplified version of the MapView globe with:
- Dark Mapbox-style world map
- Glowing dots/bubbles at various cities (NYC, LA, London, Austin, Chicago)
- "5 countries · 12 cities" stat overlay
- SCENE logo in header

### Copy

**Headline:**
```
"Your global music life."
```

**Subhead:**
```
"See everywhere music has taken you."
```

**Feature bullets:** None (removed)

---

## Section 6: LandingCTA

### Changes

**Headline:**
```
Before: "Start building your concert legacy."
After: "Your love for music deserves to be remembered."
```

**Subhead:** Delete entirely

**Button Text:**
```
"Add my first show"
```

---

## Technical Implementation

### Files to Modify

**1. `src/components/landing/LandingHero.tsx`**
- Update headline: "Your love of concerts deserves more than a ticket stub."
- Update subhead: "The app to capture, review, rank, and share your favorite music memories."

**2. `src/components/landing/CaptureShowcase.tsx`**
- Replace `TopRankedMockup` with new `ShowReviewMockup`
- Update headline: "Every show. One place."
- Update subhead: "Never forget who opened for who, which venue had the best sound, or what night changed everything."
- Update feature bullets (benefit-driven)
- New mockup displays:
  - 4:3 concert photo
  - Glass metadata bar with artist, venue, date, score
  - Compact rating bars (Show, Sound, Lighting, Crowd, Vibe)
  - Notes quote
  - **"Compare with friends" button**
  - Instagram share button

**3. `src/components/landing/RankingSpotlight.tsx`**
- Update subhead: "Finally answer: what's my all-time #1 show? Head-to-head picks reveal your true feelings."
- Update second paragraph: "The more you compare, the more accurate your rankings become."

**4. `src/components/landing/ShareExperience.tsx`**
- Update headline: "Share and compare."
- Update subhead: "Share your ratings, reviews, and rankings on social."
- Keep only one feature bullet: "Compare ratings with your friends (coming soon)"

**5. Create `src/components/landing/GlobeShowcase.tsx` (NEW)**
- New component with globe mockup
- Static illustration of world map with glowing city markers
- Headline: "Your global music life."
- Subhead: "See everywhere music has taken you."
- No feature bullets
- Uses PhoneMockup component with tilt="left"

**6. `src/pages/Index.tsx`**
- Import and add GlobeShowcase after ShareExperience
- Order: LandingHero → CaptureShowcase → RankingSpotlight → ShareExperience → GlobeShowcase → LandingCTA

**7. `src/components/landing/LandingCTA.tsx`**
- Update headline: "Your love for music deserves to be remembered."
- Remove subhead entirely
- Update button text: "Add my first show"

---

## Visual Summary

```text
┌─────────────────────────────────────────────────────┐
│                     HERO                            │
│  "Your love of concerts deserves more than a        │
│   ticket stub."                                     │
│  "The app to capture, review, rank, and share       │
│   your favorite music memories."                    │
│  [Phone: Stacked show cards]                        │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                 CAPTURE SHOWCASE                    │
│  "Every show. One place."                           │
│  [Phone: Show Review Sheet with photo + ratings     │
│   + Compare with friends button]                    │
│  • Never forget who opened for who                  │
│  • Rate every detail                                │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                RANKING SPOTLIGHT                    │
│  "Your #1 show, proven."                            │
│  [Phone: Head-to-head VS comparison]                │
│  Finally answer: what's my all-time #1 show?        │
│  Head-to-head picks reveal your true feelings.      │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                SHARE EXPERIENCE                     │
│  "Share and compare."                               │
│  [Phone: Instagram story mockup]                    │
│  Share your ratings, reviews, and rankings on       │
│  social.                                            │
│  • Compare ratings with your friends (coming soon)  │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                 GLOBE SHOWCASE                      │
│  "Your global music life."                          │
│  [Phone: World map with glowing city markers]       │
│  See everywhere music has taken you.                │
└─────────────────────────────────────────────────────┘
                         ↓
┌─────────────────────────────────────────────────────┐
│                      CTA                            │
│  "Your love for music deserves to be remembered."   │
│  [Add my first show]                                │
└─────────────────────────────────────────────────────┘
```

