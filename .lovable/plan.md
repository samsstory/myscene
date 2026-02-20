

# QuickAddSheet: Single-Screen "I Was There" Component

## Overview

Replace the multi-step `AddShowFlow` wizard with a dedicated `QuickAddSheet` bottom drawer for the "I was there" flow. This component is used exclusively when core data (artist, venue, date) is already known from another user's show. It renders everything on a single scrollable screen.

## UI Layout (top to bottom)

1. **Hero Section** -- Artist image (from Spotify via prefill) displayed as a wide banner with gradient overlay. Falls back to a branded gradient when no image is available.

2. **Show Info Row** -- Read-only display:
   - Artist name (bold, large)
   - "Add artist" pill button (opens inline artist search to add openers)
   - Event/Venue name and date beneath

3. **Editable Fields (only when data is missing)**
   - **Missing venue**: Inline venue search input appears (same search logic as `VenueStep` but as a single field, not a full step). Not required -- user can leave blank.
   - **Missing date**: Inline date picker appears (reuse `Calendar` component from shadcn). Not required -- defaults to "unknown" precision if left empty.

4. **Tag Selection** -- Reuse the existing `TAG_CATEGORIES` tag pills from `RatingStep`. Compact layout, same styling.

5. **My Take** -- Optional textarea, 500 char limit (same as current).

6. **"Add to My Scene" Button** -- Primary CTA. Saves the show.

## Data Flow

```text
PopularFeedGrid / FriendActivityFeed
  -- "I was there" click -->
Home.tsx (checks: has artist + venue + date?)
  -- all present --> QuickAddSheet (new)
  -- missing data --> QuickAddSheet still opens, shows inline fields for missing data
```

The existing `AddShowFlow` is no longer invoked for "I was there" actions. The `QuickAddSheet` handles its own save logic (insert into `shows`, `show_artists`, `show_tags`, `venues`, `user_venues` tables -- same as the submit handler in `AddShowFlow`).

## Edge Cases

| Edge Case | Solution |
|-----------|----------|
| No artist image (small/indie artist) | Gradient fallback hero (e.g. dark-to-primary gradient). Artist image always attempts Spotify lookup via prefill -- this only fails for very obscure artists. |
| Missing date | Inline calendar appears below show info. If user skips, `date_precision` is set to `"unknown"` and defaults to Jan 1 of current year. |
| Missing venue | Inline venue search field appears. Uses same `search-venues` edge function. Field is optional -- show can be saved without venue. |
| Duplicate show | Before saving, query `shows` for matching artist + venue + date for this user. If found, show a toast warning and prevent double-add. |
| Adding extra artists | "Add artist" pill opens a small inline search (reuses Spotify search from `search-artists` edge function). Added artists appear as removable pills. First artist remains headliner. |

## Technical Details

### New File
- `src/components/QuickAddSheet.tsx` -- The single-screen bottom sheet component

### Modified Files
- `src/components/Home.tsx` -- Route "I was there" clicks to `QuickAddSheet` instead of `AddShowFlow`
  - Add state: `quickAddOpen`, `quickAddPrefill`
  - Render `<QuickAddSheet>` alongside existing `<AddShowFlow>`
  - The three `onQuickAdd` / `onIWasThere` handlers set `quickAddPrefill` and open the sheet instead of `setEditDialogOpen`

### Props Interface
```text
QuickAddSheetProps:
  open: boolean
  onOpenChange: (open: boolean) => void
  prefill: {
    artistName: string
    artistImageUrl?: string | null
    venueName?: string | null
    venueLocation?: string | null
    showDate?: string | null
    showType: 'set' | 'show' | 'festival'
    eventName?: string | null
  }
  onShowAdded?: (show: AddedShowData) => void
```

### Save Logic
Extracted from the existing `handleSubmit` in `AddShowFlow.tsx`. The QuickAddSheet will:
1. Get the authenticated user
2. Resolve/create venue in `venues` table (if venue provided)
3. Insert into `shows` table
4. Insert into `show_artists` table (headliner + any added artists)
5. Insert into `show_tags` table (if tags selected)
6. Upsert `user_venues` (if venue resolved)
7. Check for sibling sets at same venue/date and show `GroupShowPrompt` if applicable
8. Show success toast and close sheet

### Dependencies
No new packages needed. Reuses:
- `Sheet` / `SheetContent` from shadcn (bottom variant)
- `Calendar` from shadcn for inline date picker
- `TAG_CATEGORIES` from `tag-constants.ts`
- `search-venues` edge function for venue search
- `search-artists` edge function for adding extra artists
- Existing Supabase client for all DB operations

