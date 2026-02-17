

## Problem

Your Show Globe is empty because the database query that fetches show coordinates is silently failing. Here's what's happening:

The app tries to load venue coordinates (latitude/longitude) by joining `shows` with `venues` using this query:
```
.select('*, venues (latitude, longitude)')
```

However, the `shows` table is **missing a foreign key constraint** to the `venues` table. Without this foreign key, the database doesn't know how to join the two tables, so it returns `null` for all venue data -- meaning every show has no coordinates, and the map filters them all out.

Your data is fine (31 of 34 shows have matching venues with coordinates). It's purely a missing database relationship.

## Fix

### Step 1: Add the missing foreign key constraint

Add a foreign key from `shows.venue_id` to `venues.id` via a database migration:

```sql
ALTER TABLE public.shows
ADD CONSTRAINT shows_venue_id_fkey
FOREIGN KEY (venue_id) REFERENCES public.venues(id);
```

This is the only change needed. Once the FK exists, the existing query in `Home.tsx` will work correctly -- the `venues (latitude, longitude)` join will return actual coordinates, shows will have `latitude`/`longitude` values, and both the map markers and the new artist image fallback will render properly.

### No code changes required

- The data fetching in `Home.tsx` already correctly maps `show.venues?.latitude` and `show.venues?.longitude`
- The artist image fallback in `MapView.tsx` is already correctly implemented
- The `show_artists` table already has `artist_image_url` populated for your shows

## Technical Details

- 31 of 34 shows already have `venue_id` values that match existing venues with coordinates
- 3 shows have `venue_id` values pointing to venues without coordinates (these will still be handled by the "shows without location" flow)
- The artist image fallback code from the previous edit is correct and will work once shows appear on the map

