

# Landing Page Redesign: Scene

## Core Positioning

**Headline**: "Your concert memories, beautifully curated, ranked, and shared"

**Tagline**: "Log every show. Rank your favorites. Share the moments that mattered."

---

## Visual Direction (Inspired by Lapse)

| Element | Approach |
|---------|----------|
| **Background** | Deep dark gradient matching app (HSL 222 47% 6%) |
| **Typography** | Bold, clean, luminous white text with subtle glow effects |
| **Phone Mockups** | Hands holding phones showing app - authentic, lifestyle feel |
| **Color Accents** | Electric cyan primary, coral/amber secondary |
| **Cards** | Glassmorphism containers (bg-white/[0.03], backdrop-blur) |

---

## Page Structure

### Section 1: Hero (Above the Fold)

**Layout**: Left-aligned text with hand-held phone mockup on right

| Element | Details |
|---------|---------|
| **Logo** | "SCENE" with signature sparkle glow and tracking |
| **Headline** | "Your concert memories, beautifully curated, ranked, and shared" |
| **Subheadline** | "The app for music lovers who want more than a ticket stub." |
| **CTAs** | Primary: "Get Started" (shadow-glow), Secondary: "View Demo" (outline) |
| **Phone Mockup** | Hand holding phone showing the stacked show cards UI |

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│  SCENE ✦                                           [Get Started]        │
│                                                                         │
│                                                                         │
│  Your concert memories,                    ╭────────────────────╮       │
│  beautifully curated,                      │   🖐️               │       │
│  ranked, and shared.                       │  ╭────────────╮    │       │
│                                            │  │   #1       │    │       │
│  The app for music lovers                  │  │ Fred Again │    │       │
│  who want more than a                      │  │ Ally Pally │    │       │
│  ticket stub.                              │  │  Scene ✦   │    │       │
│                                            │  ╰────────────╯    │       │
│  [Get Started]  [View Demo]                ╰────────────────────╯       │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Section 2: Three Value Pillars

**Layout**: Three columns with phone mockups and minimal text

| Pillar | Visual | Headline | Description |
|--------|--------|----------|-------------|
| **Curate** | Hand holding phone showing show card feed | "Capture every show" | "Log artists, venues, dates, and your ratings. Add photos to remember the night." |
| **Rank** | Phone showing head-to-head "VS" comparison | "Rank them head-to-head" | "Which show was better? Build your true #1 through quick comparisons." |
| **Share** | Phone showing Instagram story with overlay | "Share the memories" | "Create stunning story overlays with your ratings and Scene watermark." |

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│     ╭──────────╮        ╭──────────╮        ╭──────────╮               │
│     │  📱 Feed │        │  📱 VS   │        │  📱 Story│               │
│     ╰──────────╯        ╰──────────╯        ╰──────────╯               │
│                                                                         │
│   Capture every show   Rank them head-   Share the memories            │
│   ─────────────────    to-head           ────────────────              │
│   Log artists, venues, ─────────────     Create stunning               │
│   dates, and your      Which show was    story overlays...            │
│   ratings...           better? Build                                   │
│                        your true #1...                                 │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Section 3: The Ranking Feature (Hero Moment)

This section spotlights the **unique differentiator** - the head-to-head ranking system.

| Element | Details |
|---------|---------|
| **Headline** | "Your #1 show, proven." |
| **Description** | "Forget arbitrary star ratings. Scene uses head-to-head comparisons to build your true power ranking. After a few quick 'this or that' choices, you'll know exactly which shows topped your list." |
| **Visual** | Large mockup of the ranking interface with "VS" badge |
| **Teaser Badge** | Glass pill: "Coming soon: Compare with friends" |

