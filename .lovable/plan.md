

# Hero Phone Mockup Redesign: "#1 Show of All Time" Reveal

## Overview

Transform the hero phone mockup from a "rankings list" view into a **ceremonial reveal moment** that celebrates the user's #1 show. The design shifts from analytical (numeric scores) to emotional (shareable tags), creating a Spotify Wrapped-like sense of personal discovery.

---

## Current State vs. Target State

| Element | Current | Target |
|---------|---------|--------|
| Top card emphasis | Part of a stacked list | **Ceremonial #1 reveal** |
| Numeric score | White "9.2" badge prominent | **Removed entirely** |
| Ranking badge | "#1 All Time" small pill | **"Your #1 Show of All Time" headline** |
| Metadata | Artist + Venue only | Artist + Venue + **Date** |
| Emotional context | None | **2-3 frosted pill tags** |
| Secondary cards | 5 collapsed cards with photos | **3-4 faded/blurred runner-ups** |
| Tone | Dashboard/analytical | Sacred/definitive |

---

## Visual Design Changes

### 1. Page Title Area
**Replace** the SceneLogo header with a centered, calm headline:

```
Your #1 Show of All Time
```

- Styling: `text-[11px]` uppercase, `tracking-widest`, white with subtle `textShadow` glow
- Positioned below the dynamic island, centered
- No profile avatar (removes "app UI" feeling)

### 2. Main #1 Card (Hero Moment)

**Layout changes:**
- Increase aspect ratio to `16/11` for more visual weight
- Remove the white "9.2" score badge entirely
- Remove the "#1 All Time" rank pill (redundant with headline)
- Remove "SCENE ✦" watermark (keep focus on the moment)

**Content overlay redesign:**
- Artist name: `Fred again..` (bold, 14px, luminous glow)
- Venue + city: `Alexandra Palace · London` (11px, white/70)
- Date: `September 2023` (9px, white/40, new addition)

**Photo treatment:**
- Keep the existing `fred-again-msg.png` image
- Apply a slightly darker gradient overlay for mood
- Add subtle vignette effect at edges

### 3. Emotional Tags (New Element)

Add a row of **2-3 frosted pill tags** below the main card metadata:

```tsx
const emotionalTags = ["Emotional", "Crowd went off", "Surprise set"];
```

**Tag styling:**
- Background: `bg-white/[0.08]` with `backdrop-blur-sm`
- Border: `border-white/[0.12]`
- Text: `text-[8px]` white/80
- Padding: `px-2 py-0.5`
- Subtle glow: `boxShadow: "0 0 8px rgba(255,255,255,0.1)"`
- Horizontal flex layout with small gaps

### 4. Runner-Up Cards (Depth Stack)

**Replace** the current 5 collapsed cards with **3 faded runner-ups**:

```tsx
const runnerUps = [
  { rank: 2, artist: "ODESZA", venue: "The Gorge" },
  { rank: 3, artist: "Rufus Du Sol", venue: "Red Rocks" },
  { rank: 4, artist: "Jamie xx", venue: "London" },
];
```

**Visual treatment:**
- Single-line format: `#2 — ODESZA · The Gorge`
- Progressive opacity fade: 50% → 40% → 30%
- Remove photo backgrounds (cleaner, less competing)
- Add subtle blur to bottom cards (`blur-[0.5px]`)
- Smaller vertical spacing (`mt-[-4px]` or no overlap)
- Glass background with very low opacity: `bg-white/[0.02]`

### 5. Remove Navigation Elements

**Remove** the bottom nav bar (Home/Globe/Crown icons and FAB):
- This is a "reveal moment," not an app interface
- Creates more vertical space for the ceremonial feeling
- Adds subtle breathing room at bottom

---

## File Changes

### `src/components/landing/v2/LandingHeroV2.tsx`

**Lines 9-40**: Replace `collapsedCards` array with simpler `runnerUps` data

**Lines 42-142**: Rewrite `MockShowCard` component:
- New header with "Your #1 Show of All Time" text
- Updated main card without score/rank badges
- Add emotional tags section
- Simplified runner-up cards
- Remove bottom navigation

---

## Technical Implementation

```text
┌─────────────────────────────────┐
│        [Dynamic Island]         │
├─────────────────────────────────┤
│                                 │
│   Your #1 Show of All Time      │  ← Centered, uppercase, glowing
│                                 │
├─────────────────────────────────┤
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │    [Concert Photo]        │  │  ← Moody, cinematic
│  │                           │  │
│  │  Fred again..             │  │  ← Bold, luminous
│  │  Alexandra Palace·London  │  │
│  │  September 2023           │  │  ← New: date metadata
│  └───────────────────────────┘  │
│                                 │
│  [Emotional] [Crowd went off]   │  ← Frosted pill tags
│                                 │
├─────────────────────────────────┤
│  #2 — ODESZA · The Gorge        │  ← Faded 50%
│  #3 — Rufus Du Sol · Red Rocks  │  ← Faded 40%
│  #4 — Jamie xx · London         │  ← Faded 30%
│                                 │
│         [Breathing room]        │  ← No bottom nav
└─────────────────────────────────┘
```

---

## Design Principles Applied

1. **Ceremonial over functional**: This is a celebration, not a dashboard
2. **Emotional over analytical**: Tags replace scores
3. **Singular focus**: One clear #1, everything else recedes
4. **Quiet confidence**: No busy overlays, no instruction text
5. **Personal and shareable**: Feels like something you'd screenshot

