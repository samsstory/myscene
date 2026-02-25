

## Plan: Never Show Blank Artist Cards + Simplify Image Pipeline

### Problem
EDMTrain does not provide artist images. The current system attempts async enrichment but still renders cards with gradient fallbacks (music icon) while waiting or when enrichment fails. This creates a poor user experience with blank-looking cards across the Schedule tab and For You feed.

### Solution
Two changes:

1. **Filter out image-less cards at the display layer** -- both `EdmtrainDiscoveryFeed` and `ForYouFeed` will only render events/picks that have a resolved `artist_image_url`. Events still enriching will simply not appear until their image is ready, then a state update will cause them to appear.

2. **Fix the For You feed's nested object bug** -- when `useDiscoverEvents` enriches a pick's `artistImageUrl`, it must also patch the nested `edmtrainEvent.artist_image_url` so that `EdmtrainEventCard` (which reads from `event.artist_image_url`) actually renders the image.

### Files to Change

**`src/components/home/EdmtrainDiscoveryFeed.tsx`** (~2 lines)
- After scoring and sorting `displayed`, filter to only include events where `event.artist_image_url` is truthy before rendering.

**`src/components/home/ForYouFeed.tsx`** (~2 lines)  
- Filter `picks` to only render items where `pick.artistImageUrl` is truthy (covers both edmtrain and platform picks).

**`src/hooks/useDiscoverEvents.ts`** (~5 lines)
- In the `enrichedPicks` memo, when patching `artistImageUrl` from the enriched map, also patch `edmtrainEvent.artist_image_url` so the nested object used by `EdmtrainEventCard` has the URL.

### Technical Details

The enrichment pipeline stays the same:
1. Events fetched from `edmtrain_events` table (no images)
2. `enrichArtistImages()` queries canonical `artists` table (fast, no API)
3. For misses, calls `batch-artist-images` edge function (checks `show_artists`, then Spotify)
4. Resolved URLs patched into state, triggering re-render
5. Cards only appear once an image is resolved

Events that fail enrichment (artist not on Spotify, rate limited, etc.) simply won't appear in the feed -- this is acceptable since showing a blank card is worse than showing fewer cards.