```text
┌─────────────────────────────────────────────────────────────────────────┐
│                                                                         │
│                    Your #1 show, proven.                                │
│                                                                         │
│     Forget arbitrary star ratings. Scene uses head-to-head              │
│     comparisons to build your true power ranking.                       │
│                                                                         │
│         ╭────────────────────────────────────────────╮                  │
│         │      ╭─────────╮    VS    ╭─────────╮     │                  │
│         │      │ Odesza  │          │ Rufus   │     │                  │
│         │      │ Gorge   │          │ Red Rox │     │                  │
│         │      ╰─────────╯          ╰─────────╯     │                  │
│         ╰────────────────────────────────────────────╯                  │
│                                                                         │
│                  ┌─────────────────────────────────┐                    │
│                  │ ✨ Coming soon: Compare with friends │               │
│                  └─────────────────────────────────┘                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

### Section 4: The Share Experience

Show the Instagram story creation flow.

| Element | Details |
|---------|---------|
| **Headline** | "Made for stories" |
| **Description** | "Every show becomes shareable content. Scene overlays your rating, rank, and details on your concert photos — ready for Instagram in one tap." |
| **Visual** | Hand holding phone with finished story overlay visible |

---

### Section 5: Final CTA

Full-width gradient section with strong call to action.

| Element | Details |
|---------|---------|
| **Headline** | "Start building your concert legacy" |
| **Subtext** | "Free to use. No account needed to explore." |
| **CTA Button** | Large "Get Started" with shadow-glow |
| **Footer Links** | Privacy, Terms, Contact |

---

## Technical Implementation

### Files to Create

| File | Purpose |
|------|---------|
| `src/pages/Index.tsx` | **Modify** - Complete redesign orchestrating all sections |
| `src/components/landing/LandingHero.tsx` | Hero section with phone mockup |
| `src/components/landing/ValuePillars.tsx` | Three-column feature showcase |
| `src/components/landing/RankingSpotlight.tsx` | Dedicated ranking feature section |
| `src/components/landing/ShareExperience.tsx` | Instagram sharing showcase |
| `src/components/landing/LandingCTA.tsx` | Final call-to-action section |
| `src/components/landing/PhoneMockup.tsx` | Reusable phone frame with hand illustration |

### Mockup Approach

Since we need hand-held phone visuals (Lapse style), we have two options:

1. **CSS Illustration**: Create a stylized hand + phone using CSS shapes and real app UI inside
2. **Static SVG/Image**: Use a pre-made phone-in-hand illustration with app screenshots composited

For the initial implementation, I recommend **Option 1** (CSS-based) with the actual app components rendered inside the phone frame. This keeps everything dynamic and authentic.

### Styling Patterns

```text
Background:           bg-[hsl(222,47%,6%)] (deep dark)
Section spacing:      py-24 (generous)
Headlines:            text-4xl md:text-6xl font-bold text-white
                      textShadow: "0 0 40px rgba(255,255,255,0.3)"
Body text:            text-lg text-white/60
Glassmorphism cards:  bg-white/[0.03] backdrop-blur-sm border-white/[0.08]
Primary CTA:          bg-primary text-primary-foreground shadow-glow
Secondary CTA:        border border-white/20 text-white hover:bg-white/10
Teaser badge:         bg-white/[0.05] border-primary/30 text-primary text-sm
```

### Responsive Breakpoints

| Breakpoint | Adjustments |
|------------|-------------|
| Mobile (< 768px) | Stacked layout, phone mockups centered below text, smaller headlines |
| Tablet (768-1024px) | Side-by-side hero, 3-column pillars |
| Desktop (> 1024px) | Full width with generous spacing, large mockups |

---

## Summary

This landing page design:

1. **Leads with the complete value prop** - curated, ranked, shared
2. **Shows the product in action** - authentic hand-held mockups throughout
3. **Spotlights the differentiator** - dedicated section for head-to-head ranking
4. **Teases social features** - "Compare with friends" badge builds anticipation
5. **Matches the app aesthetic** - same glassmorphism, glows, and dark theme
6. **Optimizes for conversion** - clear CTAs above the fold and at bottom

