
# Add "New Event" Option to Venue Step for Solo Shows

## The Problem

When a user adds a **Show** (solo artist) and searches the venue field for something like "Cercle LA", they only see one manual-add option: **"New venue"**. But Cercle LA is an event brand — the physical venue (LA Convention Center) is incidental or unknown. Currently there's no way to record it as an `event_name` from this step.

The `event_name` column exists in the database and is populated for Showcase/Festival flows, but the Show flow's Venue step has no path to set it.

## Solution

Add a second manual-add option in `VenueStep` — **"New event"** — alongside the existing **"New venue"** option. When the user picks "New event", the flow:

1. Sets `event_name` to the typed name (e.g. "Cercle LA")
2. Skips the address/coordinates dialog entirely (event brands don't have a geocodable address)
3. Uses `event_name` as the `venue_name` fallback (existing logic in `AddShowFlow.handleSubmit` already handles this)

This mirrors exactly how Showcase/Festival events work — the distinction is just that it's being triggered from within the venue search step of a solo Show.

## Changes Required

### 1. `src/components/add-show-steps/VenueStep.tsx`

**New prop**: `onSelectAsEvent?: (eventName: string) => void`

This callback fires when the user clicks "New event" on a manual entry. The parent (`AddShowFlow`) will use it to set `eventName` and advance the step.

**UI change** — the manual-add entry (the `Sparkles` button at the top of results) currently renders a single button. For `showType === 'show'`, render two side-by-side buttons:

```text
┌─────────────────────────────────────────────────┐
│  ✨ "Cercle LA"                                 │
│  ┌──────────────────┐  ┌──────────────────────┐ │
│  │   New venue      │  │    New event         │ │
│  └──────────────────┘  └──────────────────────┘ │
└─────────────────────────────────────────────────┘
```

For `showcase` / `festival` types, the existing single "New venue / event" button stays unchanged (those flows use `UnifiedSearchStep` for the event name, so this step is purely for the physical venue).

**New `handleSelectAsEvent` function** inside `VenueStep`:
```typescript
const handleSelectAsEvent = () => {
  if (searchTerm.trim() && onSelectAsEvent) {
    onSelectAsEvent(searchTerm.trim());
  }
};
```

No address dialog is shown — the callback fires immediately and the parent advances the step.

### 2. `src/components/AddShowFlow.tsx`

**Wire up the new prop** on `<VenueStep>`:

```typescript
onSelectAsEvent={(eventName) => {
  updateShowData({
    eventName,
    venue: eventName,   // fallback so venue_name is non-null in DB
    venueLocation: '',
    venueId: null,
  });
  setStep(3); // advance to Date step
}}
```

`venue_name` falls back to `eventName` (already in `handleSubmit`: `venue_name: showData.venue || showData.eventName`), so no DB change is needed.

## What Gets Stored

For "Cercle LA at LA Convention Center" scenario:
- User types "Cercle LA" in venue search → clicks "New event"
- `event_name = "Cercle LA"`, `venue_name = "Cercle LA"` (fallback), `show_type = "show"`
- Show card displays "Cercle LA" — correct

For "Cercle LA" where user also knows the physical venue:
- User types "Cercle LA" → clicks "New event" → `event_name` set → advances
- OR: user searches "LA Convention Center" → selects it → `venue_name` set
- Both paths already exist; the new button just adds the missing middle path

## What Does NOT Change

- The address dialog is unchanged — it still appears when clicking "New venue"
- Showcase/Festival flows are unchanged
- The database schema is unchanged (the `event_name` column already exists)
- The `handleSubmit` fallback logic is unchanged
