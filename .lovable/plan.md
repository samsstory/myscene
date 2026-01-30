
# Plan: Enable Full Add Show Flow in Demo Mode

## Overview
Enable demo users to upload photos and go through the complete show creation flow without requiring authentication. Shows created in demo mode will be stored temporarily in local state (not persisted to the database) so users can experience the full product flow before signing up.

## Current State Analysis
- **Demo mode** currently redirects the FAB (+ button) to the auth page with a "Sign up to add shows" tooltip
- The **authenticated flow** uses `BulkUploadFlow` for photo-based show creation, which:
  1. Allows photo selection with EXIF metadata extraction
  2. Reviews shows with venue auto-detection from GPS
  3. Uploads to Supabase storage and inserts to database
  4. Shows success screen with sharing options
- Demo data is fetched from a specific user's shows via the `get-demo-data` edge function

## Implementation Strategy: Demo-Only Local State

Rather than writing to the production database, demo-created shows will be:
1. Stored in React context/state during the session
2. Merged with the existing demo user's shows for display
3. Cleared on page refresh (ephemeral experience)

This approach:
- Avoids polluting production data with demo entries
- Demonstrates the full flow without backend complexity
- Encourages sign-up to "save" their progress

---

## Technical Implementation

### 1. Extend DemoContext with Local Shows State
**File:** `src/contexts/DemoContext.tsx`

Add state management for demo-created shows:
- `demoLocalShows`: Array of shows created during the demo session
- `addDemoShow()`: Function to add a new show to local state
- `clearDemoShows()`: Function to reset demo shows

### 2. Create Demo-Specific Bulk Upload Hook
**File:** `src/hooks/useDemoBulkUpload.ts` (new file)

Create a demo version of `useBulkShowUpload` that:
- Processes photos with EXIF extraction (reuses existing logic)
- Generates local IDs and blob URLs for photos (no Supabase upload)
- Creates show objects compatible with the existing Show interface
- Calls `addDemoShow()` from DemoContext
- Returns success response mimicking the real flow

### 3. Create Demo Bulk Upload Flow Component
**File:** `src/components/DemoBulkUploadFlow.tsx` (new file)

A wrapper around the existing bulk upload UI that:
- Uses the demo-specific upload hook instead of the real one
- Handles photo storage as local blob URLs (not uploaded)
- Shows the same success screen with "Sign up to save" CTA

### 4. Update Demo Page to Enable FAB
**File:** `src/pages/Demo.tsx`

Modify the FAB button to:
- Open `DemoBulkUploadFlow` instead of redirecting to auth
- Update tooltip to "Add a show" instead of "Sign up to add shows"
- Pass demo mode context to the flow

### 5. Update DemoHome to Merge Local Shows
**File:** `src/components/DemoHome.tsx`

Modify the data display to:
- Merge `demoLocalShows` from context with fetched demo shows
- Sort combined list by date (newest first)
- Display local shows with a subtle "Unsaved" indicator

### 6. Limit Demo Functionality (Optional Guardrails)
Consider adding:
- Maximum number of demo shows (e.g., 3-5)
- Prompt to sign up after adding shows
- Visual distinction for demo-added shows

---

## File Changes Summary

| File | Action | Description |
|------|--------|-------------|
| `src/contexts/DemoContext.tsx` | Modify | Add local shows state and management functions |
| `src/hooks/useDemoBulkUpload.ts` | Create | Demo-specific show upload logic without Supabase |
| `src/components/DemoBulkUploadFlow.tsx` | Create | Demo wrapper for bulk upload flow |
| `src/pages/Demo.tsx` | Modify | Enable FAB to open demo bulk upload flow |
| `src/components/DemoHome.tsx` | Modify | Merge and display locally created shows |

---

## User Experience Flow

1. User taps FAB (+) on demo page
2. Photo selection screen opens (same as authenticated flow)
3. User selects photos → EXIF data extracted
4. Review screen shows with artist/venue inputs
5. User completes flow → shows added to local state
6. Success screen appears with:
   - Option to share/edit photo
   - Prominent "Sign up to save your shows" CTA
7. Shows appear in demo feed with "Unsaved" badge
8. Tapping any demo show prompts sign-up to persist

---

## Key Technical Considerations

1. **Photo Storage**: Use local blob URLs (`URL.createObjectURL()`) instead of Supabase storage
2. **ID Generation**: Use `crypto.randomUUID()` for local show IDs
3. **Data Shape**: Ensure demo shows match the existing `Show` interface exactly
4. **Memory Management**: Revoke blob URLs when shows are cleared or page unloads
5. **State Persistence**: Shows are intentionally NOT persisted across page refreshes

---

## Success Criteria

- Users can upload photos and add shows without authentication
- The flow feels identical to the authenticated experience
- Demo-created shows appear in the feed immediately
- Clear indication that shows aren't saved prompts sign-up
- No data is written to production database from demo mode
