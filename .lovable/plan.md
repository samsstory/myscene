

## Fix Stale and Missing Spotify Artist Images

### Problem

Two categories of bad artist image data exist in the database:

1. **Stale preview URLs** -- 5 artists in `show_artists` and 2 in `upcoming_shows` have URLs pointing to `lovable.app/images/...` (demo photos copied as artist images). These are NOT real artist profile images and will 404 or show wrong content.
   - Bicep, Bob Moses, DJ Stingray, Four Tet, Fred again.. (in `show_artists`)
   - Bicep, Floating Points (in `upcoming_shows`)

2. **Missing images** -- DWLLRS and Mehro have completely NULL artist images. Several artists also lack `spotify_artist_id`.

3. **Incomplete heuristic** -- The `isUserUploadedImage()` function only catches Supabase storage URLs (`supabase` + `show-photos`). It misses `lovable.app/images/` preview URLs that were stored as artist images before the guard was added.

---

### Plan

#### Step 1: Widen the image heuristic

Update `src/lib/artist-image-utils.ts` to also flag `lovable.app` and `lovableproject.com` URLs as non-platform images:

```typescript
export function isUserUploadedImage(url: string | null | undefined): boolean {
  if (!url) return false;
  if (url.includes("supabase") && url.includes("show-photos")) return true;
  if (url.includes("lovable.app/images/") || url.includes("lovableproject.com/images/")) return true;
  return false;
}
```

This prevents these stale URLs from being copied into new records going forward.

#### Step 2: Data cleanup via SQL

Run two UPDATE statements to NULL out the bad preview URLs so the backfill can re-populate them:

**show_artists:**
```sql
UPDATE show_artists
SET artist_image_url = NULL
WHERE artist_image_url LIKE '%lovable.app/images/%'
   OR artist_image_url LIKE '%lovableproject.com/images/%';
```

**upcoming_shows:**
```sql
UPDATE upcoming_shows
SET artist_image_url = NULL
WHERE artist_image_url LIKE '%lovable.app/images/%'
   OR artist_image_url LIKE '%lovableproject.com/images/%';
```

This affects 5 `show_artists` rows and 2 `upcoming_shows` rows.

#### Step 3: Run the backfill edge function

Invoke the existing `backfill-artist-images` edge function, which queries `show_artists` rows with NULL `artist_image_url` or `spotify_artist_id`, looks up each artist on Spotify, and writes the correct image URL and Spotify ID. After the data cleanup in Step 2, this will now pick up all 7+ affected artists (Bicep, Bob Moses, DJ Stingray, Four Tet, Fred again.., DWLLRS, Mehro, etc.).

#### Step 4: Verify

Query the database to confirm all previously-stale rows now have valid `i.scdn.co` Spotify image URLs.

---

### Technical Details

- **Files modified**: `src/lib/artist-image-utils.ts` only (1 small change to the heuristic)
- **Data operations**: 2 UPDATE queries via the insert tool, 1 edge function invocation
- **No schema changes** required
- **No new secrets** needed -- the backfill function already uses `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`

