
# Discovery-First Home Tab Restructure

## Overview
Restructure the Home tab from a multi-purpose dashboard into a focused discovery hub for upcoming shows, while relocating backward-looking content (StatPills, Scene Feed) to their logical homes (My Shows, Friends).

---

## Phase 1: Move StatPills to My Shows Tab Header

**Goal:** Remove backward-looking metrics from Home, place them where they contextually belong.

**Changes:**
- `SceneView.tsx` -- Remove `StatPills` component and all related props (`statPills`, `statsLoading`, `onPillTap`, `showsTourActive`, `showsRef`)
- `MyShowsView.tsx` -- Add `StatPills` as a header section above the existing ranked list. Accept new props for stat data.
- `Home.tsx` -- Stop passing stat-related props to `SceneView`; pass them to `MyShowsView` instead. Clean up unused imports.
- `SceneView` interface -- Slim down by removing 5+ stat-related props

---

## Phase 2: Move Scene Feed to Friends Tab

**Goal:** Friend logging activity ("Alex added Rufus Du Sol") belongs with social connections, not discovery.

**Changes:**
- `SceneView.tsx` -- Remove the "Scene Feed" sub-tab and all `FriendActivityFeed` related props (`activityItems`, `activityLoading`, `followingCount`, `onFindFriends`, `onIWasThere`)
- `FriendsPanelView.tsx` -- Add `FriendActivityFeed` as a section within the Friends tab. Wire up the existing `useFriendActivity` hook data.
- `Home.tsx` -- Stop passing activity props to `SceneView`. Move `useFriendActivity` call to only run when Friends tab is active (or keep it in Home and pass to FriendsPanelView).

---

## Phase 3: Remove Sub-Tab Navigation from SceneView

**Goal:** Eliminate the confusing second navigation layer. Replace with a single vertical scroll feed.

**Changes:**
- `SceneView.tsx` -- Remove the `feedMode` state and the horizontal sub-tab bar (`Scene Feed / Upcoming / Near Me / Explore`). The component becomes a single vertical scroll of discovery sections.
- Remove `Explore` sub-feed entirely (too generic; `Popular Near Me` covers location-based discovery better)

---

## Phase 4: Build the Unified Discovery Feed

**Goal:** Create the new Home tab layout as a single vertical scroll with clear sections.

### Section 1: WhatsNextStrip (keep, already at top)
- No changes needed -- already shows Mine/Friends upcoming shows as horizontal chips
- This remains the hero section

### Section 2: Friends Going Highlight (NEW)
- **New component:** `FriendsGoingSection.tsx`
- **Data source:** `useFriendUpcomingShows` -- group `friendShows` by artist+date to find events where 2+ friends are attending
- **UI:** Rich image cards (reuse the existing `FriendChip` card pattern from `WhatsNextStrip`) displayed vertically, showing stacked friend avatars, artist name, venue, date, and a "Plan to go" CTA
- **Logic:** Filter friend shows to events with >= 2 friends going, sorted by date ascending
- **Fallback:** If no multi-friend events, show single-friend upcoming shows with a "Join [friend]?" framing

### Section 3: Edmtrain Personalized Feed (existing, promoted)
- Move `EdmtrainDiscoveryFeed` from a sub-tab to an inline section
- No component changes needed, just placement

### Section 4: Popular Near Me (existing, promoted)  
- Move `PopularFeedGrid` (near-me variant) from a sub-tab to an inline section
- Remove its sub-type pills (Sets/Shows/Festivals) to keep the feed lean -- default to "set"
- Add a section header: "Popular Near You"

### Final `SceneView` structure:
```text
[WhatsNextStrip]          -- My upcoming + friend upcoming chips
[FriendsGoingSection]     -- Multi-friend event highlights  
[EdmtrainDiscoveryFeed]   -- Personalized recommendations
[PopularFeedGrid]         -- Trending near user's location
```

**Changes:**
- Create `src/components/home/FriendsGoingSection.tsx` -- new component
- `SceneView.tsx` -- Rebuild to render sections vertically without sub-tabs. Slim props to only what's needed for the four sections.
- `Home.tsx` -- Update props passed to `SceneView` to match the slimmed interface

---

## Phase 5: Cold Start Experience

**Goal:** New users with no shows, no friends, and no location see useful content, not empty states.

**Changes:**
- `SceneView.tsx` -- Add a cold-start check: if user has 0 upcoming shows AND 0 following, show a welcome section with two CTAs:
  - "Plan your first show" (opens PlanShowSheet)
  - "Find friends on Scene" (navigates to Friends tab)
- Below the CTAs, still show Edmtrain + Popular Near Me so even new users get discovery content

---

## Phase 6: Cleanup and Refactor

**Goal:** Remove dead code and tighten interfaces.

**Changes:**
- `SceneView.tsx` -- Remove all unused imports (`FriendActivityFeed`, state for `feedMode`, sub-tab UI code, `PopularFeedGrid` sub-type state for explore)
- `Home.tsx` -- Remove props/hooks that are no longer passed to SceneView (activity items, explore items, etc.)
- `useHomeStats.ts` -- StatPills array builder can be simplified since pills only render in My Shows now (no tour-related logic needed)
- Verify `ContentPillNav` needs no changes (it doesn't -- tab definitions stay the same)

---

## Technical Details

### New Component: `FriendsGoingSection`
```
Props:
  - friendShows: FriendShow[]
  - onPlanShow: () => void
  - onViewDetails: (show) => void

Logic:
  - Group friendShows by (artist_name + show_date) key
  - Filter groups with >= 2 friends
  - Render as vertical cards with stacked avatars
  - Reuse FriendAvatarStack pattern from WhatsNextStrip
  - Empty state: "Your friends haven't shared plans yet"
```

### Props Removed from SceneView
- `statPills`, `statsLoading`, `onPillTap`, `showsTourActive`, `showsRef` (moved to MyShows)
- `activityItems`, `activityLoading`, `followingCount`, `onFindFriends`, `onIWasThere` (moved to Friends)
- `exploreItems`, `exploreTotalUsers`, `exploreLoading` (removed entirely)

### Props Added to MyShowsView
- `statPills`, `statsLoading`, `onPillTap`

### Files Modified
- `src/components/home/SceneView.tsx` (major rewrite)
- `src/components/Home.tsx` (prop routing changes)
- `src/components/home/MyShowsView.tsx` (add StatPills header)
- `src/components/home/FriendsPanelView.tsx` (add activity feed)

### Files Created
- `src/components/home/FriendsGoingSection.tsx`

### Files Unchanged
- `ContentPillNav.tsx`, `WhatsNextStrip.tsx`, `EdmtrainDiscoveryFeed.tsx`, `PopularFeedGrid.tsx`, `FriendActivityFeed.tsx`, `StatPills.tsx` -- all reused as-is

---

## Execution Order
Phases 1-3 are independent cleanup moves that can be done sequentially with verification between each. Phase 4 is the main build. Phase 5 adds polish. Phase 6 is final cleanup. Each phase will be verified before moving to the next.
