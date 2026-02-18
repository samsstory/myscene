
# Phase 1A: "What's Next" Strip + AI-Powered Upcoming Show Import

## Overview

This builds the full upcoming show planning feature end-to-end: a new database table, an AI parse edge function, a "Plan a Show" sheet, and the "What's Next" horizontal strip on the dashboard. No social layer yet — this is fully self-contained.

---

## Step 1: Database Schema

**New migration** creates the `upcoming_shows` table:

```sql
CREATE TABLE public.upcoming_shows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by_user_id uuid NOT NULL,
  artist_name text NOT NULL,
  venue_name text,
  venue_location text,
  show_date date,
  ticket_url text,
  source_url text,
  raw_input text,
  artist_image_url text,
  linked_show_id uuid REFERENCES public.shows(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
```

RLS policies:
- `SELECT`: `auth.uid() = created_by_user_id`
- `INSERT`: `auth.uid() = created_by_user_id`
- `UPDATE`: `auth.uid() = created_by_user_id`
- `DELETE`: `auth.uid() = created_by_user_id`

---

## Step 2: New Edge Function — `parse-upcoming-show`

A new edge function at `supabase/functions/parse-upcoming-show/index.ts`.

This is distinct from `parse-show-notes` (which handles bulk text import of past shows). This function is purpose-built for planning a single or small number of **future shows** from a URL or short text blob.

**Input:** `{ input: string }` — a pasted URL (Ticketmaster, RA, Instagram caption, plain text)

**AI Model:** `google/gemini-3-flash-preview` via Lovable AI Gateway (LOVABLE_API_KEY already configured)

**Tool call schema** extracts:
```typescript
{
  events: [{
    artist_name: string,       // primary headliner
    venue_name: string,        // "" if not found
    venue_location: string,    // city/country if found
    show_date: string,         // ISO YYYY-MM-DD, "" if not found
    ticket_url: string,        // URL if present in input
    confidence: "high" | "medium" | "low"
  }]
}
```

**Post-parse enrichment:** Runs Spotify lookup (same pattern as `parse-show-notes`) to populate `artist_image_url` for display in the strip chip.

**Rate limit / 402 error handling** mirrored from `parse-show-notes`.

**`supabase/config.toml`** entry:
```toml
[functions.parse-upcoming-show]
verify_jwt = false
```

---

## Step 3: `usePlanUpcomingShow` Hook

New hook at `src/hooks/usePlanUpcomingShow.ts`:

- `parseInput(text: string)` — calls the edge function, returns structured event data
- `saveUpcomingShow(data)` — inserts into `upcoming_shows` via Supabase client
- `upcomingShows` — live list fetched from `upcoming_shows` for the current user
- `deleteUpcomingShow(id)` — removes an entry
- State: `isParsing`, `isSaving`, `parsedResult`, `error`

---

## Step 4: `PlanShowSheet` Component

New component at `src/components/home/PlanShowSheet.tsx`.

A bottom sheet (using existing `Sheet` / `Drawer` UI primitives) with two stages:

**Stage 1 — Input:**
```text
┌─────────────────────────────────┐
│  Plan a Show                    │
│                                 │
│  ┌─────────────────────────┐   │
│  │ Paste a link or type    │   │
│  │ artist + details...     │   │
│  └─────────────────────────┘   │
│                                 │
│  [Parse →]                      │
└─────────────────────────────────┘
```

**Stage 2 — Confirm card** (after parse):
```text
┌─────────────────────────────────┐
│  ← Try again                    │
│                                 │
│  [Artist image]                 │
│  Fred Again..                   │
│  Madison Square Garden          │
│  Feb 22, 2026  ·  New York     │
│  🎟 View Tickets                │
│                                 │
│  [Edit fields if needed]        │
│                                 │
│  [Add to Upcoming →]            │
└─────────────────────────────────┘
```

- Editable fields for artist, venue, date (date-picker using existing `react-day-picker`)
- On save → inserts row, closes sheet, strip refreshes
- Manual entry fallback: if user doesn't paste anything, they can fill fields manually

---

## Step 5: `WhatsNextStrip` Component

New component at `src/components/home/WhatsNextStrip.tsx`.

**Placement:** Inserted in `Home.tsx` `renderHomeView()` between `<StatPills>` and `<HighlightReel>`.

**Layout:**
```text
┌──────────────────────────────────────────────────────┐
│  What's Next                               [See all] │
│  ←scroll→                                            │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  │
│  │ [img]        │  │ [img]        │  │     +     │  │
│  │ Fred Again   │  │ Bicep        │  │   Plan    │  │
│  │ Feb 22 · MSG │  │ Mar 5 · NYC  │  │  a Show   │  │
│  └──────────────┘  └──────────────┘  └───────────┘  │
└──────────────────────────────────────────────────────┘
```

Each chip shows:
- Blurred artist image background (from `artist_image_url`, falls back to gradient)
- Artist name
- Date formatted short (e.g., "Feb 22")
- Venue name shortened

**Empty state** (no upcoming shows yet):
```text
┌──────────────────────────────────────────────────┐
│  What's Next                                     │
│  ┌─────────────────────────────────────────┐    │
│  │ 🎵  Add shows you're planning to attend  │    │
│  │     [+ Plan a Show]                      │    │
│  └─────────────────────────────────────────┘    │
└──────────────────────────────────────────────────┘
```

The "+ Plan a Show" button (both in the strip and on the empty state) opens `PlanShowSheet`.

---

## Step 6: Wire Into Dashboard / Home

**`Home.tsx` changes:**
- Import and render `<WhatsNextStrip>` between `<StatPills>` and `<HighlightReel>` in `renderHomeView()`
- Pass `onPlanShow` callback to open `PlanShowSheet`

**`src/components/Home.tsx` renderHomeView updated layout:**
```
StatPills
WhatsNextStrip   ← NEW
HighlightReel
Recent Shows
FriendTeaser
```

`PlanShowSheet` lives inside `Home.tsx` with its open/close state managed there (same pattern as `incompleteTagsOpen`, `missingPhotosOpen`, etc.)

---

## Technical Notes

- **No new API keys needed** — uses `LOVABLE_API_KEY` (already configured) + `SPOTIFY_CLIENT_ID`/`SECRET` (already configured)
- **Pattern consistency** — edge function mirrors `parse-show-notes` structure exactly; hook mirrors `useHomeStats` pattern; sheet mirrors `IncompleteTagsSheet`/`MissingPhotosSheet` pattern
- **Realtime** — the strip subscribes to `upcoming_shows` changes via `supabase.channel` so adding a show from the sheet instantly updates the strip (same pattern as shows channel in `Home.tsx`)
- **Date handling** — uses `date-fns` (already installed) for formatting; `react-day-picker` (already installed) for the date picker in edit fields
- **show_date nullable** — date is optional at save time; chips without a date show "Date TBD"
