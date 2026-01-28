

# Review-First UX: Card Tap Opens ShowReviewSheet

## Overview
Update the card tap behavior across the app so that tapping a show card opens the **ShowReviewSheet** (review details) as the primary destination. Sharing to Instagram becomes a secondary action from within the review sheet, or via the dedicated Instagram button on cards (which remains a 1-tap shortcut to PhotoOverlayEditor).

## Current vs. Proposed Flow

```text
CURRENT:
┌─────────────┐     ┌─────────────────────┐
│ Tap Card    │ ──► │ PhotoOverlayEditor  │  (Share-first)
└─────────────┘     └─────────────────────┘

PROPOSED:
┌─────────────┐     ┌─────────────────────┐     ┌─────────────────────┐
│ Tap Card    │ ──► │ ShowReviewSheet     │ ──► │ PhotoOverlayEditor  │
└─────────────┘     └─────────────────────┘     └─────────────────────┘
                           │
                           └─► View ratings, notes, photo, rank
```

## Implementation Details

### 1. Update Card Tap Handler in Home.tsx

Change `handleShowTap()` to open ShowReviewSheet instead of the share flow:

**Current (lines 119-122):**
```typescript
const handleShowTap = (show: Show) => {
  handleShareFromCard(show);
};
```

**New:**
```typescript
const handleShowTap = (show: Show) => {
  setReviewShow(show);
  setReviewSheetOpen(true);
};
```

This affects:
- Stacked memory cards on Home page (body tap)
- Ranking cards on Top Ranked Shows page (body tap)

---

### 2. Update ShowReviewSheet Share Button

The current "Share Photo" button opens `ShareShowSheet`. Update it to open `PhotoOverlayEditor` instead for a seamless photo-editing experience.

**Current approach in ShowReviewSheet:**
- Has internal `ShareShowSheet` state that opens when "Share Photo" is clicked
- Opens a text-based sharing modal

**New approach:**
- Add an `onShareToEditor` callback prop to ShowReviewSheet
- "Share Photo" button calls `onShareToEditor(show)` and closes the sheet
- Home.tsx handles this by opening PhotoOverlayEditor

**Props update in ShowReviewSheet:**
```typescript
interface ShowReviewSheetProps {
  show: Show | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (show: Show) => void;
  onShareToEditor?: (show: Show) => void; // NEW
  allShows?: Show[];
  rankings?: ShowRanking[];
}
```

**Button update in ShowReviewSheet (around line 365-375):**
```typescript
<Button
  variant="default"
  className="flex-1"
  onClick={() => {
    if (onShareToEditor && photoUrl) {
      onOpenChange(false);
      onShareToEditor(show);
    } else if (!photoUrl) {
      // If no photo, could open QuickPhotoAddSheet flow
      // For now, fall back to existing ShareShowSheet
      onOpenChange(false);
      setShareSheetOpen(true);
    }
  }}
>
  <Instagram className="h-4 w-4 mr-2" />
  Share to Instagram
</Button>
```

---

### 3. Add PhotoOverlayEditor Launch from ShowReviewSheet

In Home.tsx, pass the new callback to ShowReviewSheet:

```typescript
<ShowReviewSheet
  show={reviewShow}
  open={reviewSheetOpen}
  onOpenChange={setReviewSheetOpen}
  onEdit={handleEditShow}
  onShareToEditor={(show) => {
    if (show.photo_url) {
      setDirectEditShow(show);
      setDirectEditOpen(true);
    } else {
      setQuickPhotoShow(show);
      setQuickPhotoOpen(true);
    }
  }}
  allShows={shows}
  rankings={rankings}
/>
```

---

### 4. Update StackedShowCard for Clarity

The current StackedShowCard has two actions on expanded cards:
- **Share button** (Instagram icon) → PhotoOverlayEditor
- **View button** (Eye icon) → ShowReviewSheet

Since tapping the card now opens ShowReviewSheet (same as View), the View button becomes redundant. We have two options:

**Option A: Remove View button entirely**
- Card tap = ShowReviewSheet
- Share button = PhotoOverlayEditor

**Option B: Keep View button for explicit intent**
- Both card tap and View button go to ShowReviewSheet
- Share button = PhotoOverlayEditor

Recommended: **Option A** - Remove the View button to reduce clutter. The card tap is the primary action, and the Share button is the secondary shortcut.

**Changes to StackedShowCard.tsx:**
- Remove the `onView` prop and View button
- The `onTap` handler now opens review details (handled by parent)
- The `onShare` handler opens PhotoOverlayEditor (unchanged)

---

## Files to Edit

| File | Changes |
|------|---------|
| `src/components/Home.tsx` | Update `handleShowTap()` to open ShowReviewSheet; pass `onShareToEditor` callback to ShowReviewSheet |
| `src/components/ShowReviewSheet.tsx` | Add `onShareToEditor` prop; update Share button to call it |
| `src/components/home/StackedShowCard.tsx` | Remove `onView` prop and View button |

---

## Updated User Flows

### Home Page - Stacked Memory Cards
```text
User taps expanded card → ShowReviewSheet opens
  → User sees photo, score, ratings, notes, rank
  → User taps "Share to Instagram" → PhotoOverlayEditor opens
  → User customizes and shares
  
User taps "Share" button on card → PhotoOverlayEditor opens (shortcut)
```

### Top Ranked Shows Page
```text
User taps card → ShowReviewSheet opens
  → User reviews details
  → User taps "Share to Instagram" → PhotoOverlayEditor opens
  
User taps Instagram icon on card → PhotoOverlayEditor opens (shortcut)
```

### #1 Show Pill on Home
```text
User taps #1 Show pill → ShowReviewSheet opens (already correct)
```

---

## Visual Summary

```text
┌─────────────────────────────────────────────┐
│           Stacked Show Card                 │
│  ┌──────────────────────────────────────┐   │
│  │       [Photo or Gradient]            │   │
│  │                                      │   │
│  │    Artist Name                       │   │
│  │    Venue · Date                      │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  [Instagram Share]              [Rank #3]   │  ← View button removed
│                                             │
└─────────────────────────────────────────────┘
         │                            │
         │                            │
    Tap Card                    Tap Share
         │                            │
         ▼                            ▼
┌─────────────────┐       ┌─────────────────────┐
│ ShowReviewSheet │       │ PhotoOverlayEditor  │
│                 │       │                     │
│  Photo          │       │  [Edit & Share]     │
│  Score: 8.5/10  │       │                     │
│  Ratings...     │       └─────────────────────┘
│  Notes...       │
│                 │
│ [Share to IG]   │──────►  PhotoOverlayEditor
└─────────────────┘
```

