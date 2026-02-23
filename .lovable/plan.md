

# Edmtrain Carousel Redesign - Implementation Plan

## Summary
Transform the "Upcoming Near You" section from a vertical card list into a horizontal scroll carousel with Spotify-resolved artist images, a Ticket icon CTA, and Edmtrain logo attribution.

## Changes

### 1. Database Migration
Add an `artist_image_url` column to the `edmtrain_events` table to cache Spotify artist images.

```sql
ALTER TABLE edmtrain_events ADD COLUMN artist_image_url text;
```

### 2. Edge Function: `fetch-edmtrain/index.ts`
After fetching and parsing Edmtrain events, resolve headliner images via Spotify before upserting:

- Add a `getSpotifyToken()` helper using Client Credentials flow (same pattern as `backfill-artist-images`)
- For each event, take `artistList[0].name` (headliner), search Spotify, grab the first result's image URL
- Process in batches of 5 with small delays to avoid rate limits
- Store the image URL in the `artist_image_url` column on each row
- Events with no Spotify match get `null` (card will show a gradient fallback)

### 3. Hook: `useEdmtrainEvents.ts`
- Add `artist_image_url: string | null` to the `EdmtrainEvent` interface
- Map it from the database row in the fetch result mapping

### 4. Component: `EdmtrainEventCard.tsx` - Full Redesign
Convert from a text-heavy card to a portrait image tile (`w-40`, `aspect-[3/4]`):

- **Background**: Full-bleed artist image with `bg-gradient-to-t from-black/80` overlay; fallback gradient + Music icon when no image
- **Top-left**: Festival badge pill (if applicable)
- **Top-right**: `CalendarPlus` icon button (calls `onAddToSchedule`)
- **Bottom overlay**: Artist/event name (truncated), date, venue name (truncated)
- **Bottom-left**: Lucide `Ticket` icon button linking to `event_link` (opens in new tab)
- **Bottom-right**: Small Edmtrain logo (loaded from `https://edmtrain.s3.amazonaws.com/img/logo/logo-web.svg`, ~14px tall) as a clickable watermark also linking to `event_link`

### 5. Component: `EdmtrainDiscoveryFeed.tsx` - Carousel Layout
- Replace vertical `space-y-3` list with horizontal scroll: `flex overflow-x-auto gap-3 snap-x snap-mandatory scrollbar-hide pb-1`
- Each card: `shrink-0 snap-start`
- Remove the duplicate "Upcoming Near You" header (already rendered by parent `SceneView`)
- Loading state: 4 skeleton rectangles (`w-40 aspect-[3/4]`) in a horizontal row
- Display up to 12 events (increased from 8 since carousel takes less vertical space)

## Technical Details

### Spotify Image Resolution (in edge function)
- Uses `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` (already configured as secrets)
- Client Credentials flow: `POST https://accounts.spotify.com/api/token` with `grant_type=client_credentials`
- Search: `GET https://api.spotify.com/v1/search?q={artistName}&type=artist&limit=1`
- Take `data.artists.items[0].images[0].url` as the image
- Token cached in-memory for the duration of the function invocation
- Batches of 5 artists with no artificial delay (Spotify rate limits are generous for search)

### Files Modified
1. **Database migration** -- add `artist_image_url text` column
2. **`supabase/functions/fetch-edmtrain/index.ts`** -- add Spotify image resolution
3. **`src/hooks/useEdmtrainEvents.ts`** -- add `artist_image_url` to interface and mapping
4. **`src/components/home/EdmtrainEventCard.tsx`** -- redesign as portrait image tile
5. **`src/components/home/EdmtrainDiscoveryFeed.tsx`** -- switch to horizontal scroll carousel

