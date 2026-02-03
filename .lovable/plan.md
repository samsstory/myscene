

# Hero Mockup Refinement: Elevated Tags + Calm Authority (No Breakout)

## Overview

Refine the ceremonial "#1 Show" reveal by making the emotional tags the clear signal of meaning, improving title styling, and adding subtle authority to the featured card—all while keeping everything inside the phone frame.

---

## Changes Summary

| Element | Current | Target |
|---------|---------|--------|
| Title style | `UPPERCASE tracking-widest` + glow | **Sentence case, no glow, calm** |
| Title spacing | `py-3` | **`py-4` for generous breathing room** |
| Card shadow | `shadow-lg` | **Enhanced depth shadow** |
| Artist name | `text-sm` (14px) | **`text-[15px]` for more weight** |
| Tag size | `text-[8px]` | **`text-[10px]` — larger, more legible** |
| Tag gap | `gap-1.5` | **`gap-2` — more breathing room** |
| Tag styling | Glow effect, uniform | **No glow, varied padding, "Emotional" emphasized** |
| Runner-ups | `space-y-1`, `mt-4` | **`space-y-0.5`, `mt-3` — tighter stack** |

---

## Technical Implementation

### 1. Title Refinement (Lines 25-32)

**Current:**
```tsx
<span 
  className="text-[11px] uppercase tracking-widest text-white/90 font-medium"
  style={{ textShadow: "0 0 20px rgba(255,255,255,0.4)" }}
>
  Your #1 Show of All Time
</span>
```

**Updated:**
```tsx
<span className="text-[11px] tracking-wide text-white/70 font-normal">
  Your #1 show of all time
</span>
```

Changes:
- Sentence case (only "Your" capitalized)
- Remove `uppercase` and reduce `tracking-widest` to `tracking-wide`
- Remove the glowing `textShadow`
- Softer opacity (`white/70` vs `white/90`)
- `font-normal` instead of `font-medium`
- Increase container padding from `py-3` to `py-4` for generous spacing

---

### 2. Featured Card Authority (Lines 37-76)

**Card container enhancement:**
```tsx
<div 
  className="relative rounded-xl overflow-hidden"
  style={{ 
    aspectRatio: "16/11",
    boxShadow: "0 8px 32px -8px rgba(0,0,0,0.6), 0 4px 16px -4px rgba(0,0,0,0.4)"
  }}
>
```
- Replace `shadow-lg` class with a custom multi-layer shadow for realistic depth
- This creates a subtle "lift" without changing size

**Artist name increase:**
```tsx
<div 
  className="text-white font-bold text-[15px]"
  style={{ textShadow: "0 0 20px rgba(255,255,255,0.5)" }}
>
  Fred again..
</div>
```
- Increase from `text-sm` (14px) to `text-[15px]`
- Keep the luminous glow on the artist name (it's the focal element)

---

### 3. Emotional Tags — The Core Refinement (Lines 78-89)

This is the critical change. Tags must feel intentional and equal in importance to the artist name.

**Updated tag container:**
```tsx
<div className="flex flex-wrap gap-2 mt-4 justify-center">
```
- Increase `gap-1.5` to `gap-2` for breathing room
- Increase `mt-3` to `mt-4` for separation from card

**Updated tag styling with variation:**
```tsx
{emotionalTags.map((tag, index) => {
  // "Emotional" gets emphasis, others are standard
  const isEmphasis = tag === "Emotional";
  
  return (
    <span
      key={tag}
      className={cn(
        "rounded-full backdrop-blur-sm border",
        isEmphasis 
          ? "px-3 py-1 text-[10px] text-white/95 bg-white/[0.12] border-white/[0.18] font-medium"
          : "px-2.5 py-0.5 text-[10px] text-white/80 bg-white/[0.08] border-white/[0.12]"
      )}
    >
      {tag}
    </span>
  );
})}
```

Key changes:
- **Size increase**: `text-[8px]` → `text-[10px]` (25% larger)
- **Remove glow**: No more `boxShadow` on tags
- **Varied padding**: 
  - "Emotional": `px-3 py-1` (emphasized)
  - Others: `px-2.5 py-0.5`
- **"Emotional" emphasis**: Brighter background (`0.12`), stronger border, `font-medium`
- **Softer contrast**: Slightly transparent but clearly legible

---

### 4. Runner-Up Stack Tightening (Lines 91-112)

**Container update:**
```tsx
<div className="mt-3 space-y-0.5">
```
- Reduce top margin from `mt-4` to `mt-3`
- Tighten vertical spacing from `space-y-1` to `space-y-0.5`

**Card styling update:**
```tsx
<div 
  key={show.rank}
  className="py-1.5 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
  style={{ 
    opacity: 0.5 - (index * 0.12),  // 50%, 38%, 26%
    filter: index > 0 ? `blur(${index * 0.4}px)` : "none",
  }}
>
```
- Reduce vertical padding from `py-2` to `py-1.5`
- Softer border (`0.04` vs `0.05`)
- Steeper opacity fade for more depth
- Slightly more blur (`0.4` vs `0.3` per step)

---

## Visual Hierarchy (ASCII)

```text
┌─────────────────────────────────┐
│        [Dynamic Island]         │
│                                 │
│   Your #1 show of all time      │  ← Sentence case, calm, no glow
│                                 │
│  ┌───────────────────────────┐  │
│  │                           │  │
│  │    [Concert Photo]        │  │  ← Moody, cinematic
│  │                           │  │
│  │  Fred again..             │  │  ← 15px, luminous
│  │  Alexandra Palace·London  │  │
│  │  September 2023           │  │
│  └───────────────────────────┘  │
│        ↑ enhanced shadow        │
│                                 │
│  [Emotional] [Crowd went off]   │  ← 10px, prominent
│         [Surprise set]          │     breathing room
│                                 │
│  #2 — ODESZA · The Gorge        │  ← Faded 50%, tight
│  #3 — Rufus Du Sol · Red Rocks  │  ← Faded 38%, blurred
│  #4 — Jamie xx · London         │  ← Faded 26%, more blur
│                                 │
│         [Breathing room]        │
└─────────────────────────────────┘
```

---

## File Changes

### `src/components/landing/v2/LandingHeroV2.tsx`

| Lines | Change |
|-------|--------|
| 25-32 | Title: sentence case, remove glow, increase padding |
| 37-39 | Card: enhanced shadow for lift |
| 63-68 | Artist name: increase to `text-[15px]` |
| 79-89 | Tags: larger text, varied widths, "Emotional" emphasis, remove glow |
| 92-111 | Runner-ups: tighter spacing, steeper fade, more blur |

No changes needed to `PhoneMockup.tsx` since we're staying inside the frame.

---

## Design Principles

1. **Tags = meaning**: Larger, more prominent, equal to artist name in importance
2. **Calm authority**: No glow tricks, no layout experiments
3. **Organic variation**: "Emotional" stands out subtly, widths vary naturally
4. **Depth through fade**: Runner-ups recede into texture, not competition
5. **Composed finish**: Everything feels intentional and premium

