# Scene Navigation Rethink — Spotify-Inspired UI
## Multi-Phase Implementation Plan

> **How to use this file:** Prompt Lovable with "continue working on the plan" or reference a specific phase by name, e.g. "implement Phase 1 from the plan."

---

## Context & Goal

Scene's current nav swaps entire component trees when tapping bottom nav buttons — it feels like a page reload. Spotify keeps a persistent shell (header + bottom nav) and only animates the content area, making everything feel like one continuous surface. Music fans who use Spotify daily will find this immediately familiar.

**Core principle:** The shell never unmounts. Only the content moves.

---

## Phase 1 — Animated Content Transitions ✅ COMPLETE
> **Effort:** Low | **Risk:** Low | **Impact:** Immediate quality boost

### What
Add framer-motion `AnimatePresence` to the content swap in `Dashboard.tsx` so switching tabs produces a smooth fade + subtle slide instead of an abrupt DOM swap.

### Files to touch
- `src/pages/Dashboard.tsx` — wrap `renderContent()` in `<AnimatePresence>` + `<motion.div key={activeTab}>`

### Steps
- [ ] Wrap the `<main>` content in `<AnimatePresence mode="wait">`
- [ ] Add `<motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.18, ease: "easeOut" }}>` around `renderContent()`
- [ ] Confirm header and bottom nav are **outside** the animated wrapper (they already are ✅)
- [ ] Test on simulated slow CPU (DevTools → Performance → 4x throttle) for jank

### Success Criteria
Switching tabs feels like a snappy content slide, not a page reload. Header never flickers.

---

## Phase 2 — Horizontal Pill Sub-Nav (Spotify Filter Row) ✅ COMPLETE
> **Effort:** Medium | **Risk:** Low | **Impact:** High discoverability + familiar UX

### What
Add a horizontally scrollable pill row near the top of the Home content — like Spotify's "All / Music / Podcasts" row. Globe and Rank become sub-views within Home rather than separate bottom-nav destinations.

### Finalised Pill Nav Design

**Order (locked):** `Home → Schedule → Rank → All Shows → Globe`

| Pill | Internal ID | Rationale |
|---|---|---|
| **Home** | `home` | Anchor — always first |
| **Schedule** | `calendar` | Renamed from "Calendar". Elevated to #2 as the social hub for shared concert calendars and friend coordination — core product priority |
| **Rank** | `rank` | Head-to-head ELO ranker — primary engagement mechanic |
| **All Shows** | `rankings` | Personal leaderboard/library — payoff view after ranking |
| **Globe** | `globe` | Exploratory map — lowest frequency, earns last spot |

**Nudge dot:** Appears on the **Rank** pill when shows are unranked.

**Stat pills (Home view):**
- `Improve` — only visible when tasks exist (unranked shows, missing photos, incomplete tags, profile incomplete). Hidden when everything is done. Serves as a catch-all for profile completion, future account connections, etc.

### Design spec
```
[ Home ]  [ Schedule ]  [ Rank ]  [ All Shows ]  [ Globe ]   ← scrollable, glassmorphic
```
- Pill: `bg-white/[0.06] border border-white/10 rounded-full px-4 py-1.5 text-sm`
- Active pill: `bg-primary/20 border-primary/40 text-primary font-semibold`
- Active pill slides with a `layoutId="pill-indicator"` shared layout animation
- Horizontal scroll, `scrollbar-width: none`

### Files created/touched
- `src/components/home/ContentPillNav.tsx` — scrollable pill row component
- `src/components/Home.tsx` — pill nav + sub-view state + inline `Rank` and `MapView`
- `src/pages/Dashboard.tsx` — simplified to `home | profile` bottom nav
- `src/hooks/useHomeStats.ts` — removed redundant "All Shows" stat pill; renamed "Finish Up" → "Improve"

### Success Criteria ✅
User can reach Globe, Rank, Schedule, and All Shows without the bottom nav changing. Bottom nav is macro-level only (Home + Profile).

---

## Phase 3 — Bottom Nav Simplification
> **Effort:** Low | **Risk:** Low | **Impact:** Cleaner chrome, less cognitive load

### What
Once Globe and Rank live in the pill nav (Phase 2), the bottom nav no longer needs 3 icons. Simplify to 2 primary destinations.

### Chosen approach (decide before implementing — default: Option B)
- **Option A:** Home + Profile — cleanest, most Spotify-like
- **Option B:** Home + FAB (center) + Profile — keeps Add action prominent in nav ← recommended
- **Option C:** Keep 3 icons but replace Globe/Rank with Friends + Profile

