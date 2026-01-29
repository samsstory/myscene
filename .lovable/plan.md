
# Add "Incomplete Ratings" Notification & Multi-Show Review View

## Overview
Add a new notification insight on the Home page that surfaces shows with incomplete detailed ratings (missing any of the 5 categories: artist performance, sound, lighting, crowd, venue vibe). When tapped, it opens a multi-show review view similar to the bulk upload review UI, allowing users to quickly complete ratings for multiple shows.

## What You'll Get
- A new notification card on the Home page showing how many shows need rating completion
- Tapping the notification opens a fullscreen sheet with a list of incomplete shows
- Each show appears as an expandable card (same style as bulk upload) where you can fill in missing ratings
- Progress indicator showing how many shows are complete
- Save all changes at once with a single button

## Implementation Details

### 1. Update Insight Types & Data Model

**File: `src/components/home/DynamicInsight.tsx`**
- Add new insight type: `'incomplete_ratings'`
- Add new action type: `'incomplete-ratings'`
- Add Star icon for the incomplete ratings insight

**File: `src/hooks/useHomeStats.ts`**
- Add new stat: `incompleteRatingsCount` - count of shows missing any of the 5 detailed ratings
- Store array of incomplete show IDs for passing to the view
- Update insight priority logic:
  1. Welcome (0 shows)
  2. Milestones (25, 50, 100, 200)
  3. Incomplete Ratings (when count >= 1) - NEW
  4. Ranking Reminder (unranked >= 3)
  5. Streak (>= 2 months)

### 2. Create Incomplete Ratings Review Component

**New File: `src/components/home/IncompleteRatingsSheet.tsx`**
- Full-screen sheet (90vh height) similar to ShowReviewSheet
- Header with back button and title "Complete Your Ratings"
- Progress indicator: "X of Y complete"
- Scrollable list of expandable cards (accordion style)
- Each card shows:
  - Collapsed: Photo thumbnail, artist name, venue name, completion indicator
  - Expanded: The 5 rating categories as tappable pill buttons (1-5)
- "Save All" button at bottom (enabled when at least one rating changed)

**Card Design:**
- Uses the same compact rating pills from bulk upload (`CompactRatingPills`)
- Visual indicator for which ratings are already filled vs empty
- Auto-expands first incomplete card

### 3. Wire Up Home Component

**File: `src/components/Home.tsx`**
- Add state for incomplete ratings sheet: `incompleteRatingsOpen`
- Add state for incomplete shows list: `incompleteShows`
- Update `handleInsightAction` to handle `'incomplete-ratings'` action
- Fetch incomplete shows when sheet opens
- Pass update handler to save ratings back to database

### 4. Database Interaction

**Query to identify incomplete shows:**
```sql
SELECT * FROM shows 
WHERE user_id = $userId
AND (
  artist_performance IS NULL 
  OR sound IS NULL 
  OR lighting IS NULL 
  OR crowd IS NULL 
  OR venue_vibe IS NULL
)
ORDER BY show_date DESC
```

**Update on save:**
- Batch update all modified shows in a single transaction
- Only update shows that have all 5 ratings now filled

## File Changes Summary

| File | Action |
|------|--------|
| `src/components/home/DynamicInsight.tsx` | Modify - add new insight type |
| `src/hooks/useHomeStats.ts` | Modify - add incomplete ratings count & priority |
| `src/components/home/IncompleteRatingsSheet.tsx` | Create - new multi-show rating UI |
| `src/components/Home.tsx` | Modify - handle new insight action, manage sheet state |

## UI Flow

```text
Home Page
    |
    v
[DynamicInsight Card]
"X Shows Need Ratings"
"Tap to complete your show reviews"
    |
    v (tap)
[IncompleteRatingsSheet - Full Screen]
+-----------------------------------+
| <- Complete Your Ratings          |
|                                   |
| 3 of 7 complete                   |
|                                   |
| +-------------------------------+ |
| | [img] Fred Again @ MSG        | |
| |       ●●●○○  (3/5 rated)      | |
| +-------------------------------+ |
| | [img] Rufus Du Sol            | | <- expanded
| |       @ Red Rocks             | |
| |                               | |
| | Artist  [1][2][3][4][5]       | |
| | Sound   [1][2][3][4][5]       | |
| | Lighting [●][●][●][ ][ ]      | |
| | Crowd   [1][2][3][4][5]       | |
| | Vibe    [1][2][3][4][5]       | |
| +-------------------------------+ |
| | [img] Jamie XX @ Printworks   | |
| +-------------------------------+ |
|                                   |
| [     Save All Changes     ]      |
+-----------------------------------+
```

## Technical Considerations

- **Performance**: Fetch incomplete shows on-demand when sheet opens, not on every home page load
- **State Management**: Track local edits in component state, batch save to database
- **UX Polish**: Haptic feedback on rating taps, smooth accordion transitions
- **Edge Case**: If all shows become complete after saving, auto-close sheet and show success toast
