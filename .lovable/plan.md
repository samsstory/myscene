
# Edit Show UX Refinement: Pencil Button & Photo Priority

## Status: ✅ COMPLETED

## Overview

Streamlined the edit flow by making the pencil icon in the ShowReviewSheet open the full edit dialog (AddShowFlow) and reordered the edit options to prioritize photo editing.

| Change | Previous Behavior | New Behavior |
|--------|------------------|--------------|
| Pencil icon (top-left) | Opened file picker for photo change | Opens Edit Show dialog |
| "Edit Review" button | Visible in bottom actions | Removed |
| Photo option in Edit dialog | 4th position (after Artists) | 1st position (before Venue) |

## Changes Made

### 1. HeroPhotoSection Pencil Button
- Replaced `onChangePhoto` prop with `onEditShow`
- Pencil button now opens Edit Show dialog instead of file picker

### 2. ShowReviewSheet
- Added `handleEditShow` handler that closes sheet and opens edit dialog
- Wired up `onEditShow` prop to HeroPhotoSection
- Removed "Edit Review" button from bottom actions row

### 3. AddShowFlow Step Selector Reorder
- Photo option moved to first position
- New order: Photo → Venue → Date → Artists → Details & Notes

## Files Modified

| File | Changes |
|------|---------|
| `src/components/show-review/HeroPhotoSection.tsx` | Replaced `onChangePhoto` prop with `onEditShow` |
| `src/components/ShowReviewSheet.tsx` | Added `handleEditShow`, wired up `onEditShow`, removed "Edit Review" button |
| `src/components/AddShowFlow.tsx` | Moved Photo option to first position in step selector |
