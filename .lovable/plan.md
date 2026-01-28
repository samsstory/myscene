

# Plan: Direct-to-Share Flow (Removing ShowReviewSheet as Middleman)

## Overview

This plan removes the `ShowReviewSheet` as a redundant intermediary in the user flow. Instead of requiring users to tap a card → view review sheet → find share option, we'll route taps directly to the appropriate action based on whether the show has a photo.

## Current State Analysis

### Flow Today
```text
┌─────────────────┐     ┌──────────────────┐     ┌────────────────────┐
│  Tap Show Card  │ ──► │ ShowReviewSheet  │ ──► │ PhotoOverlayEditor │
│                 │     │ (middleman)      │     │ or Edit flow       │
└─────────────────┘     └──────────────────┘     └────────────────────┘
```

### Problems Identified
1. **ShowReviewSheet duplicates information** already visible on expanded cards (artist, venue, date, score)
2. **Missing share actions** - no Instagram/Friends share buttons, creating a "dead end"
3. **Photo upload competes with share flow** - confusing UX mixing management with sharing
4. **Extra tap required** to reach the actual destination (editor or share)

## Proposed New Flow

```text
┌─────────────────┐            ┌────────────────────┐
│  Tap Show Card  │ ──photo──► │ PhotoOverlayEditor │
│  (with photo)   │            │ (Direct!)          │
└─────────────────┘            └────────────────────┘

┌─────────────────┐            ┌──────────────────────┐
│  Tap Show Card  │ ──no photo─► │ Add Photo & Share    │
│  (no photo)     │            │ (Simplified Flow)    │
└─────────────────┘            └──────────────────────┘
```

## Implementation Steps

### Step 1: Update StackedShowCard Tap Behavior

**File:** `src/components/home/StackedShowCard.tsx`

**Changes:**
- The "View" button becomes the edit entry point (for users who want to see details/edit)
- The card body tap routes directly based on photo status:
  - **With photo:** Opens PhotoOverlayEditor immediately
  - **Without photo:** Opens simplified photo-add sheet

**The expanded card will have:**
- **Card body tap** → Share flow (main action)
- **"View" button** → Opens edit flow (for managing show details)
- **"Share" button** → Same as card tap (explicit fallback)

### Step 2: Create New `QuickPhotoAddSheet` Component

**File:** `src/components/QuickPhotoAddSheet.tsx` (new)

This lightweight sheet replaces ShowReviewSheet for shows without photos:
- Large "Add Photo" area with camera/upload prompt
- Shows minimal context (artist name, venue, date)
- After photo is added → transitions to PhotoOverlayEditor
- "Share without photo" option → opens ShareShowSheet for text sharing

### Step 3: Update Home.tsx Routing Logic

**File:** `src/components/Home.tsx`

**Changes:**
- Replace `onShowTap` handler to route based on photo presence
- Remove ShowReviewSheet from Home.tsx (or repurpose for edit-only access)
- Add new state for `quickPhotoAddShow` and `quickPhotoAddOpen`
- Update all entry points (StackedShowList, Calendar, Rankings) to use new routing

### Step 4: Update StackedShowList Interface

**File:** `src/components/home/StackedShowList.tsx`

**Changes:**
- Rename `onShowTap` to `onShowAction` (semantic clarity)
- Add optional `onShowEdit` prop for explicit edit access

### Step 5: Preserve Edit Functionality

**Where edit access moves:**
- "View" button on expanded cards → Opens AddShowFlow in edit mode
- Long-press gesture on cards (future enhancement)
- Edit button remains in PhotoOverlayEditor for shows with photos

### Step 6: Update Calendar and Rankings Views

**File:** `src/components/Home.tsx`

**Changes:**
- Calendar day clicks → Same routing (photo → editor, no photo → quick add)
- Rankings list clicks → Same routing
- Add explicit edit icons to rankings cards for direct edit access

### Step 7: Clean Up ShowReviewSheet Usage

**Options:**
- **A) Delete entirely:** Remove `ShowReviewSheet.tsx` if all functionality is absorbed
- **B) Keep as "Detail View":** Accessible only from "View Details" button for power users who want to see the full ranking section, notes, etc.

**Recommendation:** Keep it as a detail view accessible from the "View" button, but deprioritize it in the main flow.

---

## Technical Details

### New Component: QuickPhotoAddSheet

```typescript
interface QuickPhotoAddSheetProps {
  show: Show;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoAdded: (photoUrl: string) => void;
  onShareWithoutPhoto: () => void;
}
```

**UI Structure:**
1. Artist name + venue + date (minimal header)
2. Large photo upload zone (60% of sheet height)
3. "Share without photo" text link
4. After upload → auto-transition to PhotoOverlayEditor

### Updated Home.tsx State

```typescript
// New state additions
const [quickPhotoShow, setQuickPhotoShow] = useState<Show | null>(null);
const [quickPhotoOpen, setQuickPhotoOpen] = useState(false);

// Updated tap handler
const handleShowAction = (show: Show) => {
  if (show.photo_url) {
    // Direct to editor
    setDirectEditShow(show);
    setDirectEditOpen(true);
  } else {
    // Quick photo add flow
    setQuickPhotoShow(show);
    setQuickPhotoOpen(true);
  }
};
```

### StackedShowCard Changes

```typescript
// Updated click handlers
onClick={onTap} // Card body - share flow
// "View" button
onClick={(e) => {
  e.stopPropagation();
  onView?.(); // New optional prop for detail view
}}
```

---

## Files Changed Summary

| File | Action | Description |
|------|--------|-------------|
| `src/components/QuickPhotoAddSheet.tsx` | Create | New lightweight photo-add sheet |
| `src/components/home/StackedShowCard.tsx` | Modify | Update tap handlers, add View prop |
| `src/components/home/StackedShowList.tsx` | Modify | Pass through onView prop |
| `src/components/Home.tsx` | Modify | New routing logic, add QuickPhotoAddSheet |
| `src/components/ShowReviewSheet.tsx` | Keep | Accessible via "View" button only |

---

## User Experience Impact

### Before (3+ taps to share)
1. Tap card → ShowReviewSheet opens
2. Scroll/find share option (often missing)
3. Tap share → Maybe get to editor

### After (1-2 taps to share)
1. Tap card → **Immediately** in PhotoOverlayEditor (if photo exists)
2. OR Tap card → Quick add photo → Editor

### Preserved Functionality
- **Edit access:** Via "View" button on cards → ShowReviewSheet → Edit button
- **Photo management:** Upload in QuickPhotoAddSheet, change/remove in editor
- **Text sharing:** "Share without photo" option for shows lacking images
- **Ranking display:** Visible on expanded cards, detailed view in ShowReviewSheet

---

## Edge Cases Handled

1. **No photo, user wants text share:** QuickPhotoAddSheet has "Share without photo" link
2. **User wants to edit, not share:** "View" button provides detail access
3. **Bulk usage patterns:** Calendar/Rankings use same smart routing
4. **Photo upload failure:** Graceful error in QuickPhotoAddSheet with retry

