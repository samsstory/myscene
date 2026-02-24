

# AI Data Enrichment Scanner

Build a backend edge function that scans the database for data quality issues and populates the `data_suggestions` queue for admin review.

---

## What It Scans

### 1. Duplicate Venues
Finds venues with the same name (case-insensitive) that exist as separate records. For example, the database currently has 14 "Austin City Limits" records and "CLUB SPACE" vs "Club Space" as distinct rows.

- Groups venues by `lower(trim(name))`
- For groups with 2+ records, picks the one with the most metadata (has coordinates, city, country) as the canonical candidate
- Creates a `duplicate` suggestion with merge candidate IDs

### 2. Venues Missing Metadata
Finds venues linked to shows but missing critical fields (coordinates, city, or country).

- Only flags venues that are actually referenced by shows (not orphans)
- Creates a `missing_data` suggestion listing which fields are absent

### 3. Artist Name Variants
Finds artist names in `show_artists` that are near-duplicates via case differences or slight spelling variations using the existing `pg_trgm` similarity function.

- Groups by `lower(trim(artist_name))` first for exact case mismatches
- Then uses trigram similarity (threshold 0.7) for fuzzy matches like "Fred again.." vs "Fred Again.."
- Creates `name_mismatch` suggestions with the variant names and show counts

### 4. Unlinked Shows
Finds shows that have a `venue_name` but no `venue_id`, and attempts to match them to existing venues.

- Uses `ilike` matching on venue name
- Creates `missing_data` suggestions with the candidate venue ID for easy linking

---

## Edge Function: `scan-data-quality`

**File**: `supabase/functions/scan-data-quality/index.ts`

- Uses service role key to read all data and insert suggestions
- Requires admin auth (validates caller has admin role)
- Clears previous pending suggestions before inserting fresh ones (avoids duplicates on re-scan)
- Returns a summary: `{ duplicateVenues: 5, missingMetadata: 12, artistVariants: 3, unlinkedShows: 4 }`

### Config
```toml
[functions.scan-data-quality]
verify_jwt = false
```

---

## Frontend: "Run Scan" Button

Add a "Run Scan" button to the `SuggestionsQueue` component header that invokes the edge function and refreshes the list.

---

## Technical Details

- The function runs all four scans sequentially (venues are small, ~80 rows; artists ~100 distinct names; shows ~119 rows)
- Artist fuzzy matching uses SQL `similarity()` from pg_trgm which is already installed
- Each suggestion includes structured `details` JSON with entity IDs, candidate matches, and missing fields so the admin UI can render actionable cards
- The function deletes only `pending` suggestions from previous scans before inserting new ones (preserves `approved`/`dismissed` history)
- No AI/LLM calls needed -- this is pure SQL pattern matching which is more reliable for this data size

