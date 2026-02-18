
## The Problem

The "Log this show in Scene" button in `CompareShowSheet` calls `onContinueToAddShow`, which in `Dashboard.tsx` opens the generic `BulkUploadFlow` (or `AddShowFlow`). This forces the new user to search for and re-enter show details that **already exist** in the database from the inviter's show record.

The correct behavior:
1. **"Log this show in Scene" CTA** → silently save the show to the new user's profile using the inviter's show data (artists, venue, date) + the invitee's highlights and note from `localStorage`.
2. Close the `CompareShowSheet`.
3. Show the **WelcomeCarousel** ("Remember every show.") with a single "Add My First Show" CTA.
4. The carousel's CTA opens the normal `BulkUploadFlow` for future shows.

---

## Root Cause

`CompareShowSheet` passes `onContinueToAddShow` up to `Dashboard.tsx`, which always opens `AddShowFlow` — an empty, generic multi-step form. There is no logic to:
- Read the inviter's show data from the database.
- Insert a cloned show record for the invitee.
- Show the welcome screen before prompting the user to log more shows.

---

## What Needs to Change

### 1. `src/components/CompareShowSheet.tsx`

**New responsibility**: When the CTA is tapped, perform the "save this show" action directly inside the sheet before calling the parent callback.

Changes:
- Add a `saving` loading state.
- On CTA tap, call a new `saveShowForInvitee()` async function that:
  - Queries the inviter's `shows` record (via `showId`) to get `venue_name`, `venue_location`, `venue_id`, `show_date`, `date_precision`, `show_type`.
  - Queries `show_artists` for all artists on that show.
  - Inserts a new row in `shows` for the current authenticated user with the same venue/date/type data + `notes` from `inviteNote`.
  - Inserts matching rows in `show_artists` for the new show.
  - If `myHighlights` is non-empty, inserts rows in `show_tags` for the new show.
  - On success, calls `onContinueToAddShow(newShowId)` to hand off to the parent.
- Change the CTA button label from "Log this show in Scene →" to "Save this show →" and show a spinner while saving.
- Update `onContinueToAddShow` prop type to pass the new `showId: string`.

### 2. `src/pages/Dashboard.tsx`

**New responsibility**: After the compare sheet saves the show, show the `WelcomeCarousel`, not `AddShowFlow`.

Changes:
- Add `showWelcomeCarousel` state (`boolean`).
- Import `WelcomeCarousel`.
- Change `onContinueToAddShow` in the `CompareShowSheet` render to set `showWelcomeCarousel(true)` instead of `setShowAddDialog(true)`.
- Render `WelcomeCarousel` when `showWelcomeCarousel` is `true`:
  - `onComplete` → close carousel, open `BulkUploadFlow` (to add their next show).
  - `onTakeTour` → close carousel, start `SpotlightTour`.
- Remove the old `AddShowFlow` `onShowAdded` logic that checked for `inviteShowId` and triggered `setShowSpotlightTour(true)` (since that chain is now replaced by the carousel).

---

## Revised Flow Diagram

```text
[CompareShowSheet]
       │
       │  User taps "Save this show →"
       ▼
[saveShowForInvitee()]
  - INSERT into shows (invitee's copy, pre-filled from inviter's data)
  - INSERT into show_artists
  - INSERT into show_tags (invitee's highlights)
       │
       │  onContinueToAddShow(newShowId) callback fires
       ▼
[Dashboard: showWelcomeCarousel = true]
       │
       ▼
[WelcomeCarousel]
  "Remember every show."
  [Add My First Show] ──▶ setShowUnifiedAdd(true) → BulkUploadFlow
  [Take a quick tour]  ──▶ setShowSpotlightTour(true)
```

---

## Technical Details

**Data fetching in `saveShowForInvitee()`** (inside `CompareShowSheet`):

```ts
// 1. Fetch inviter's full show record
const { data: show } = await supabase
  .from("shows")
  .select("venue_name, venue_location, venue_id, show_date, date_precision, show_type, event_name, event_description")
  .eq("id", showId)
  .single();

// 2. Fetch all artists for that show
const { data: artists } = await supabase
  .from("show_artists")
  .select("artist_name, is_headliner, artist_image_url, spotify_artist_id")
  .eq("show_id", showId);

// 3. Insert new show for current user
const { data: newShow } = await supabase
  .from("shows")
  .insert({ user_id: currentUser.id, ...clonedShowFields, notes: myNote || null })
  .select("id")
  .single();

// 4. Insert artists
await supabase.from("show_artists").insert(
  artists.map(a => ({ ...a, show_id: newShow.id }))
);

// 5. Insert highlights/tags
if (myHighlights.length > 0) {
  await supabase.from("show_tags").insert(
    myHighlights.map(tag => ({ show_id: newShow.id, tag, category: getCategoryForTag(tag) }))
  );
}
```

**`WelcomeCarousel` is already built** in `src/components/onboarding/WelcomeCarousel.tsx`. It accepts `onComplete` and optional `onTakeTour` props — no changes needed to that file.

**No database migrations required.** All writes go to existing tables: `shows`, `show_artists`, `show_tags`.

---

## Files to Change

| File | Change |
|---|---|
| `src/components/CompareShowSheet.tsx` | Add `saveShowForInvitee()` logic inside the CTA handler; update prop type; add saving spinner |
| `src/pages/Dashboard.tsx` | Add `showWelcomeCarousel` state; render `WelcomeCarousel`; wire `onContinueToAddShow` to show carousel instead of `AddShowFlow` |
