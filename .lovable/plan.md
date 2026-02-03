

# Hero Phone Mockup Refinement: Breakout Card + Emotional Polish

## Overview

Refine the ceremonial "#1 Show" reveal with a card that visually breaks free of the phone frame, softer tag styling, and improved visual hierarchy—all while maintaining the dark, cinematic Scene aesthetic.

---

## Changes Summary

| Element | Current | Target |
|---------|---------|--------|
| Title case | `UPPERCASE + tracking-widest` | **Sentence case, calm, no glow** |
| Card containment | Inside phone frame | **Breaks out 10-15% at top** |
| Card size | `aspectRatio: 16/11` | **~5% wider, 6-8% taller** |
| Artist name | `text-sm` (14px) | **Slightly larger (15-16px)** |
| Tag styling | Heavy glow, uniform width | **Softer pills, varied widths, "Emotional" emphasized** |
| Runner-ups | `space-y-1` spacing | **Tighter stack, slightly more blur** |

---

## Technical Implementation

### 1. PhoneMockup Component Changes

The phone frame currently has `overflow-hidden`, which prevents the card from breaking out. We need to restructure so the breakout card renders **outside** the phone's clipping context.

**File: `src/components/landing/PhoneMockup.tsx`**

- Add a new optional prop: `breakoutContent?: ReactNode`
- This content renders as a sibling to the phone frame (not inside it)
- Position it with `absolute` positioning to overlap the phone edge
- Apply a soft drop shadow for depth

```tsx
interface PhoneMockupProps {
  children: ReactNode;
  className?: string;
  tilt?: "left" | "right" | "none";
  breakoutContent?: ReactNode;  // NEW
}
```

**Breakout positioning:**
- The breakout card will be positioned at approximately `top: 12%` (below dynamic island + title)
- Overlap the phone edge by ~10-15% of the card height
- Add `boxShadow: "0 20px 40px -10px rgba(0,0,0,0.5)"` for depth

---

### 2. LandingHeroV2 Component Changes

**File: `src/components/landing/v2/LandingHeroV2.tsx`**

#### 2a. Split MockShowCard into Two Parts

Create a new `BreakoutCard` component for the #1 card that renders outside the phone frame:

```tsx
const BreakoutCard = () => (
  <div 
    className="absolute z-30 left-1/2 -translate-x-1/2 w-[105%] rounded-xl overflow-hidden"
    style={{ 
      top: "15%",  // Position below title
      aspectRatio: "16/10",  // Slightly taller
      boxShadow: "0 25px 50px -12px rgba(0,0,0,0.6)"
    }}
  >
    {/* Photo + overlay content */}
  </div>
);
```

The inner `MockShowCard` will contain:
- Title ("Your #1 Show of All Time") 
- Empty spacer where the card would be
- Emotional tags
- Runner-up stack

#### 2b. Title Refinement

Change from:
```tsx
<span className="text-[11px] uppercase tracking-widest text-white/90 font-medium"
      style={{ textShadow: "0 0 20px rgba(255,255,255,0.4)" }}>
```

To:
```tsx
<span className="text-[11px] tracking-wide text-white/80 font-normal">
  Your #1 show of all time
</span>
```
- Sentence case (only "Your" capitalized)
- Remove glow (`textShadow`)
- Lighter weight, calmer presence

#### 2c. Breakout Card Styling

**Size increase:**
- Width: `w-[105%]` (5% wider than container)
- Aspect ratio: `16/10` (taller than current 16/11)
- Position: Overlaps phone top edge by ~10-15%

**Visual treatment:**
- Slightly stronger contrast: `brightness(0.92) contrast(1.08)`
- Deeper shadow for lift effect
- Artist name: `text-[15px]` instead of `text-sm`

#### 2d. Emotional Tags Polish

Current:
```tsx
className="px-2 py-0.5 rounded-full text-[8px] text-white/80 bg-white/[0.08] backdrop-blur-sm border border-white/[0.12]"
style={{ boxShadow: "0 0 8px rgba(255,255,255,0.1)" }}
```

Updated:
```tsx
// Base tag
className="px-2.5 py-0.5 rounded-full text-[8px] text-white/75 bg-white/[0.06] border border-white/[0.08]"
// No glow shadow

// "Emotional" tag (emphasized)
className="px-3 py-0.5 rounded-full text-[8px] text-white/90 bg-white/[0.1] border border-white/[0.12]"
```

- Softer backgrounds (0.06 instead of 0.08)
- Remove glow shadows
- Varied padding for organic feel (`px-2.5`, `px-3`, `px-2`)
- "Emotional" slightly brighter/larger

#### 2e. Runner-Up Stack Tightening

Current:
```tsx
<div className="mt-4 space-y-1">
```

Updated:
```tsx
<div className="mt-3 space-y-0.5">
```

- Tighter vertical spacing (`space-y-0.5` vs `space-y-1`)
- Less top margin (`mt-3` vs `mt-4`)
- Slightly more blur on lower cards: `blur(${index * 0.4}px)`

---

## Visual Architecture

```text
┌─────────────────────────────────────┐
│  PhoneMockup container (relative)   │
│  ┌─────────────────────────────┐    │
│  │    Phone Frame              │    │
│  │  ┌───────────────────────┐  │    │
│  │  │   [Dynamic Island]    │  │    │
│  │  │                       │  │    │
│  │  │  Your #1 show of all  │  │    │  ← Sentence case, calm
│  │  │       time            │  │    │
│  │  │                       │  │    │
│  │  │   [Spacer for card]   │  │    │
│  │  │                       │  │    │
│  │  │   [Tags]  [Tags]      │  │    │
│  │  │                       │  │    │
│  │  │   #2 — ODESZA...      │  │    │
│  │  │   #3 — Rufus...       │  │    │
│  │  │   #4 — Jamie...       │  │    │
│  │  └───────────────────────┘  │    │
│  └─────────────────────────────┘    │
│                                     │
│  ┌─────────────────────────────┐    │
│  │   BREAKOUT CARD (z-30)     │    │  ← 105% width, overlaps top
│  │   [Fred again.. photo]      │    │
│  │   Fred again..              │    │
│  │   Alexandra Palace · London │    │
│  │   September 2023            │    │
│  └─────────────────────────────┘    │
│        ↑ soft shadow                │
└─────────────────────────────────────┘
```

---

## File Changes

### `src/components/landing/PhoneMockup.tsx`
- Add `breakoutContent` prop
- Render breakout content as absolute-positioned sibling
- Keep phone frame with `overflow-hidden`

### `src/components/landing/v2/LandingHeroV2.tsx`
- Create `BreakoutCard` component
- Update `MockShowCard` to leave space for breakout
- Refine title to sentence case, no glow
- Polish tag styling with varied widths
- Tighten runner-up spacing and increase blur
- Pass breakout card to `PhoneMockup`

---

## Design Principles

1. **Breakout = memory escaping the interface** — not a UI trick, but emotional resonance
2. **Calm confidence** — sentence case, no glow, no shouting
3. **Organic tags** — varied widths, soft backgrounds, one emphasized
4. **Context not competition** — runner-ups fade into supporting texture
5. **Premium finish** — realistic shadows, subtle contrast, cinematic mood

