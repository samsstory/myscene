
# Show Type Flow: Copy Updates, Venue/Event Storage Design, and Placeholder Updates

## Answering Question 3 First: Venue vs. Event Name — The Architecture Problem

This is the most important design decision in this plan, so it needs a clear answer before any code is written.

### The problem today

The `shows` table has `venue_name` and `venue_id`. For a **Show** (solo), `venue_name` is literally the venue — e.g. "Fabric". That makes sense.

But for a **Showcase** or **Festival**, there are now two distinct concepts:

```text
SHOWCASE example:
  Event/Brand:  "Elrow"
  Venue:        "Factory Town"

FESTIVAL example:
  Festival:     "Coachella"
  Venue:        "Empire Polo Club" (Coachella's home)
  — or —
  Festival:     "Glastonbury"
  Venue:        unknown / irrelevant (it's a field)
```

Currently, `venue_name` would store "Elrow" — but "Elrow" is not the venue, it's the event brand. The actual venue (Factory Town) gets lost entirely. On the other hand, if we force users to always enter both, it creates friction for cases like Glastonbury where the "venue" and the "event" are essentially the same thing.

### The proposed solution: add `event_name` column to `shows`

Add a nullable `event_name` text column to the `shows` table. The logic becomes:

```text
show_type = 'show'
  → event_name: NULL
  → venue_name: "Fabric"        ← the physical place

show_type = 'showcase'
  → event_name: "Elrow"         ← the brand / night
  → venue_name: "Factory Town"  ← the physical place (optional, can be left blank if unknown)

show_type = 'festival'
  → event_name: "Coachella"     ← the festival name
  → venue_name: "Empire Polo Club"  ← optional, often left blank
```

The display logic across the app becomes:
- Show the `event_name` prominently if it exists
- Show `venue_name` as secondary context if both are present
- Fall back to `venue_name` if `event_name` is null (covers both `show` type and legacy data)

This is a clean, additive, non-breaking change. All existing shows have `event_name = NULL` and continue to work exactly as before.

### How this changes the flow for Showcase/Festival

In the new type-first flow, for Showcase and Festival:

- **Step 1 (Search)**: User searches for the event name (Elrow, Coachella) — result goes into `event_name`
- **Step 2 (Venue)**: User optionally adds the physical venue (Factory Town) — result goes into `venue_name`. The step heading becomes "Where was it held?" with a "Skip" option if the venue is the event itself (e.g. Glastonbury)

For **Show** type, the venue step heading remains "Where'd you see {Artist}?" and `venue_name` is required as today.

---

## What Changes in This Plan

### 1. Database Migration

Two changes in one migration:

```sql
-- Add show_type column
ALTER TABLE public.shows
ADD COLUMN show_type text NOT NULL DEFAULT 'show'
CHECK (show_type IN ('show', 'showcase', 'festival'));

-- Add event_name column for showcases and festivals
ALTER TABLE public.shows
ADD COLUMN event_name text;

-- Backfill show_type from existing artist count
UPDATE public.shows s
SET show_type = CASE
  WHEN (SELECT COUNT(*) FROM show_artists sa WHERE sa.show_id = s.id) >= 10 THEN 'festival'
  WHEN (SELECT COUNT(*) FROM show_artists sa WHERE sa.show_id = s.id) >= 2  THEN 'showcase'
  ELSE 'show'
END;
```

No RLS changes needed — the existing `shows` policies cover all new columns automatically.

### 2. New `ShowTypeStep.tsx`

Updated copy per the request:

```text
┌──────────────────────────────────────────────────────────┐
│  What are you logging?                                   │
│                                                          │
│  ┌─────────────┐  ┌──────────────┐  ┌───────────────┐   │
│  │  🎵  Show   │  │ ✨ Showcase  │  │  🎪 Festival  │   │
│  │  One artist │  │Multiple      │  │ Multiple      │   │
│  │  one show   │  │artists,      │  │ artists,      │   │
│  │             │  │one day       │  │ multiple days │   │
│  └─────────────┘  └──────────────┘  └───────────────┘   │
└──────────────────────────────────────────────────────────┘
```

Props: `onSelect: (type: 'show' | 'showcase' | 'festival') => void`

Tapping a card immediately advances — no Continue button.

### 3. `ShowData` Interface Updates (`AddShowFlow.tsx`)

```typescript
// Before
showType: 'venue' | 'festival' | 'other';

// After
showType: 'show' | 'showcase' | 'festival';
eventName: string;  // new — stores the event/brand name for showcase/festival
```

Default values: `showType: 'show'`, `eventName: ""`

### 4. Updated `UnifiedSearchStep.tsx`

Add `showType: 'show' | 'showcase' | 'festival'` prop.

**Context-aware heading and placeholder:**

