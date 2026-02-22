
# Phase 4 — Polish (4A, 4B, 4C)

## 4A. Pill Naming Review

**Problem:** "H2H" means nothing to new users. "My Shows" vs "My Scene" is confusing -- both sound like they do the same thing.

**Changes:**
- Rename "H2H" to "Rank" -- clearer, one word, immediately communicates purpose
- Rename "My Scene" to "Home" -- since it's the landing/feed view
- Keep "My Shows", "Schedule", "Friends", "Globe" as-is (they're clear)

Updated pill order:
```
Home | Schedule | My Shows | Rank | Friends | Globe
```

File: `src/components/home/ContentPillNav.tsx` -- update the `PILLS` array labels.

---

## 4B. Micro-Interaction Polish

**Changes in `src/components/Home.tsx`:**
- The `AnimatePresence` view transitions already exist (`opacity + y`). No changes needed there.

**Changes in `src/components/home/ContentPillNav.tsx`:**
- Add haptic feedback (`navigator.vibrate?.(6)`) on pill tap (same pattern as BottomNav)
- The spring-based `layoutId` pill indicator is already in place -- keep as-is

**Changes in `src/components/home/StatPills.tsx`:**
- Add staggered fade-in animation to stat pills using framer-motion's `staggerChildren`
- Wrap each pill in a `motion.div` with `initial={{ opacity: 0, y: 8 }}` and `animate={{ opacity: 1, y: 0 }}`
- Use a parent `motion.div` with `staggerChildren: 0.06` for the container

---

## 4C. Loading Experience

**Current state:** BrandedLoader shows a quote on first session open, then "Still loading..." if slow. The slow-load detector kicks in at 2s (reassurance) and 3.5s (bug report prompt). This all works correctly.

**Potential flicker issue:** When switching pill views, the `AnimatePresence` in Home.tsx handles transitions cleanly already. However, views that fetch data (like Friends, Globe) could show a blank flash before their own loading states render.

**Changes:**
- No changes needed to BrandedLoader or slow-load detector -- they work correctly
- Add a subtle skeleton placeholder for pill view transitions: wrap the `AnimatePresence` content in Home.tsx so that data-fetching views (SceneView, MyShowsView, etc.) don't flash empty before their loading skeletons appear. This is already handled by each view's own `isLoading` states, so this is a verification task rather than code change.
- Verify the quote-on-first-open gate works: `sessionStorage` flag in BrandedLoader ensures quotes only show once per session -- confirmed working from code review.

**Conclusion for 4C:** The loading experience is already solid. The only action item is confirming no flicker, which is a runtime check rather than a code change.

---

## Summary of File Changes

| File | Change |
|------|--------|
| `src/components/home/ContentPillNav.tsx` | Rename "My Scene" to "Home", "H2H" to "Rank"; add haptic on tap |
| `src/components/home/StatPills.tsx` | Add staggered fade-in animation with framer-motion |
| `.lovable/pre-launch-fixes.md` | Mark 4A, 4B, 4C as done |

---

## Technical Details

**ContentPillNav changes:**
- `PILLS` array: `{ id: "home", label: "Home" }` and `{ id: "rank", label: "Rank" }`
- Add `navigator.vibrate?.(6)` inside the `onClick` handler before calling `onViewChange`

**StatPills stagger animation:**
- Import `motion` from `framer-motion`
- Replace the container `<div className="flex gap-2.5 items-stretch">` with `<motion.div variants={containerVariants} initial="hidden" animate="show">`
- Wrap each stat button in `<motion.div variants={itemVariants}>` with opacity + y transform
- Container variants: `{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }`
- Item variants: `{ hidden: { opacity: 0, y: 8 }, show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } } }`
