
# Add Spotify Artist Image + ID to Database

## Overview
Add `artist_image_url` and `spotify_artist_id` columns to the `show_artists` table, then update the add-show flows to capture and persist this data from Spotify search results.

## Steps

### 1. Database Migration
Add two nullable text columns to `show_artists`:
- `artist_image_url` (text, nullable) -- Spotify profile image URL
- `spotify_artist_id` (text, nullable) -- Spotify artist ID for future linking

### 2. Expand the Artist Type Throughout the Flow
Update the artist object type from `{ name: string; isHeadliner: boolean }` to also include optional `imageUrl?: string` and `spotifyId?: string` fields. This affects:
- **AddShowFlow.tsx** -- `ShowData.artists` type and the insert logic (lines ~477-486) to include `artist_image_url` and `spotify_artist_id` when inserting
- **ArtistsStep.tsx** -- When a suggestion is selected via `addArtist`, pass through the `imageUrl` and `spotifyId` from the suggestion
- **Home.tsx** -- When reading back artists, map `artist_image_url` to the local type (for future fallback use)

### 3. Update Bulk Upload Flow
- **useBulkShowUpload.ts** -- Include `artist_image_url` and `spotify_artist_id` in the `show_artists` insert payload when available
- **BulkReviewStep / PhotoReviewCard** -- Pass through artist image data from the artist search step

### 4. Files Changed
| File | Change |
|------|--------|
| `show_artists` table (migration) | Add `artist_image_url` and `spotify_artist_id` columns |
| `src/components/add-show-steps/ArtistsStep.tsx` | Capture imageUrl + spotifyId from Spotify suggestions |
| `src/components/AddShowFlow.tsx` | Include new fields in DB insert |
| `src/hooks/useBulkShowUpload.ts` | Include new fields in bulk insert |
| `src/components/Home.tsx` | Map new columns when reading artists |

No changes to edge functions, RLS policies, or storage -- just two new nullable columns and plumbing the data through existing insert paths.
