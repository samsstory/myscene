
# Scene — Remaining Improvements Plan

## Phase 7: Add Historical StatPills to My Shows ← NEXT

**Goal:** Restore backward-looking metric pills (total shows, cities/countries, streak) to the My Shows view, where they belong contextually as part of the "Reflect" experience.

**Changes:**
- `useHomeStats.ts` — Rebuild `statPills` array with historical metrics: Total Shows (→ no action), Cities/Countries (→ globe), Streak, and Confirmation Ring (→ rank)
- `MyShowsView.tsx` — Re-add `StatPills` component at the top, accepting pills + loading state
- `Home.tsx` — Pass `statPills` and `statsLoading` back to `MyShowsView`

**No new dependencies or database changes.**

---

## Phase 8: Redirect to My Shows After Ranking Session

**Goal:** After completing a focused ranking session, automatically switch the user to the My Shows tab so they see their updated rankings immediately.

**Changes:**
- `Home.tsx` — In the `FocusedRankingSession` `onComplete` callback, add `setViewMode('rankings')` to navigate to My Shows after the session closes.

**Effort:** Trivial — one line change.

---

## Phase 9: Edmtrain Suggestions on Schedule Date Tap

**Goal:** When a user taps a future date in the Schedule view, surface Edmtrain events for that date as planning suggestions.

**Changes:**
- `ScheduleView.tsx` — Add a date-tap handler that filters cached Edmtrain events by the selected date
- Create a small inline component or sheet showing matching Edmtrain events with "Add to schedule" action
- Wire up `useEdmtrainEvents` or query `edmtrain_events` table filtered by date

**Effort:** Medium.

---

## Phase 10: Move Scene Feed Activity to Friends Tab

**Goal:** Friend activity (show logs, rankings) belongs in the Friends tab ("Connect"), not the Home tab ("Discover").

**Changes:**
- `FriendsPanelView.tsx` — Add a "Recent Activity" section using `FriendActivityFeed`
- Ensure `FriendActivityFeed` is no longer rendered on the Home tab (already removed from SceneView)

**Effort:** Medium — component exists, needs relocation and integration.

---

## Phase 11: Friend Venue Pins on Globe

**Goal:** Add an overlay toggle on the Globe map showing venues your friends have visited.

**Changes:**
- `MapView.tsx` — Add a toggle button for "Friend pins" overlay
- Query friend show venues and render as a distinct marker layer (different color/style)
- Use `followingIds` to fetch friend venue data

**Effort:** Medium.

---

## Phase 12: "Friends Who Also Saw X" Mutual Overlaps

**Goal:** On a show detail sheet, surface which friends attended the same event (same artist + date or venue + date).

**Changes:**
- `ShowReviewSheet.tsx` — Add a "Friends who were there" section
- Query logic: match `show_artists.artist_name` + `shows.show_date` across followed users
- Display friend avatars with names

**Effort:** Medium — needs cross-user query with RLS considerations.

---

## Phase 13: Friend Profiles with Public Rankings

**Goal:** Tapping a friend's profile shows their public show collection and rankings for comparison.

**Changes:**
- Create a `FriendProfileSheet` or page showing their ranked shows
- Query their shows + rankings (requires public/follower-visible RLS policy)
- Add comparison view: "You both saw X — they ranked it #3, you ranked it #7"

**Effort:** Large — new component + RLS policy work.

---

## Phase 14: Highlight Reel / Wrapped-Style Insights

**Goal:** A "Year in Review" or on-demand highlight reel summarizing the user's show history with visual stats and memorable moments.

**Changes:**
- New component: `HighlightReel.tsx` — carousel or scroll-through experience
- Stats: top artist, most-visited venue, total cities, best-ranked show, longest streak, etc.
- Accessible from My Shows view

**Effort:** Large — new feature, significant design work.
