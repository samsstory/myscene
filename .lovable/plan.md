

# Phase 4: Build FriendsGoingSection and Integrate into Discovery Feed

## What We're Building
A new "Friends Going" section that sits between the WhatsNextStrip and the Edmtrain feed on the Home tab. It highlights events where your friends are planning to attend, encouraging social coordination.

## Changes

### 1. Create `src/components/home/FriendsGoingSection.tsx` (New File)

A standalone component that receives `friendShows` data and renders grouped event cards.

**Grouping logic:** Groups `FriendShow[]` by composite key `artist_name + show_date` to find events with multiple friends. Events with 2+ friends show first (sorted by date), followed by single-friend events with a "Join [friend]?" framing.

**Card design:** Reuses the same visual pattern as the existing `FriendChip` in `WhatsNextStrip` -- artist image background with gradient overlay, stacked friend avatars (top-left), artist name, friend going label, date and venue. Each card includes a "Plan to go" quick-add button (top-right) that saves the event to the user's upcoming shows.

**Empty state:** If no friend shows at all, renders a subtle message: "Your friends haven't shared plans yet."

**Key reuse:** Imports `FriendShow` type from `useFriendUpcomingShows`. Avatar stack rendering follows the same pattern already in `WhatsNextStrip` (3 visible + overflow count).

### 2. Update `src/components/home/SceneView.tsx`

Add new props to the interface:
- `friendShows: FriendShow[]` -- the flat array of friend upcoming shows
- `onAddFriendShowToSchedule: (show: FriendShow) => void` -- callback when user taps "Plan to go"

Insert `FriendsGoingSection` between `WhatsNextStrip` and the Edmtrain section with a section header "Friends Going".

### 3. Update `src/components/Home.tsx`

Pass `friendShows` (already available from `useFriendUpcomingShows`) and a handler for adding friend shows to the user's schedule down to `SceneView`.

The handler reuses the existing `saveUpcomingShow` function from `usePlanUpcomingShow` -- same pattern as `handleEdmtrainAddToSchedule`.

## Technical Details

**Files created:**
- `src/components/home/FriendsGoingSection.tsx`

**Files modified:**
- `src/components/home/SceneView.tsx` (add props + section)
- `src/components/Home.tsx` (pass friendShows + handler)

**No new dependencies or database changes required.** All data sources (`useFriendUpcomingShows`, `usePlanUpcomingShow`) are already wired up in `Home.tsx`.

**Component structure after this phase:**
```text
SceneView
  WhatsNextStrip           -- user's upcoming + friend chips (horizontal scroll)
  FriendsGoingSection      -- grouped friend events (vertical cards) [NEW]
  EdmtrainDiscoveryFeed    -- personalized recs
  PopularFeedGrid          -- trending near user
```
