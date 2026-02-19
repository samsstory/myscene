# Pre-Launch Fix Plan — Beta 50
> Systematic UX/UI fixes before first 50 beta testers

---

## Phase 1 — Critical Broken Flows
> **Priority:** P0 | **Goal:** Nothing visibly broken

### 1A. Fix SpotlightTour
- Tour targets `[data-tour="nav-rank"]` and `[data-tour="nav-globe"]` which no longer exist (moved to ContentPillNav)
- Update targets to pill nav elements or remove those steps
- Rewrite copy to introduce social calendar + friends, not just personal ranking
- Add `data-tour` attributes to ContentPillNav pills

### 1B. Fix BulkUploadFlow → Rank navigation
- `onNavigateToRank` calls `setActiveTab("rank")` but Dashboard only knows `"home" | "profile"`
- Should switch to home tab and set content pill to `"rank"` view
- Requires callback plumbing from Dashboard → Home

### 1C. Remove dual calendar
- `Home.tsx` has an old `renderCalendarView()` grid that conflicts with `ScheduleView.tsx`
- The `viewMode === "calendar"` state triggers the old grid — wire it to ScheduleView instead
- Remove dead `renderCalendarView` code

---

## Phase 2 — Messaging & Onboarding Alignment
> **Priority:** P1 | **Goal:** New users understand the social product

### 2A. Update WelcomeCarousel
- Current slides focus on personal journaling/ranking
- Rewrite to emphasise: shared calendar, seeing friends' shows, going together
- Keep ranking as a secondary hook, not the lead

### 2B. Update empty states
- Home empty state should nudge "add a show + invite friends" not just "log your first show"
- Schedule empty state should mention sharing with friends

---

## Phase 3 — Data & Logic Cleanup
> **Priority:** P1 | **Goal:** No fake data in production paths

### 3A. Remove hardcoded demo data from live components
- `WhatsNextStrip.tsx` — remove `DEMO_10_FRIENDS` / `DUMMY_SHOWS` from production render paths
- `FriendsPanelView.tsx` — same; use real data or proper empty states

### 3B. Fix FriendTeaser direction
- Currently shows followers (people following you) — should show following count (people you follow) since that's relevant for "see friends' shows"

### 3C. Remove dead code
- `DiscoveryCards.tsx` — no longer used anywhere (replaced by ContentPillNav)
- Audit for other orphaned components from the nav restructure

---

## Phase 4 — Polish & Consistency
> **Priority:** P2 | **Goal:** Feels intentional and complete

### 4A. ContentPillNav naming review
- "H2H" label — unclear to new users. Consider "Rank" or "Compare"
- "My Shows" vs "My Scene" — potentially confusing. Clarify distinction

### 4B. Micro-interaction polish (from original plan Phase 5)
- Stagger-in animations on content cards
- Haptic feedback on pill switches
- Spring transitions on pill indicator

### 4C. Loading experience
- Verify quote-on-first-open works correctly after recent changes
- Ensure no loading flicker between pill view switches

---

## Implementation Order

```
Phase 1A (SpotlightTour)  →  1B (BulkUpload nav)  →  1C (Dual calendar)
  →  Phase 2A-2B (Messaging)
  →  Phase 3A-3C (Data cleanup)
  →  Phase 4 (Polish)
```

---

## Status Tracker

| Item | Status |
|------|--------|
| 1A. SpotlightTour | ⬜ Todo |
| 1B. BulkUpload → Rank nav | ⬜ Todo |
| 1C. Dual calendar removal | ⬜ Todo |
| 2A. WelcomeCarousel rewrite | ⬜ Todo |
| 2B. Empty state messaging | ⬜ Todo |
| 3A. Remove hardcoded demo data | ⬜ Todo |
| 3B. Fix FriendTeaser direction | ⬜ Todo |
| 3C. Remove dead code | ⬜ Todo |
| 4A. Pill naming review | ⬜ Todo |
| 4B. Micro-interactions | ⬜ Todo |
| 4C. Loading experience | ⬜ Todo |