### Files to touch
- `src/pages/Dashboard.tsx` — remove Globe/Rank nav buttons, adjust pill spacing

### Steps
- [ ] Confirm Option A/B/C above before starting
- [ ] Remove Globe and Rank `<button>` elements from bottom nav pill
- [ ] Rebalance spacing: `gap-10` → `gap-16` or similar
- [ ] Move FAB into center of nav pill if going with Option B
- [ ] Update onboarding `SpotlightTour` steps that reference `nav-globe` and `nav-rank` data attributes
- [ ] Update `FloatingTourTarget` refs accordingly

### Success Criteria
Bottom nav pill contains only 2–3 items. No dead space. Feels intentional.

---

## Phase 4 — Persistent Shell (Scroll State Preservation)
> **Effort:** Medium | **Risk:** Medium | **Impact:** Eliminates scroll-position loss on tab switch

### What
Scroll position within a tab resets to top when you switch away and come back. Fix this so returning to the Home tab picks up where you left off — like Spotify does.

### Strategy
Use CSS `display: contents` / `visibility: hidden` + `position: absolute` to keep all tab trees mounted but hide non-active ones. React state stays alive, scroll position is preserved, no re-fetch on return.

### Files to touch
- `src/pages/Dashboard.tsx` — replace conditional `renderContent()` with always-mounted hidden panels

### Steps
- [ ] Replace `renderContent()` switch with always-rendered panels:
  ```tsx
  <div style={{ display: activeTab === "home" ? "block" : "none" }}>
    <Home ... />
  </div>
  <div style={{ display: activeTab === "profile" ? "block" : "none" }}>
    <Profile ... />
  </div>
  ```
- [ ] Wrap in `<AnimatePresence>` on the visible panel only (using opacity not display for animation)
- [ ] Test memory usage — mounting all panels simultaneously is fine for this app size
- [ ] Verify that Rank/Globe (now sub-views of Home per Phase 2) benefit automatically

### Success Criteria
Scroll back to halfway through your show list → switch to Profile → come back → still at the same position.

---

## Phase 5 — Micro-Interaction Polish
> **Effort:** Low | **Risk:** None | **Impact:** Premium tactile feel

### What
Final layer of polish that makes every tap feel satisfying and alive.

### Steps
- [ ] `whileTap={{ scale: 0.93 }}` on all pill nav buttons (bottom nav + content pills)
- [ ] Shared layout animation: `layoutId="active-pill"` slides the active indicator between content pills
- [ ] Bottom nav active icon: soft glow pulse via CSS `@keyframes` (already partially implemented with `drop-shadow`)
- [ ] Content cards stagger in on first load: `variants` with `staggerChildren: 0.04`
- [ ] Mobile haptic: `navigator.vibrate?.(6)` on tab switch (gracefully ignored on desktop)
- [ ] Add `transition={{ type: "spring", stiffness: 400, damping: 30 }}` to pill indicator for snappy feel

### Success Criteria
Every interaction feels snappy and intentional. The UI communicates state through motion, not just color.

---

## Implementation Order

```
Phase 1  →  Phase 2  →  Phase 3  →  Phase 4  →  Phase 5
 Animate     Pill nav    Simplify    Persist     Polish
 content     sub-views   bottom nav  scroll      micro-FX
```

Start with Phase 1 (lowest risk, immediate visible improvement), then Phase 2 (biggest structural change), then clean up from there.

---

## Key File Reference

| File | Role |
|---|---|
| `src/pages/Dashboard.tsx` | Shell: header, bottom nav, tab state, content switch |
| `src/components/Home.tsx` | Home tab: highlight reel, stats, what's next, sub-view logic |
| `src/components/Rank.tsx` | Rank view — will become a Home sub-view in Phase 2 |
| `src/components/MapView.tsx` | Globe/map — will become a Home sub-view in Phase 2 |
| `src/components/home/WhatsNextStrip.tsx` | Upcoming shows strip (Mine / Friends toggle) |
| `src/components/home/ContentPillNav.tsx` | NEW in Phase 2 — scrollable pill filter row |

---

## Design Tokens to Use

```
Active pill:   bg-primary/20  border-primary/40  text-primary
Inactive pill: bg-white/[0.06]  border-white/[0.10]  text-muted-foreground
Nav glow:      drop-shadow-[0_0_8px_hsl(var(--primary))]
Transition:    duration-200 ease-out  (or spring stiffness-400)
```
