

# Phase 1: Festival Lineups Table + Admin Import UI

## Overview

Create a `festival_lineups` reference catalog table and build an admin interface for manually uploading festival lineup data via JSON or CSV. This data will later power the user-facing "claim your festival history" flow.

---

## Step 1: Database Migration

Create the `festival_lineups` table to store scraped/imported festival data as a flat reference catalog.

```sql
CREATE TABLE public.festival_lineups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name text NOT NULL,
  year integer NOT NULL,
  date_start date,
  date_end date,
  venue_name text,
  venue_location text,
  venue_id uuid REFERENCES venues(id),
  artists jsonb NOT NULL DEFAULT '[]'::jsonb,
  source text DEFAULT 'manual',
  source_url text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(lower(trim(event_name)), year)
);
```

**`artists` JSONB format:**
```json
[
  { "name": "Fred Again..", "day": "Friday", "stage": null },
  { "name": "Bicep", "day": "Saturday", "stage": null }
]
```

**RLS Policies:**
- SELECT: All authenticated users (they need to browse/search this catalog)
- INSERT/UPDATE/DELETE: Admins only (`has_role(auth.uid(), 'admin')`)

**Indexes:**
- GIN index on `artists` for searching artist names within lineups
- Trigram index on `event_name` for fuzzy festival name search

---

## Step 2: Admin UI -- "Festivals" Sub-Tab

Add a new **"Festivals"** tab inside the existing Data tab (`DataTab.tsx`), alongside Venues, Shows, and AI Suggestions.

### Components to create:

**`src/components/admin/data/FestivalsBrowser.tsx`**
- Table view of all `festival_lineups` records, showing: event name, year, artist count, venue, source
- Search bar (fuzzy match on event name)
- Stat pills: total festivals, total unique artists across all lineups
- Click a row to expand/view the full artist list

**`src/components/admin/data/FestivalImportDialog.tsx`**
- Dialog/sheet triggered by an "Import Lineups" button
- Two import modes via tabs:
  - **JSON mode**: Paste a JSON array matching the schema (event_name, year, artists array, venue info)
  - **CSV mode**: Paste CSV with columns: `event_name, year, artist_name, day` (one row per artist; grouped by event_name+year on import)
- Preview step: shows parsed festivals with artist counts before committing
- "Import" button inserts into `festival_lineups`, deduplicating by event_name + year (upsert -- merges artist arrays if festival already exists)
- Validation: reject entries missing event_name or year

### Updated file:
- **`DataTab.tsx`**: Add a 4th tab trigger "Festivals" pointing to `<FestivalsBrowser />`

---

## Step 3: Edit & Delete Support

Each festival row in the browser gets:
- **Edit button**: Opens a dialog to rename the festival, change year/dates, edit venue, or manually add/remove artists from the JSONB array
- **Delete button**: Removes the lineup record (with confirmation)

---

## Technical Notes

- The `festival_lineups` table is purely reference data -- it is NOT tied to any user's shows. It exists so users can later browse and "claim" shows from it.
- The `source` column tracks provenance (`manual`, `firecrawl`, `scraper`) for Phase 2.
- The `venue_id` FK is optional -- if a matching venue exists in the canonical `venues` table it can be linked, otherwise just store the name/location strings.
- The unique constraint on `(lower(trim(event_name)), year)` prevents duplicate festival entries for the same year.

---

## Files Changed

| File | Change |
|------|--------|
| `supabase/migrations/` (new) | Create `festival_lineups` table, RLS policies, indexes |
| `src/components/admin/data/FestivalsBrowser.tsx` (new) | Festival table browser with search, stats, expand |
| `src/components/admin/data/FestivalImportDialog.tsx` (new) | JSON/CSV import dialog with preview + upsert |
| `src/components/admin/DataTab.tsx` | Add "Festivals" tab |

