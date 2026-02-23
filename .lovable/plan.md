

# UI Polish Plan -- 6 Improvements

## 1. Inactive top-level pills: text-only, no border

**File:** `src/components/home/ContentPillNav.tsx`

Remove `border`, `bg-white/[0.06]`, and `border-white/[0.10]` from inactive pills. Keep only text color styling (`text-muted-foreground hover:text-foreground/80`). Active pills keep their current `bg-primary/20 border-primary/40` treatment.

Also remove the shared `border` class from the base styles so inactive pills are purely text.

---

## 2. Increase section header text size + collapse time filters into a dropdown

**Files:** `src/components/home/WhatsNextStrip.tsx`, `src/components/home/SceneView.tsx`

- Change all section headers (e.g. "Upcoming Shows", "Friends Going", "Upcoming Near You") from `text-[11px]` to `text-sm` (14px) for better readability.
- Replace the row of 4 time-filter buttons (All / This Week / This Month / Later) with a single compact dropdown `<select>` or a Radix `Select` component styled as a small pill. This removes an entire row of navigation chrome and frees vertical space.

---

## 3. Increase card aspect ratio to 3:4

**Files:** `src/components/home/upcoming/UpcomingChip.tsx`, `src/components/home/upcoming/FriendChip.tsx`

- Change cards from the current fixed `w-32 h-36` (roughly 4:4.5) to `w-32 aspect-[3/4]` (which gives ~32x42.67 = taller cards). Remove explicit `h-36`.
- This gives more room for artist images and reduces text truncation.

---

## 4. Friends Going section: horizontal scroll with matching card size

**File:** `src/components/home/FriendsGoingSection.tsx`

- Replace the current `grid grid-cols-2 gap-3` layout with a horizontal scroll row: `flex gap-3 overflow-x-auto pb-1 -mx-4 px-4` (same pattern used by Mine/Friends tabs in WhatsNextStrip).
- Change each card from `h-40` to `w-32 aspect-[3/4]` to match the UpcomingChip/FriendChip sizing from change #3.
- Cap at `slice(0, 8)` or remove the cap entirely since horizontal scroll handles overflow naturally.

---

## 5. Keep FAB as-is

No changes needed.

---

## 6. Add sparkle icon to "For You" tab

**File:** `src/components/home/WhatsNextStrip.tsx`

- Import `Sparkles` from `lucide-react`.
- Add `<Sparkles className="h-3 w-3" />` inside the "For You" tab button, before the label text.

---

## Technical Summary

| # | Change | File(s) |
|---|--------|---------|
| 1 | Remove border/bg from inactive top pills | `ContentPillNav.tsx` |
| 2a | Bump section headers to `text-sm` | `WhatsNextStrip.tsx`, `SceneView.tsx` |
| 2b | Collapse time filters into dropdown | `WhatsNextStrip.tsx` |
| 3 | Cards to `w-32 aspect-[3/4]` | `UpcomingChip.tsx`, `FriendChip.tsx` |
| 4 | Friends Going to horizontal scroll + matching cards | `FriendsGoingSection.tsx` |
| 5 | No change (FAB stays) | -- |
| 6 | Sparkle icon on For You tab | `WhatsNextStrip.tsx` |

All changes are CSS/layout only with one small icon addition -- no data or logic changes required.

