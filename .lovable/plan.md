
# Design Audit & Refactor Plan: Glassmorphism Minimal Standard

## Problem Identified

The product has two competing aesthetics colliding:
- **What's working**: The stacked show cards, stat pills, and ranking cards already use correct glassmorphism — `bg-white/[0.03-0.06]`, `border-white/[0.06-0.12]`, subtle white glows. This feels premium.
- **What's broken**: Several interactive elements still use `bg-primary` (a fully-saturated `hsl(189 94% 55%)` solid cyan) as button backgrounds, icon container fills, and accents. The `accent` token is a harsh yellow (`hsl(45 93% 58%)`). These are jarring against the dark, frosted-glass backdrop.

---

## Specific Offenders in `PlanShowSheet.tsx`

| Element | Current (Harsh) | Problem |
|---|---|---|
| "Parse with AI" CTA button | `bg-primary` (solid cyan) | Full-saturation fill dominates the sheet |
| "Add to Upcoming →" save button | `bg-primary` (solid cyan) | Same issue on every stage |
| Screenshot upload icon ring | `bg-primary/15 border-primary/30 text-primary/80` | Still reads as punchy cyan glow |
| Confirm stage fallback hero card | `bg-gradient-to-br from-primary/30 to-primary/10` | Cyan splash behind artist card |
| "View Tickets" link | `text-primary` | Bright cyan hyperlink |

## Specific Offenders in `WhatsNextStrip.tsx`

| Element | Current | Problem |
|---|---|---|
| `AddShowChip` icon ring | `bg-primary/20 border-primary/40 text-primary` | Cyan glow button |
| Empty state icon ring | `bg-primary/15 border-primary/30 text-primary/70` | Same |

## Offenders in `FocusedRankingSession.tsx`

| Element | Current | Problem |
|---|---|---|
| VS badge | `bg-primary text-primary-foreground` | Full solid cyan pill |
| Confetti colors | `#22d3ee` (cyan), `#fbbf24` (yellow) | Yellow is explicitly excluded from the palette |

## Offenders in `StatPills.tsx`

| Element | Current | Problem |
|---|---|---|
| To-Do pill | `bg-gradient-to-br from-primary/[0.12] to-secondary/[0.08]`, `border-primary/20`, `text-primary/90`, pulsing dot `bg-primary` | Cyan gradient + pulsing dot = draws too much eye |

---

## The Design Framework (Codified Standard)

This refactor establishes and documents a single, enforceable rule set.

### Rule 1 — Primary CTA Buttons
- **Remove**: `bg-primary` (solid cyan fill)
- **Replace with**: `bg-white/[0.10] border border-white/[0.18] text-foreground hover:bg-white/[0.16]` — a frosted white glass pill
- **Optional glow variant** for the single highest-priority CTA per screen: add a soft gradient border `from-primary/40 to-primary/20` at very low opacity, never a solid fill

### Rule 2 — Icon Rings / Badge Backgrounds
- **Remove**: `bg-primary/15-30 border-primary/30-40 text-primary`
- **Replace with**: `bg-white/[0.08] border-white/[0.12] text-white/60` — neutral glass

### Rule 3 — Accent / Highlight Colors
- **Yellow is excluded** (already in memory). `accent: hsl(45 93% 58%)` should only be used at ≤10% opacity tints if at all.
- **Cyan (`primary`)** is reserved for: data labels, small rank badges, small text links only — never as a full background fill.

### Rule 4 — Outline / Ghost Buttons
- **Keep**: `border-white/10 text-muted-foreground` — already correct
- **Hover**: `hover:bg-white/[0.06] hover:text-foreground/80`

### Rule 5 — VS / Spotlight Badges
- **Remove**: `bg-primary` solid pill
- **Replace with**: `bg-white/[0.12] backdrop-blur-sm border border-white/[0.20] text-white/90` — glass pill

### Rule 6 — Pulsing / Attention Elements
- **Remove**: `bg-primary animate-ping/pulse` for dot indicators
- **Replace with**: `bg-white/50 animate-pulse` — subtle white pulse

---

## Files to Change

### 1. `src/components/home/PlanShowSheet.tsx`
- **CTA buttons** ("Parse with AI", "Add to Upcoming →"): Change `className="flex-1 gap-2"` (which inherits `bg-primary`) to use a new white-glass variant class
- **Screenshot upload icon ring**: `bg-primary/15 border-primary/30 text-primary/80` → `bg-white/[0.08] border-white/[0.12] text-white/60`
- **Confirm stage hero fallback background**: `from-primary/30 to-primary/10` → `from-white/[0.08] to-white/[0.03]`
- **"View Tickets" link**: keep `text-primary` (small text link is acceptable per Rule 3)
- **Active tab indicator**: `bg-white/[0.12]` stays — already correct

### 2. `src/components/home/WhatsNextStrip.tsx`
- **`AddShowChip` icon ring**: `bg-primary/20 border-primary/40 text-primary` → `bg-white/[0.08] border-white/[0.14] text-white/60`
- **Empty state icon ring**: same swap

### 3. `src/components/home/FocusedRankingSession.tsx`
- **VS badge**: `bg-primary text-primary-foreground` → `bg-white/[0.12] backdrop-blur-sm border border-white/[0.22] text-white/90`
- **Confetti colors**: Remove yellow `#fbbf24`, soften to `['#e2e8f0', '#94a3b8', '#22d3ee']` (keep one subtle cyan, add neutral silvers)

### 4. `src/components/ui/button.tsx`
- Add a new `glass` variant: `bg-white/[0.08] border border-white/[0.16] text-foreground hover:bg-white/[0.14] hover:border-white/[0.22] backdrop-blur-sm`
- The `default` variant will remain `bg-primary` for flexibility (used across admin/landing pages where full accent may be appropriate), but all dark-UI sheets will explicitly pass `variant="glass"`

### 5. `src/components/home/StatPills.tsx`
- **To-Do pill**: Replace `from-primary/[0.12] to-secondary/[0.08]` gradient with `bg-white/[0.06]`, replace `border-primary/20` with `border-white/[0.12]`, replace `text-primary/90` with `text-white/80`, replace pulsing dot `bg-primary` with `bg-white/50`

---

## Implementation Order

1. Add `glass` variant to `src/components/ui/button.tsx`
2. Update `PlanShowSheet.tsx` buttons, icon rings, and fallback card gradient
3. Update `WhatsNextStrip.tsx` icon rings
4. Update `FocusedRankingSession.tsx` VS badge and confetti
5. Update `StatPills.tsx` To-Do pill

No database or edge function changes required.
