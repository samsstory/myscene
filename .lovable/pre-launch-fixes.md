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
| 1B. BulkUpload → Rank nav | ✅ Done |
| 1C. Dual calendar removal | ✅ Done (resolved during Home decomposition) |
| 2A. WelcomeCarousel rewrite | ✅ Done |
| 2B. Empty state messaging | ✅ Done |
| 3A. Remove hardcoded demo data | ⬜ Todo |
| 3B. Fix FriendTeaser direction | ✅ Done |
| 3C. Remove dead code | ✅ Done |
| 4A. Pill naming review | ✅ Done — "My Scene"→"Home", "H2H"→"Rank" |
| 4B. Micro-interactions | ✅ Done — haptic on pills, staggered stat fade-in |
| 4C. Loading experience | ✅ Done — verified, no changes needed |
| **5. Engagement Pulse analytics tab** | ⬜ Todo |

---

## Phase 5 — Engagement Pulse Analytics Tab
> **Priority:** P1 | **Goal:** Data-driven launch insights for first 50 beta users

### Core Framework: Hooked Model Mapping

| Hooked Stage | Scene Action | Key Metric |
|--------------|-------------|------------|
| **Trigger** | Friend adds upcoming show / push notification | Notification open rate, friend activity views per session |
| **Action** | View friend's calendar, add own upcoming show | Upcoming shows added, Schedule tab views |
| **Variable Reward** | Discover shared show, see ranking evolve | "Same show" discoveries, ranking sessions completed |
| **Investment** | Follow friends, log past shows, complete rankings | Friends followed, shows logged, comparisons done |

### Aha Moment Hypothesis
> **"Users who see a friend's upcoming show within their first 3 sessions retain at 2x the rate."**
> Secondary: Users who add 3+ shows in their first week.

### 5A. Event Tracking Infrastructure
Track these events (store in a `user_analytics_events` table):
- `show_added` (past vs upcoming, with timestamp)
- `friend_followed`
- `friend_show_viewed` (viewed another user's show detail)
- `schedule_tab_opened`
- `ranking_session_completed` (number of comparisons)
- `shared_show_discovered` (user + friend going to same show)
- `push_notification_opened`
- `session_start` (with session count for the user)

### 5B. Admin Tab — 3 Sections

#### Section 1: Activation Funnel
| Metric | Description |
|--------|-------------|
| Signup → First show added | Basic activation rate + median time |
| Signup → First friend followed | Social activation rate + median time |
| Signup → First upcoming show added | Calendar activation |
| Signup → Viewed a friend's show | **Aha moment reached** |
| Time-to-each-milestone | Speed = product-market fit signal |

#### Section 2: Habit Metrics
| Metric | Description |
|--------|-------------|
| DAU / WAU ratio | Stickiness (target >25% for social) |
| Shows added per user per week | Content creation velocity |
| Friends panel views per session | Social engagement depth |
| Return within 48h of adding a show | Investment → trigger loop closure |
| Users with 3+ friends followed | "Magic number" threshold to validate |

#### Section 3: Smart Recommendations (Hybrid)
- **Rule-based cards** for known patterns:
  - "X users have 0 friends — consider friend suggestion nudge"
  - "Only Y% add upcoming shows after logging past shows — add post-log prompt"
  - "Z% of users haven't returned in 7 days — trigger re-engagement push"
- **AI-powered weekly digest** (Lovable AI / Gemini Flash):
  - Analyze cohort behavior, surface unexpected correlations
  - Natural-language summary: "Users who add shows on weekends retain 40% better — consider a Friday evening push notification"

### 5C. Implementation Plan
1. Create `user_analytics_events` table with RLS
2. Add lightweight event tracking hook (`useTrackEvent`) to frontend
3. Instrument key touchpoints (show add, friend follow, schedule view, etc.)
4. Build admin "Engagement Pulse" tab with charts (recharts) + recommendation cards
5. Add AI analysis edge function for weekly digest
