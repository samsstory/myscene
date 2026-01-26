
# Plan: Bulk Upload UX Improvements

## Overview
This plan addresses 4 UX issues in the bulk upload photo review flow based on user feedback.

---

## Task 1: Fix Venue Search Not Providing Suggestions

**Problem**: When typing in the venue field, search suggestions no longer appear.

**Root Cause**: The venue search only triggers when `showManualSearch` is `true` (line 226). When there are no GPS-detected venue suggestions, the input shows but search mode isn't properly activated.

**Solution**:
- Modify the search logic to trigger for both manual search mode AND when there are no venue suggestions available
- When the venue input is shown without suggestions (no GPS data), automatically enable search functionality

**File**: `src/components/bulk-upload/PhotoReviewCard.tsx`
- Update the `useEffect` for venue search (line 225-252) to trigger when either:
  - `showManualSearch` is true, OR
  - `!hasVenueSuggestions` (no GPS-suggested venues)
- Update the venue input section to enable search when no suggestions are available

---

## Task 2: Add Calendar View for "Exact" Date Mode

**Problem**: Clicking "Exact" shows a native date input with "mm/dd/yyyy" format which isn't intuitive for selecting dates.

**Solution**:
- Replace the native date input with a Popover containing the existing `Calendar` component
- Show a clickable button that displays the selected date or "Select date" placeholder
- Calendar opens in a popover when clicked, allowing visual date selection

**File**: `src/components/bulk-upload/CompactDateSelector.tsx`
- Import `Popover`, `PopoverContent`, `PopoverTrigger` from `@/components/ui/popover`
- Import `Calendar` from `@/components/ui/calendar`
- Import `CalendarIcon` from `lucide-react`
- Replace the native `<input type="date">` with a Popover-based calendar picker
- Format display date using `date-fns` format function

**New UI for Exact mode**:
```
┌────────────────────────────────────┐
│ 📅 Select date          ▼         │  ← Opens calendar popover on click
└────────────────────────────────────┘
```

---

## Task 3: Add Confirm Button to Rating Section

**Problem**: After entering ratings and notes, there's no clear way to confirm/save and close the section.

**Solution**:
- Add a "Done" button with a checkmark icon at the bottom of the ratings section
- Clicking it closes the ratings section and shows a visual indicator that ratings were saved

**File**: `src/components/bulk-upload/PhotoReviewCard.tsx`
- Import `Check` icon from `lucide-react`
- Add a "Done" button at the bottom of the ratings section (after the notes textarea)
- Button should call `setShowRatings(false)` to close the section
- Style with primary color to indicate it's the confirmation action

**New UI**:
```
┌────────────────────────────────────┐
│  Performance    ① ② ③ ④ ⑤         │
│  Sound          ① ② ③ ④ ⑤         │
│  ...                               │
│  My Take                           │
│  ┌──────────────────────────────┐  │
│  │ Add your thoughts...         │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌──────────────────────────────┐  │
│  │        ✓ Done                │  │  ← New confirm button
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

---

## Task 4: Improve Required Field Clarity

**Problem**: 
- The orange "Add Artist" text isn't clearly understood as a warning
- The artist field isn't obviously marked as the only required field

**Solution A - Change collapsed header text**:
- Change "Add Artist" to "Add Info" when no artist is selected
- This makes it clearer that info needs to be added without being confusing

**Solution B - Mark artist field as required**:
- Add an asterisk (*) to the artist input placeholder: "Add artists... *"
- Add a subtle "(required)" label next to the artist input
- Keep other fields without asterisks to show they're optional

**File**: `src/components/bulk-upload/PhotoReviewCard.tsx`
- Line 293: Change `"Add Artist"` to `"Add Info"`
- Line 374: Add a label above the artist input showing it's required

**Updated UI**:
```
┌────────────────────────────────────┐
│  [📷]  Add Info                    │  ← Orange "Add Info" when empty
└────────────────────────────────────┘

Expanded:
┌────────────────────────────────────┐
│  Artist *                          │  ← Small required indicator
│  ┌──────────────────────────────┐  │
│  │ Add artists...               │  │
│  └──────────────────────────────┘  │
│  ┌──────────────────────────────┐  │
│  │ Search venue...              │  │  ← No asterisk (optional)
│  └──────────────────────────────┘  │
└────────────────────────────────────┘
```

---

## Summary of Changes

| File | Changes |
|------|---------|
| `src/components/bulk-upload/PhotoReviewCard.tsx` | Fix venue search trigger, add ratings "Done" button, change "Add Artist" → "Add Info", add required indicator |
| `src/components/bulk-upload/CompactDateSelector.tsx` | Replace native date input with Calendar popover for exact mode |

---

## Implementation Order
1. **Task 1**: Fix venue search (quick fix, improves core functionality)
2. **Task 2**: Add calendar popover (improves date UX significantly)
3. **Task 3**: Add ratings confirm button (small UX improvement)
4. **Task 4**: Improve field clarity (copy/label changes)

