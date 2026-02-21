
# Fix: Show Spotify artist images as fallback for show cards

## Problem
In the "My Shows" tab, the show card thumbnails only check for `show.photo_url`. When a show has no custom photo, it displays a blank placeholder (`✦` symbol) instead of falling back to the Spotify artist image -- even though every artist in the database has an `artist_image_url` stored.

## Root Cause
The card rendering logic in `src/components/Home.tsx` (around line 830) has a simple binary check:
- If `show.photo_url` exists -> show the photo
- Otherwise -> show the `✦` placeholder with an "add photo" button

It never considers the artist's Spotify image (`show.artists[0]?.imageUrl`) as a middle-ground fallback.

## Solution
Update the thumbnail rendering in the My Shows card list to use a three-tier fallback:

1. **User photo** (`show.photo_url`) - highest priority
2. **Spotify artist image** (headliner's `imageUrl`) - automatic fallback
3. **Placeholder with add-photo prompt** (`✦` symbol) - only when no image exists at all

## Changes

### File: `src/components/Home.tsx`
**Lines ~828-848** - Update the thumbnail section in the show card list:

- Extract the headliner's `imageUrl` from `show.artists`
- Add a middle condition: if no `photo_url` but headliner has `imageUrl`, display the Spotify image as the thumbnail (with a subtle "add photo" overlay to encourage uploading a custom one)
- Only show the bare `✦` placeholder when neither `photo_url` nor artist image exists

This matches the existing pattern already used in `StackedShowCard.tsx` (line 54) and `HighlightReel.tsx` (line 136), which both implement this fallback correctly.

No database or backend changes are needed -- the data is already present and flowing through correctly.
