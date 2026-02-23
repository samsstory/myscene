

# Scene — Home Tab Rebuild Plan

## Completed Phases

### ✅ Phase 4: FriendsGoingSection + Discovery Feed Integration
- Created `FriendsGoingSection.tsx` — grouped friend event cards with avatar stacks and "Plan to go" button
- Updated `SceneView.tsx` — added FriendsGoingSection between WhatsNextStrip and Edmtrain feed
- Updated `Home.tsx` — passes `friendShows` and `onAddFriendShowToSchedule` handler

### ✅ Phase 5: Cold Start Experience
- Added cold-start detection in `SceneView.tsx` (`hasNoUpcoming && hasNoFollowing`)
- Welcome section with two CTAs: "Plan your first show" and "Find friends"
- Discovery feeds (Edmtrain + Popular Near Me) still render below for new users

### ✅ Phase 6: Cleanup and Refactor
- Removed dead imports and unused state from `SceneView.tsx`
- Cleaned up `Home.tsx` — removed unused imports (`Button`, `ArrowLeft`, `AddShowPrefill`)
- Tightened interfaces between Home → SceneView

---

## Phase 7: Polish & Engagement Ideas

### 7a. WhatsNextStrip empty-state improvement
When user has upcoming shows but no friends following, show a subtle inline nudge in the WhatsNextStrip: "Invite friends to see who's going to the same shows."

### 7b. FriendsGoingSection tap-through
Tapping a FriendsGoingSection card should open `UpcomingShowDetailSheet` pre-filled with the friend show details, reusing the existing sheet.

### 7c. Animated transitions for cold-start → populated
When a user adds their first show or follows their first friend, animate the cold-start section out and the normal feed in (cross-fade with framer-motion).

### 7d. "You're both going" badge
On WhatsNextStrip cards, if a friend is also attending the same event, overlay a small badge showing mutual attendance.

### 7e. Home tab loading skeleton
Add a lightweight skeleton/shimmer state for SceneView while `upcomingShows`, `friendShows`, and `nearMeItems` are loading, instead of showing nothing.
