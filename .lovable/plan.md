

# Add "Use Artist Photo" Option to Quick Photo Add Sheet

## Overview
Add a one-tap option to the QuickPhotoAddSheet that lets users set the artist's Spotify image as the show's photo, instead of uploading from camera roll. This gives shows without photos an instant visual without requiring the user to find and upload an image.

## What Changes

### `src/components/QuickPhotoAddSheet.tsx`
- Add the artist's Spotify image URL to the `Show` interface (already available as `imageUrl` on artists from the Home component)
- Below the "Add a photo" upload zone, render an "Use artist photo" button that:
  - Shows a small circular preview of the Spotify image
  - On tap, updates the show's `photo_url` in the database to the Spotify image URL (no storage upload needed -- it's already a public URL)
  - Calls `onPhotoAdded(spotifyImageUrl)` and closes the sheet
  - Only appears when the headliner has a Spotify image available
- The upload zone and the artist photo option sit side-by-side or stacked, giving the user two clear paths

### `src/components/Home.tsx` (minor)
- Ensure the `artist_image_url` field is passed through to the show objects that feed into `QuickPhotoAddSheet`, so the Spotify URL is available at render time. The data is already fetched (line 251) -- just needs to be threaded into the sheet's `show` prop.

### `src/components/home/MissingPhotosSheet.tsx` (minor)
- In the show list on the select-photos step, for shows whose headliner has a Spotify image, add a small "Use artist photo" quick-action button on each row. Tapping it immediately sets that show's `photo_url` to the Spotify image and removes it from the missing-photos list.

## Technical Details

- No new edge functions or database changes needed -- `photo_url` already accepts any URL string
- The Spotify image is a public CDN URL (`i.scdn.co`) so it works directly as a `photo_url` value
- The `artist_image_url` is already stored in `show_artists` and fetched in the Home component query
- The artist image data flows: `show_artists.artist_image_url` -> Home query -> show object -> QuickPhotoAddSheet prop

