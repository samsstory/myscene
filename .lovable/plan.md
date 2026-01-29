

## Link Instagram Share to Photo Editor & Remove ShareShowSheet

### Overview
This change will simplify the sharing flow by:
1. Making the "Share to Instagram" button on the ShowReviewSheet always go directly to the PhotoOverlayEditor
2. Completely removing the now-obsolete `ShareShowSheet` component from the codebase

### Current Behavior
- **ShowReviewSheet**: When "Share to Instagram" is clicked:
  - If `onShareToEditor` prop exists AND photo exists → Goes to PhotoOverlayEditor
  - Otherwise → Opens the `ShareShowSheet` (the page in your second screenshot)
- **ShareShowSheet**: A separate "Share Show" page with "Download Share Image" and "Copy Share Text" buttons

### New Behavior
- **ShowReviewSheet**: When "Share to Instagram" is clicked → Always goes to PhotoOverlayEditor (regardless of photo)
- **ShareShowSheet**: Deleted entirely - no longer used anywhere

---

### Changes Required

#### 1. Update ShowReviewSheet.tsx
**Purpose**: Change share button behavior to always call `onShareToEditor`

- Remove the `shareSheetOpen` state variable
- Remove the `ShareShowSheet` import and component usage
- Modify `handleShareClick()` to always call `onShareToEditor(show)` - no fallback to ShareShowSheet
- The PhotoOverlayEditor can already handle shows without photos by generating a text-based card

#### 2. Update Home.tsx
**Purpose**: Ensure `onShareToEditor` prop is always passed to ShowReviewSheet

- The `handleShareFromCard` function already routes correctly:
  - Shows with photos → PhotoOverlayEditor
  - Shows without photos → QuickPhotoAddSheet
- Remove unused `ShareShowSheet` import and component usage (currently only used for `handleShareWithoutPhoto`)
- Update `handleShareWithoutPhoto` to go to PhotoOverlayEditor instead

#### 3. Update Dashboard.tsx
**Purpose**: Remove ShareShowSheet usage from success flow

- Remove `ShareShowSheet` import
- Remove `shareShow` and `shareSheetOpen` state
- Update the success flow callback to use PhotoOverlayEditor instead

#### 4. Delete ShareShowSheet.tsx
**Purpose**: Remove the obsolete component file entirely

- Delete `src/components/ShareShowSheet.tsx`

---

### Technical Details

```text
Files to modify:
├── src/components/ShowReviewSheet.tsx
│   ├── Remove: import { ShareShowSheet }
│   ├── Remove: shareSheetOpen state
│   ├── Update: handleShareClick → always use onShareToEditor
│   └── Remove: <ShareShowSheet /> component at bottom
│
├── src/components/Home.tsx
│   ├── Remove: import { ShareShowSheet }
│   ├── Remove: shareShow, shareSheetOpen state
│   ├── Update: handleShareWithoutPhoto → use PhotoOverlayEditor
│   └── Remove: <ShareShowSheet /> component
│
├── src/pages/Dashboard.tsx
│   ├── Remove: import { ShareShowSheet }
│   ├── Remove: shareShow, shareSheetOpen state
│   ├── Update: onShareShow callback in success flow
│   └── Remove: <ShareShowSheet /> component
│
└── src/components/ShareShowSheet.tsx
    └── DELETE entire file
```

### Edge Cases
- **Shows without photos**: The PhotoOverlayEditor will still open and can generate a text-based overlay card
- **QuickPhotoAddSheet flow**: When user clicks "Save" after not uploading a photo, they simply return to the list (current behavior is correct)

