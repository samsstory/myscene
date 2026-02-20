

# Set Grouping Into Shows — Implementation Plan

## Overview

When a user saves a second Set with the same **date + venue** as an existing Set, we surface a lightweight prompt asking if they want to group these into a "Show." If accepted, a parent Show record is created and both Sets become children. The Show inherits its metadata from its child Sets (no extra tagging). Sets remain individually rankable in the Set ELO pool; the grouped Show enters the Show ELO pool.

## How It Works

```text
User saves a Set
  --> Query: any existing Sets with same date + venue?
  --> No match: save normally, done
  --> Match found: save the Set, then show a bottom-sheet prompt
      "You saw 2 artists at [Venue] on [Date]. Group these into a Show?"
      --> "Yes, group" --> Create a parent Show record, link both Sets via parent_show_id
      --> "Not now" --> Dismiss, Sets stay independent
```

## Database Changes

### 1. Add `parent_show_id` column to `shows` table

A new nullable self-referencing column on the `shows` table. When a Set is grouped into a Show, this column points to the parent Show record.

```sql
ALTER TABLE public.shows
ADD COLUMN parent_show_id uuid REFERENCES public.shows(id) ON DELETE SET NULL;

CREATE INDEX idx_shows_parent_show_id ON public.shows(parent_show_id);
```

The parent Show record itself will have:
- `show_type = 'show'`
- `parent_show_id = NULL` (it IS the parent)
- `venue_name`, `show_date`, `venue_location` inherited from the child Sets
- `rating = NULL` (derived from children in the UI)
- No `show_artists` of its own (artists live on the child Sets)

Child Sets will have:
- `show_type = 'set'` (unchanged)
- `parent_show_id = <parent Show's id>`

### 2. RLS — no new policies needed

The existing RLS on `shows` already scopes all operations to `auth.uid() = user_id`. Since the parent Show record is owned by the same user, all reads/writes are covered.

## Frontend Changes

### 1. New Component: `GroupShowPrompt` (bottom sheet)

**File:** `src/components/home/GroupShowPrompt.tsx`

A simple Sheet/Drawer that appears after saving a Set when sibling Sets are detected. It shows:
- The venue name and date
- A list of the Sets at that venue/date (artist names + images)
- Two buttons: **"Group as a Show"** and **"Not now"**

Props:
- `open: boolean`
- `onOpenChange: (open: boolean) => void`
- `venueName: string`
- `showDate: string`
- `siblingShows: Array<{ id: string; artistName: string; artistImageUrl?: string }>`
- `newShowId: string`
- `onGroup: () => void` — creates the parent Show and links children
- `onDismiss: () => void`

### 2. Grouping Logic in `AddShowFlow.tsx`

After `handleSubmit` successfully saves a new Set (not edit mode), before transitioning to the success step:

1. Query `shows` for other Sets by the same user with matching `show_date` and `venue_name` (case-insensitive) that have no `parent_show_id` yet
2. If matches found, store the sibling info in state and show the `GroupShowPrompt`
3. If user accepts:
   - Insert a new `shows` record with `show_type = 'show'`, same `venue_name`, `show_date`, `venue_location`, `user_id`
   - Update all sibling Sets (including the newly saved one) to set `parent_show_id` to the new parent
4. If user dismisses, continue to success step as normal

### 3. UI Display Considerations

For now, grouped Shows will not change how individual Sets display in the feed or profile. This is purely a data-layer grouping. Future work can add:
- A "Part of [Show]" badge on Set cards
- An expandable Show card in the profile that reveals its child Sets
- Show-level ELO ranking using derived scores

## Technical Details

### Sibling Detection Query

```typescript
const { data: siblings } = await supabase
  .from("shows")
  .select("id, show_artists(artist_name, artist_image_url, is_headliner)")
  .eq("user_id", user.id)
  .eq("show_date", showDate)
  .ilike("venue_name", showData.venue)
  .eq("show_type", "set")
  .is("parent_show_id", null)
  .neq("id", newShow.id);
```

### Parent Show Creation

```typescript
const { data: parentShow } = await supabase
  .from("shows")
  .insert({
    user_id: user.id,
    venue_name: showData.venue,
    venue_location: showData.venueLocation || null,
    venue_id: venueIdToUse,
    show_date: showDate,
    date_precision: showData.datePrecision,
    show_type: "show",
    // No artists, no tags, no rating — inherited from children
  })
  .select("id")
  .single();

// Link all children
const childIds = [...siblings.map(s => s.id), newShow.id];
await supabase
  .from("shows")
  .update({ parent_show_id: parentShow.id })
  .in("id", childIds);
```

### Files to Create/Modify

| File | Change |
|------|--------|
| `supabase/migrations/` | Add `parent_show_id` column + index |
| `src/components/home/GroupShowPrompt.tsx` | **New** — bottom sheet with grouping UI |
| `src/components/AddShowFlow.tsx` | After save, detect siblings, show `GroupShowPrompt`, handle group/dismiss |

### Edge Cases

- **Venue name mismatch**: Uses case-insensitive matching (`ilike`). Slight variations (e.g., "MSG" vs "Madison Square Garden") won't match — this is acceptable since we only prompt on exact venue matches.
- **Date precision**: Only matches on exact `show_date` values. Approximate dates that resolve to the same month-start will still match, which is reasonable.
- **Existing parent shows**: The query filters `parent_show_id IS NULL` so Sets already grouped won't trigger a second prompt.
- **Parent show with no artists**: The parent Show record has no `show_artists` rows. UI queries that join `show_artists` should handle this gracefully (the parent is primarily a container).
- **Ranking**: The parent Show will get its own `show_rankings` entry in the Show ELO pool. Individual child Sets keep their Set ELO rankings. No ranking migration needed.

