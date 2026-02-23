

# Wire Up `event_name` End-to-End + Shared `ShowCardContent` Component

## Overview
Three coordinated changes: update the AI parser to extract `event_name` separately from `artist_name`, wire the new field through the hook and save flow, and build a shared `ShowCardContent` component that standardizes the bottom text area across all show cards.

---

## 1. Update the Edge Function Parser

**File:** `supabase/functions/parse-upcoming-show/index.ts`

- Add `event_name` to the tool definition schema (string, description: "Event or festival brand name like Elrow, Beyond Wonderland, etc. Empty string if this is just a regular artist show.")
- Add `event_name` to the `required` array in the tool schema
- The AI will now separate "Beyond Wonderland" (event_name) from "Fisher" (artist_name) instead of mashing them together

---

## 2. Update the Hook and Types

**File:** `src/hooks/usePlanUpcomingShow.ts`

- Add `event_name: string` to the `ParsedUpcomingEvent` interface
- Add `event_name: string | null` to the `UpcomingShow` interface
- Add `event_name?: string` to `SaveUpcomingShowData`
- In `saveUpcomingShow`, pass `event_name` through to the insert call

**File:** `src/hooks/useFriendUpcomingShows.ts`

- Add `event_name` to the `FriendShow` interface and to the Supabase select query so friend show cards can display it too

---

## 3. Update PlanShowSheet to Capture `event_name`

**File:** `src/components/home/PlanShowSheet.tsx`

- Add `editEventName` state variable
- Populate it from parsed result in the confirm stage
- Add an "Event name (optional)" input field in both the confirm and manual stages (between the artist and venue fields)
- Pass `event_name` through in `handleSave`

---

## 4. Build the Shared `ShowCardContent` Component

**File (new):** `src/components/home/upcoming/ShowCardContent.tsx`

A single presentational component that renders the standardized bottom content area for all show cards:

```text
  [Avatar Stack]         (optional)
  Event Name             (optional, bold, line-clamp-1)
  Artist Name            (bold, line-clamp-2)
  Venue Name             (text-white/70, line-clamp-1)
  Date                   (text-white/50)
```

Props:
- `avatars?: AvatarPerson[]` -- friend avatar stack (optional)
- `eventName?: string | null` -- event brand name (optional)
- `artistName: string` -- always shown
- `venueName?: string | null` -- venue, truncated
- `dateLabel: string` -- formatted date string

All text uses `textShadow` for readability over images. Each line is its own `<p>` tag to prevent truncation issues.

---

## 5. Refactor Existing Cards to Use `ShowCardContent`

**`UpcomingChip.tsx`**: Replace the bottom `<div>` content (lines 67-86) with `<ShowCardContent>`, passing `show.event_name`, avatars, artist, venue, and date.

**`FriendChip.tsx`**: Replace the bottom content (lines 67-119) with `<ShowCardContent>`, deriving avatars from `show.allFriends`.

**`EdmtrainEventCard.tsx`**: Replace the bottom content (lines 90-108) with `<ShowCardContent>`, passing `event.event_name` and `event.venue_name`.

Each card retains its own unique elements (RSVP badge, add button, festival tag, reason label) -- only the text stack is shared.

---

## Sequencing
1. Deploy edge function update first (parser)
2. Update types and hooks
3. Build `ShowCardContent`
4. Refactor the three card components
5. Update `PlanShowSheet` with event name field
