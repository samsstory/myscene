
# Fix: Prefer Show Graphic Over Spotify Artist Image

## Problem Analysis

The current image selection chain is:

```text
User uploads screenshot(s)
        ↓
Edge function ignores screenshots as image candidates
        ↓
Spotify search runs on the extracted artist name
        ↓
confirmedEvent.artist_image_url = Spotify profile photo (always)
        ↓
Confirmation card displays Spotify photo (always)
        ↓
Saved upcoming show uses Spotify photo
```

The screenshot the user uploaded — which is often the actual show graphic or poster — is never considered as the image for the card or the saved record.

## Desired Behavior

```text
User uploads screenshot(s)
        ↓
If exactly 1 screenshot → use it as the show image
If 0 screenshots (text/URL input) → fall back to Spotify artist image
If 2+ screenshots → fall back to Spotify artist image (ambiguous which is the show graphic)
        ↓
Confirmation card backdrop shows the correct image
        ↓
Saved upcoming show stores the correct image URL
```

## What Needs To Change

### 1. Store the screenshot as a file in cloud storage before saving

Currently, screenshots only exist as local `blob:` preview URLs (created by `URL.createObjectURL`). These are temporary — they disappear when the session ends and can't be stored in the database.

When a single screenshot was uploaded and the user hits "Add To Calendar", the file needs to be uploaded to cloud storage (`show-photos` bucket) to get a permanent URL.

### 2. Image priority logic in `PlanShowSheet.tsx`

After parsing, set a `selectedImageUrl` in state using this priority:

- **1 screenshot uploaded** → use that screenshot's local preview URL for the confirmation card UI, and upload the actual file to storage on save
- **0 or 2+ screenshots** → use `confirmedEvent.artist_image_url` (Spotify) as before

### 3. Confirmation card renders `selectedImageUrl`

The artist card backdrop (line 391–398 in `PlanShowSheet.tsx`) currently reads `confirmedEvent.artist_image_url`. It will instead read from the new `selectedImageUrl` state.

### 4. Save path uploads file if needed

In `handleSave`, before calling `saveUpcomingShow`:
- If the image source is a screenshot file (not a Spotify URL), upload it to the `show-photos` Supabase storage bucket
- Use the returned permanent public URL as `artist_image_url` in the saved record
- If upload fails, gracefully fall back to Spotify image

## Files To Edit

**`src/components/home/PlanShowSheet.tsx`** (only file that needs changing):
- Add `selectedImageFile` state (`File | null`) to track the screenshot file chosen as the show graphic
- Add `selectedImageUrl` state (`string | null`) to track what's shown in the card
- After `handleParse` resolves events, set `selectedImageFile` to `screenshots[0].file` and `selectedImageUrl` to `screenshots[0].preview` when exactly 1 screenshot exists; otherwise set both to `null` and use `confirmedEvent.artist_image_url` for the URL
- Update the artist card backdrop JSX to use `selectedImageUrl ?? confirmedEvent.artist_image_url`
- In `handleSave`, if `selectedImageFile` is set, upload to `show-photos` storage bucket first, then use the resulting public URL as `artist_image_url`; otherwise use `confirmedEvent?.artist_image_url`
- Reset `selectedImageFile` and `selectedImageUrl` in `resetInputState`

No edge function changes or database migrations are needed.
