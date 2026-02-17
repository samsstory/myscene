

# AI Text/Notes Parser with Spotify Enrichment

## Overview
Add a "Paste a list" import option to the existing Add Show flow. Users paste messy text (from Notes, messages, etc.), an AI edge function extracts structured show data AND enriches each artist with Spotify images/IDs, then users review pre-filled cards before batch-saving.

## User Flow

1. User opens Add Show (FAB button) -- existing BulkUploadFlow opens
2. On the photo selection screen, a new link appears: **"Paste a list instead"** (below the existing "I don't have a photo" link)
3. Tapping it navigates to a **TextImportStep** -- a large textarea with placeholder examples
4. User pastes text and taps **"Find Shows"**
5. Edge function parses text with Lovable AI, then enriches each artist via Spotify search
6. Results appear as **TextReviewStep** cards -- each card shows the Spotify artist image, pre-filled artist name, venue, and date
7. User can edit any field (reusing existing ArtistTagInput, venue search, CompactDateSelector)
8. Tapping "Add X shows" batch-saves via a new `useTextImportUpload` hook (same DB logic as `useBulkShowUpload` but without photo upload)
9. Lands on the existing BulkSuccessStep

## New Files

### 1. Edge Function: `supabase/functions/parse-show-notes/index.ts`

**What it does (two-phase pipeline):**

**Phase 1 -- AI Extraction:** Sends the pasted text to Lovable AI (`google/gemini-3-flash-preview`) using tool calling with an `extract_shows` function definition. The tool schema extracts an array of objects with `artist` (string), `venue` (string, optional), `date` (string, optional), and `confidence` (high/medium/low).

**Phase 2 -- Spotify Enrichment:** For each extracted artist name, calls the Spotify Search API (`/v1/search?type=artist&limit=1`) using the existing Client Credentials flow (reuses `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` secrets already configured). Returns `imageUrl`, `spotifyId`, and `genres` alongside the parsed show data.

**Response shape:**
```text
{
  shows: [
    {
      artist: "Bicep",
      venue: "Printworks",
      date: "2023-12-03",
      confidence: "high",
      spotify: {
        id: "3S2R...",
        imageUrl: "https://i.scdn.co/...",
        genres: ["electronica"]
      }
    },
    ...
  ]
}
```

**Error handling:** Catches 429 (rate limit) and 402 (payment required) from Lovable AI gateway and surfaces them to the client. Spotify failures are non-fatal (show still appears, just without image).

**Config:** `verify_jwt = false` in config.toml (no auth required -- text parsing is stateless).

### 2. Component: `src/components/bulk-upload/TextImportStep.tsx`

- Full-height textarea with placeholder showing example formats:
  ```text
  bicep printworks dec 2023
  fred again, ally pally, jan 12 2024
  disclosure @ hi ibiza summer 2023
  ```
- "Find Shows" gradient CTA button (matching existing style)
- Loading state with `BrandedLoader` or spinning animation
- Error states for empty input, AI failures, rate limits
- Character count hint (e.g., "Paste your list -- any format works")

### 3. Component: `src/components/bulk-upload/TextReviewStep.tsx`

- Similar layout to `BulkReviewStep` but without photo thumbnails
- Each card shows: Spotify artist image (circular, 48px) or a music icon fallback, artist name as editable `ArtistTagInput`, venue with search (same pattern as PhotoReviewCard), date via `CompactDateSelector`
- Confidence dot indicator per card (green = high, amber = medium)
- Collapsible accordion cards matching existing stacked card pattern
- "Add X shows" gradient CTA at the bottom
- Progress dots matching existing style

### 4. Hook: `src/hooks/useTextImportUpload.ts`

- Mirrors `useBulkShowUpload` but without the photo compress/upload steps
- Sets `photo_url: null` on the show record
- Handles venue creation/lookup, show_artists insertion (including `artist_image_url` and `spotify_artist_id`), show_tags insertion
- Returns `AddedShowData[]` for the success screen

## Modified Files

### 5. `src/components/BulkUploadFlow.tsx`

- Add `'text-import' | 'text-review'` to the `Step` type union
- Add state for parsed shows: `const [parsedShows, setParsedShows] = useState<ParsedShow[]>([])`
- Add `useTextImportUpload` hook
- Wire: `text-import` step renders `TextImportStep`; on AI results, transition to `text-review`
- Wire: `text-review` step renders `TextReviewStep`; on submit, save via `useTextImportUpload` then go to existing `success` step
- Update `handleBack` to handle `text-import` (back to `select`) and `text-review` (back to `text-import`)
- Update `getTitle` for new steps: `'text-import'` = "Import from Notes", `'text-review'` = "Review Shows"

### 6. `src/components/bulk-upload/PhotoSelectStep.tsx`

- Add a new `onPasteList` callback prop
- Render a link below the existing "I don't have a photo" escape hatch:
  ```text
  "Paste a list instead"
  ```
- This triggers `onPasteList()` which the parent uses to navigate to `text-import` step

### 7. `supabase/config.toml`

- Add entry: `[functions.parse-show-notes]` with `verify_jwt = false`

## AI Prompt Strategy

The system prompt instructs the model to:
- Parse any messy format (comma-separated, one-per-line, with or without dates/venues, @-separated)
- Recognize common abbreviations and venue nicknames (e.g., "printworks" = Printworks London)
- Handle multi-artist entries (e.g., "bicep b2b hammer" as one show with two artists)
- Return ISO date strings when possible, or partial dates like "2023-12" for month-only
- Mark confidence as "high" when all fields are clearly present, "medium" when inferred, "low" when guessing

## Technical Notes

- Spotify token caching: Uses the same pattern as the existing `search-artists` edge function (in-memory token with expiry check)
- Spotify lookups are parallelized with `Promise.allSettled` so one failure doesn't block the batch
- The `TextReviewStep` review cards reuse `ArtistTagInput` and `CompactDateSelector` directly -- no new form components needed
- Shows saved without photos will display Spotify artist images as fallbacks on the dashboard (already supported per existing artist-image-fallback logic)

