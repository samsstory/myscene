
# Enhance Bulk Upload Success Screen

## Overview
Add post-save action cards to the bulk upload success screen that mirror the single show flow, adapted for the multi-show context.

## Changes to Add

### 1. Share to Instagram Card
- **Title**: "Share Your Shows"
- **Subtitle**: "Create stories and posts from your Feed"
- **Action**: Close dialog and navigate to Feed tab
- **Rationale**: Since multiple shows were added (each with a photo), users should go to the Feed where they can tap the Instagram icon on any individual show card to open the photo overlay editor for that specific show

### 2. Rank Your Shows Card  
- **Title**: "Rank Your Shows"
- **Subtitle**: "Compare them against your collection"
- **Action**: Close dialog and navigate to Rank tab
- **Rationale**: Prompts users to use the head-to-head ranking system to place their new shows in context

### 3. Keep Existing Actions
- "Add More Shows" button (outline style)
- "Done" button (primary style)

## Visual Layout
```text
+----------------------------------+
|  [Success Icon with PartyPopper] |
|                                  |
|     "3 shows added!"             |
|                                  |
| Don't forget to share your       |
| memories and review on Instagram.|
|                                  |
| +------------------------------+ |
| | [Instagram] Share Your Shows | |
| | Create stories and posts...  | |
| +------------------------------+ |
|                                  |
| +------------------------------+ |
| | [Trophy]   Rank Your Shows   | |
| | Compare them against your... | |
| +------------------------------+ |
|                                  |
| [+ Add More Shows] (outline btn) |
| [      Done      ] (primary btn) |
+----------------------------------+
```

## Technical Implementation

### File: `src/components/bulk-upload/BulkSuccessStep.tsx`
- Add new props: `onViewFeed` and `onRank`
- Import `Instagram`, `Trophy`, and `Card`/`CardContent` from UI components
- Add two clickable Card components styled like the single show SuccessStep
- Keep existing Button components for "Add More Shows" and "Done"

### File: `src/components/BulkUploadFlow.tsx`
- Add new props: `onNavigateToFeed` and `onNavigateToRank`
- Pass these to `BulkSuccessStep` as `onViewFeed` and `onRank`
- Each handler should close the dialog first, then navigate

### File: `src/pages/Dashboard.tsx`
- Update `BulkUploadFlow` props to include navigation callbacks:
  - `onNavigateToFeed`: closes dialog, sets `activeTab` to "feed"
  - `onNavigateToRank`: closes dialog, sets `activeTab` to "rank"

## Summary of Changes
| File | Change |
|------|--------|
| `BulkSuccessStep.tsx` | Add Share and Rank cards with new callbacks |
| `BulkUploadFlow.tsx` | Accept and forward navigation callbacks |
| `Dashboard.tsx` | Provide navigation callbacks to BulkUploadFlow |
