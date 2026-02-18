
# Profile Page — Glassmorphism Redesign

## Problem

The current Profile page uses the default `<Card>` / `<CardHeader>` / `<CardTitle>` component stack, which produces solid-background cards with `bg-card` (a slightly-lifted dark tone), standard `border-border` dividers, and default `text-2xl` heading sizes. This is visually mismatched against the rest of the app — the Home feed, Stat Pills, and Show Cards all use:

- `bg-white/[0.03–0.06]` frosted glass backgrounds with `backdrop-blur`
- `border-white/[0.06–0.12]` ultra-subtle white borders
- `text-white/70–90` with luminous `textShadow` treatments
- Rounded `rounded-2xl` containers instead of `rounded-lg`
- Section labels as `text-[11px] uppercase tracking-[0.2em] text-white/60`

## What Changes (UI only — no logic changes)

### 1. Page Header
- Remove the generic `"Profile Settings"` h2 heading.
- Replace with a **hero identity row**: large avatar (tap to upload, same logic), name/username below it, and a subtle `"Sign Out"` ghost button tucked to the top-right corner — styled as `bg-white/[0.04] border-white/[0.08]`, not a bulky outline button.

### 2. Section Labels
- Replace `<CardTitle>` headings with the Home-feed section label pattern:
  ```
  text-[11px] uppercase tracking-[0.2em] font-semibold text-white/50
  ```
  with optional `textShadow: "0 0 8px rgba(255,255,255,0.2)"`.

### 3. Glassmorphism Section Containers
- Replace all `<Card className="border-border shadow-card">` wrappers with:
  ```
  rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.07]
  ```
- Remove the `<CardHeader>` / `<CardContent>` nesting; use direct `div` with `px-5 py-4` padding.

### 4. Quick-Access Menu (Welcome to Scene / Tour / Install)
- Each row becomes a `button` styled as a glass list row:
  ```
  w-full flex items-center gap-3 px-4 py-3.5 rounded-xl
  hover:bg-white/[0.06] transition-all
  ```
- Icon bubbles: `h-9 w-9 rounded-full bg-primary/[0.12] border border-primary/[0.2]` for the primary action, secondary/accent variants for the others.
- Chevron `>` at the right edge (same as StatPill todo row).

### 5. Friends on Scene Section
- Following/Followers stat tiles: match the Stat Pill aesthetic exactly — `rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.06]` with the large number in `text-white/90` and a `textShadow` glow.
- "Find Friends" CTA: glass outline button (`bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08]`) instead of a solid `variant="outline"`.

### 6. Invite Friends Section
- The referral stat block becomes a glass pill row (avatar-icon + count + label inline), removing the oversized box.
- "Copy Invite Link" becomes a slim glass action row with a `Share2` icon and a `>` chevron, matching the quick-access rows.

### 7. Account Information Form
- Inputs already use `border-input`, but will be given `bg-white/[0.04]` glass fill to blend with the panel.
- Labels downgraded to `text-[11px] uppercase tracking-wider text-white/50`.
- "Update Profile" submit button: soft primary glass (`bg-primary/[0.15] border-primary/[0.30] text-primary hover:bg-primary/[0.25]`) rather than the default solid fill.

### 8. Notifications Row
- The card becomes a single glass row (no card box), matching the existing quick-access rows in structure: icon bubble, title + subtitle, and the existing `<Switch>` on the right.

### 9. Privacy Settings
- Collapsed into a minimal glass row with "Coming Soon" label in `text-white/30` italic — no separate card.

## File Changed

**`src/components/Profile.tsx`** — pure JSX/className restructuring. All logic, hooks, and data fetching are untouched. No new dependencies. No database changes.

## Aesthetic Reference (token mapping)

| Old pattern | New pattern |
|---|---|
| `<Card className="border-border shadow-card">` | `<div className="rounded-2xl bg-white/[0.04] backdrop-blur-md border border-white/[0.07]">` |
| `<CardTitle className="text-2xl">` | `<p className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/50">` |
| `<Button variant="outline">` CTA | `<button className="...bg-white/[0.04] border-white/[0.10] hover:bg-white/[0.08]...">` |
| Solid primary `<Button>` | `bg-primary/[0.15] border border-primary/[0.30] text-primary` glass button |
| `bg-primary/20` icon bubble | `bg-primary/[0.12] border border-primary/[0.20]` |

The result will be a page that reads as a natural extension of the Home and Rankings views — minimal, luminous, and consistent.