| Type | Heading | Placeholder |
|---|---|---|
| `show` | "Search for an artist" | "Search artists..." |
| `showcase` | "Name this event or night" | "Elrow, Circoloco, Anjunadeep..." |
| `festival` | "Name this festival" | "Coachella, EDC, ARC..." |

**Results filtering by type:**
- `show`: artist results only; manual add = "Add as artist"
- `showcase` / `festival`: venue and event results only; manual add = "Add as event"

When a result is selected in showcase/festival mode, it goes into `eventName` not `venue`.

### 5. Updated `VenueStep.tsx`

Update prop types from `'venue' | 'festival' | 'other'` → `'show' | 'showcase' | 'festival'`.

**Context-aware heading:**
- `show`: "Where'd you see {Artist}?" (existing behaviour)
- `showcase`: "Where was it held?" with optional Skip button
- `festival`: "Where was it held?" with optional Skip button

**Updated `getPlaceholder()`:**
- `show`: "Search for venue..."
- `showcase`: "Search for venue..."
- `festival`: "Search for venue or grounds..."

**Updated `getManualEntryLabel()`:**
- `show` → "New venue"
- `showcase` → "New venue"
- `festival` → "New venue / grounds"

The Venue step for showcase/festival becomes **optional** — a "Skip, venue unknown" button lets users bypass it. When skipped, `venue_name` stores the event name as a fallback (current app behaviour is preserved for display).

### 6. Flow Routing in `AddShowFlow.tsx`

New step 0 (ShowTypeStep) is inserted before the existing step 1 (UnifiedSearch). The rest of the step numbers stay the same.

```text
SHOW:
  0: Type picker → "Show"
  1: Search (artist-only)           → sets artists[0], entryPoint = 'artist'
  2: Venue (required, headed by artist name)
  3: Date
  4: Rating/Tags
  5: Success → Quick Compare

SHOWCASE:
  0: Type picker → "Showcase"
  1: Search (event/venue)           → sets eventName
  2: Venue (optional, "Where was it held?", skippable)
  3: Date
  4: Who did you see? (ArtistsStep, multi)
  5: Rating/Tags
  6: Success → Quick Compare

FESTIVAL:
  0: Type picker → "Festival"
  1: Search (event/venue)           → sets eventName
  2: Venue (optional, skippable)
  3: Date
  4: Who did you see? (ArtistsStep, multi)
  5: Rating/Tags
  6: Success → Quick Compare
```

Back-button at step 0 closes the dialog (nothing to go back to).

Edit mode: Type picker step is skipped entirely; `showType` and `eventName` are loaded from the database record.

### 7. `handleSubmit` in `AddShowFlow.tsx`

For shows, the INSERT now includes:
```typescript
show_type: showData.showType,
event_name: showData.eventName || null,
// venue_name stays as the physical venue; for solo shows it remains unchanged
// for showcase/festival with no venue entered, venue_name = eventName as fallback
venue_name: showData.venue || showData.eventName,
```

### 8. `DemoAddShowFlow.tsx`

Same type signature updates as `AddShowFlow.tsx`. ShowTypeStep added as step 0 in the same way.

### 9. `search-venues` Edge Function

Update the showType conditional to handle the new enum values:
```typescript
// Before: checked for 'festival'
// After:
if (showType === 'festival') { searchQuery = `${query} festival`; }
else if (showType === 'showcase') { searchQuery = `${query} event night`; }
```

---

## Execution Order

1. Run database migration (add `show_type` + `event_name` columns, backfill `show_type`)
2. Create `ShowTypeStep.tsx` with updated copy
3. Update `UnifiedSearchStep.tsx` with `showType` prop + context-aware UI + correct placeholders
4. Update `VenueStep.tsx` type signatures + optional skip for showcase/festival
5. Refactor `AddShowFlow.tsx` — new `ShowData` fields, step 0, routing logic, DB persist
6. Update `DemoAddShowFlow.tsx` with matching changes
7. Update `search-venues` edge function for `'showcase'` query biasing

---

## Key Design Decisions

**Why `event_name` as a separate column instead of overloading `venue_name`?**
Overloading `venue_name` to sometimes mean "event name" would make queries and display logic ambiguous. A dedicated `event_name` column keeps data clean and lets us query "all Elrow events" or "all Coachella years" correctly later. It also means all existing shows are unaffected — `event_name` is nullable and defaults to NULL.

**Why is the Venue step optional for showcase/festival?**
Many events (Glastonbury, Burning Man, most festivals) are effectively self-describing locations. Forcing a user to enter a separate venue name in these cases creates friction for data that won't be useful. The "Skip" option gives users control while the search step already captures the most important identifier.

**Why does `venue_name` fall back to `eventName` on save?**
`venue_name` is NOT NULL in the database today. For showcase/festival shows where the user skips the venue step, we store the event name in `venue_name` as a backward-compatible fallback. Display logic will preferentially show `event_name` if present, so the UX remains correct. This avoids a schema change to make `venue_name` nullable.
