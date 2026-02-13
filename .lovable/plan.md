

# Smart Show Recognition: "Was this at...?" Confirmation UX

## Overview

When a user uploads a **single photo** with GPS metadata, instead of dropping them straight into the manual review form, we insert a beautiful confirmation step that shows the photo prominently and asks: **"Was this at [Venue]?"** with the detected date and city. One tap to confirm, or escape to manual search.

This leverages the existing venue-matching infrastructure (EXIF GPS to `match-venue-from-location` edge function) but wraps it in a much more delightful, high-confidence UX that feels like magic.

## User Flow

```text
Photo Selected
      |
      v
  Has GPS? ──No──> Existing review flow (unchanged)
      |
     Yes
      |
      v
  Match venue from coordinates
      |
      v
  Found venue? ──No──> Existing review flow
      |
     Yes
      |
      v
  ┌─────────────────────────────┐
  │  [Photo displayed large]    │
  │                             │
  │  "Was this at              │
  │   Factory Town             │
  │   during Art Basel?"       │
  │                             │
  │  Dec 6, 2024 · Miami, FL   │
  │                             │
  │  [Yes, that's right]       │
  │   No, let me search...     │
  └─────────────────────────────┘
      |              |
    Yes              No
      |              |
      v              v
  Pre-fill venue   Standard review
  + date, go to    (blank venue)
  artist entry
```

Multi-photo uploads skip this step entirely and use the existing bulk review flow.

## What Gets Built

### 1. New Component: `src/components/bulk-upload/SmartMatchStep.tsx`

A full-screen-feel confirmation card that renders:
- The uploaded photo displayed large with rounded corners
- A glassmorphism suggestion card below with:
  - Location pin icon + "Was this at" label
  - **Venue name** in bold (e.g., "Factory Town")
  - Optional event context line (if we can detect a festival from the venue name or nearby shows)
  - Date from EXIF + city from venue address in muted text
  - Gradient "Yes, that's right" confirmation button (matching the FAB gradient style)
  - "No, let me search..." text link below
- Loading state while venue matching is in progress (skeleton card with subtle pulse)

### 2. Modified: `src/components/BulkUploadFlow.tsx`

- Add a new step `'smart-match'` between `'select'` and `'review'`
- When a single photo with GPS is selected, route to `'smart-match'` instead of `'review'`
- On confirm: pre-populate the photo's venue data and proceed to `'review'` with venue already filled
- On reject: proceed to `'review'` with venue cleared so user can search manually
- Multi-photo uploads bypass this step entirely

### 3. Modified: `src/components/bulk-upload/BulkReviewStep.tsx`

- No structural changes needed -- the existing venue pre-fill via `photo.suggestedVenue` handles the confirmed data naturally

## Technical Details

### Smart Match Step Logic

1. On mount, call `matchVenuesForPhotos([photo])` (existing hook) to get venue suggestion
2. Extract date from `photo.exifData.date` (already available)
3. Extract city from the venue's address (split on comma, take second-to-last part)
4. Display the confirmation UI
5. On "Yes": update the photo object with `suggestedVenue` and `venueMatchStatus: 'found'`, then advance
6. On "No": clear venue data and advance to standard review

### Event/Festival Detection (Stretch)

Query existing shows in the database at the same venue within +/- 2 days to see if other users logged the same event. If matches exist, surface the artist names in the suggestion (e.g., "during Art Basel" or "to see Circoloco"). This is additive and can be a follow-up.

### No New Backend Changes

The existing `match-venue-from-location` edge function and `useVenueFromLocation` hook provide everything needed. No new database tables, no new edge functions.

### Styling

- Photo: full-width with `rounded-2xl overflow-hidden` and subtle shadow
- Suggestion card: `bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl`
- Confirm button: same gradient as the FAB (`from-primary via-primary to-[hsl(250,80%,60%)]`) with glow shadow
- "No" link: `text-sm text-white/40 hover:text-white/60`
- Loading skeleton: pulsing placeholder blocks matching the card layout

