

## Plan: Enrich Missing Artist Images via Spotify for Both Discovery Feeds

### Problem
Both the **Edmtrain Discovery Feed** (Schedule tab) and the **For You** feed render event cards that often lack artist images. The `edmtrain_events` table's `artist_image_url` is frequently null, resulting in blank gradient-fallback cards with a music icon instead of an artist photo.

### Solution
Add an image enrichment step in the shared `useEdmtrainEvents` hook so **all consumers** (Schedule tab, For You feed) automatically benefit. After events are fetched from the database, collect artist names with missing images, look them up in the canonical `artists` table first (cheap), then call the existing `batch-artist-images` edge function for any still missing (Spotify lookup), and patch the events in state.

### Implementation

**File: `src/hooks/useEdmtrainEvents.ts`**

After the events are mapped from the database (line ~137), add an enrichment step:

1. Collect all unique artist names from events that have no `artist_image_url`
2. First, batch-query the canonical `artists` table for `image_url` by name (fast, no API call)
3. For any still missing, call `batch-artist-images` edge function (which checks `show_artists` then Spotify)
4. Patch the events in state with the resolved image URLs
5. Also update the `edmtrain_events` rows in the database (fire-and-forget) so future loads are pre-enriched

**File: `src/hooks/useDiscoverEvents.ts`**

The `useDiscoverEvents` hook also constructs `DiscoverPick` objects with `artistImageUrl` from edmtrain events and platform shows. After picks are scored, add a similar enrichment pass:

1. Collect pick artist names where `artistImageUrl` is null
2. Query canonical `artists` table
3. Call `batch-artist-images` for remaining misses
4. Update pick image URLs before returning

### Technical Details

The enrichment in `useEdmtrainEvents` works as a post-fetch step:

```text
fetchEvents()
  ├── fetch from edmtrain_events table
  ├── map rows to EdmtrainEvent[]
  ├── identify events with null artist_image_url
  ├── batch lookup canonical artists table (SELECT name, image_url WHERE lower(name) IN (...))
  ├── for remaining nulls → supabase.functions.invoke("batch-artist-images", { names })
  ├── patch events with resolved URLs
  ├── fire-and-forget: UPDATE edmtrain_events SET artist_image_url = ? WHERE edmtrain_id = ?
  └── setEvents(enrichedEvents)
```

For `useDiscoverEvents`, the enrichment happens inside the `useMemo` or as a separate `useEffect` that runs after picks are computed, patching `artistImageUrl` on each pick.

The `batch-artist-images` edge function already exists and handles:
- Checking `show_artists` table first (cheapest)
- Falling back to Spotify API search
- Rate limit protection (caps at 30, breaks on 429)
- Fire-and-forget enrichment of `show_artists` rows

No new edge functions, no database migrations needed. The canonical `artists` table lookup is added as an optimization layer before hitting the edge function.

