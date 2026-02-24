

# Copy Artist Image When Adding Shows to "Mine"

## Problem
When a user adds a show to their calendar from Friends, Discover/Edmtrain, or other sources, the `artist_image_url` is either not passed through (Edmtrain) or blindly copied (Friends -- could be a user-uploaded photo). This results in blank card images in the "Mine" section.

## Two Entry Points to Fix

### 1. Edmtrain "Add to Schedule" (`Home.tsx`)
The `handleEdmtrainAddToSchedule` function currently does NOT pass `artist_image_url` at all. Edmtrain events always have platform-sourced artist images (never user-uploaded), so this is safe to copy directly.

**Change:** Add `artist_image_url: event.artist_image_url || undefined` to the `saveUpcomingShow` call.

### 2. Friend Show Toggle (`useFriendShowToggle.ts`)
This hook currently passes `artist_image_url: show.artist_image_url ?? undefined` -- which blindly copies whatever the friend has. If the friend uploaded a personal photo, that would get copied (wrong). If the friend has a Spotify/Edmtrain artist image, it should be copied (correct).

**Problem:** There is no field on `upcoming_shows` that distinguishes "this image came from Spotify/Edmtrain" vs "this was uploaded by the user." However, user-uploaded photos go into the `show-photos` storage bucket and have URLs containing `show-photos` in the path, while Spotify/Edmtrain images are external URLs (e.g., `i.scdn.co`, `edmtrain.com`).

**Change:** Add a simple check -- if `artist_image_url` contains the Supabase storage domain (indicating user upload), skip it. Otherwise, copy it through. This is a lightweight heuristic that covers the current data patterns without requiring a schema change.

### 3. Pass `event_name` from Edmtrain too
While we're here, the Edmtrain add handler also doesn't pass `event_name`. We should pass it so the card shows the festival/event name properly.

## Files to Change

| File | Change |
|------|--------|
| `src/components/Home.tsx` | Add `artist_image_url` and `event_name` to `handleEdmtrainAddToSchedule` |
| `src/hooks/useFriendShowToggle.ts` | Add image-source check before passing `artist_image_url` -- skip if URL contains Supabase storage path |

## Image Source Heuristic

A small helper function (inline or shared):

```text
function isUserUploadedImage(url: string): boolean
  returns true if URL contains "supabase" and "show-photos"
  (i.e., it's from the storage bucket, not an external artist image)
```

If the image is user-uploaded, we simply pass `undefined` for `artist_image_url`, and the card will fall back to the default placeholder. In the future, if you want to auto-resolve a Spotify artist image as a fallback, that would be a separate enhancement using the existing artist image lookup flow.

## Sequencing
1. Update `useFriendShowToggle.ts` with the image-source check
2. Update `Home.tsx` to pass `artist_image_url` and `event_name` from Edmtrain events
