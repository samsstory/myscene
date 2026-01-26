
# Plan: Add Flexible Date Selection to Bulk Upload Cards

## Overview
Replace the basic native date input in bulk upload `PhotoReviewCard` with a compact, flexible date selection UI that matches the single-show flow's capability - allowing users to specify exact dates, month+year, or year-only when EXIF metadata is missing.

## Technical Approach

### Design for Compact Cards
Since bulk upload cards need to stay compact (unlike the full DateStep which takes a whole screen), we'll use a **segmented approach**:

1. **Default state**: Show a compact date display or "Add date" button
2. **Tapping expands**: Reveal inline date selection options
3. **Three precision modes**:
   - **Exact date**: Native date picker (quick for photos with known dates)
   - **Month + Year**: Two dropdowns for approximate dates
   - **Year only**: Single dropdown for very old shows

### UI Components

```
┌─────────────────────────────────────────┐
│ Date (optional)                         │
│ ┌─────────────────────────────────────┐ │
│ │ [Exact] [Month/Year] [Year Only]    │ │  ← Segmented toggle
│ └─────────────────────────────────────┘ │
│                                         │
│ (Based on selection, show either:)      │
│  - Native date input (exact)            │
│  - Month + Year dropdowns (approximate) │
│  - Year dropdown only (unknown)         │
└─────────────────────────────────────────┘
```

### State Changes

**PhotoReviewCard.tsx updates:**
- Add `datePrecision` state: `'exact' | 'approximate' | 'unknown'`
- Add `selectedMonth` and `selectedYear` states for approximate modes
- Replace single date input with precision-aware UI
- Auto-detect mode: If photo has EXIF date → exact, otherwise → show picker

**ReviewedShow interface updates:**
- Add `datePrecision: string` field (already has `isApproximate` but need full precision)
- Add `selectedMonth?: string` and `selectedYear?: string` for approximate dates

**useBulkShowUpload.ts updates:**
- Construct `show_date` based on precision:
  - `exact`: Use the full date
  - `approximate`: Set to 1st of selected month/year
  - `unknown`: Set to January 1st of selected year
- Pass correct `date_precision` value to database

### Implementation Details

1. **CompactDateSelector** component (new internal component):
   - Three-segment toggle for precision mode
   - Renders appropriate inputs based on mode
   - Stays compact (single row for toggle, single row for input)

2. **Auto-detection logic**:
   - If photo has EXIF date: Pre-fill exact date, show in exact mode
   - If no EXIF date: Default to approximate mode with current year pre-selected

3. **Date construction for database**:
   ```typescript
   // Exact: use selected date
   // Approximate: first of month (e.g., "2024-06-01")
   // Unknown: January 1st of year (e.g., "2024-01-01")
   ```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/bulk-upload/PhotoReviewCard.tsx` | Replace date input with CompactDateSelector, add precision states |
| `src/hooks/useBulkShowUpload.ts` | Update date construction logic for different precisions |

## User Experience

1. **Photo with EXIF data**: Date auto-fills, user sees exact date displayed
2. **Photo without EXIF data**: Shows "Add date" with approximate mode ready
3. **User wants to change**: Tap to expand, select precision mode, pick date/month/year
4. **Optional field**: Users can skip entirely if they don't remember at all
