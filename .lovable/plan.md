

# Discover Tab: Personalized Recommendations with Spotify Taste Integration

## Overview

Replace the "coming soon" Discover tab placeholder with a personalized feed that blends three signal sources:

1. **Spotify taste** -- user's top artists and related artists via Spotify Web API
2. **Edmtrain events** -- cached local events (already connected)
3. **Platform social proof** -- other Scene users attending shows in your city

Each Discover card shows a "why recommended" label explaining the match.

---

## Architecture

```text
Spotify User OAuth (PKCE)
        |
        v
  spotify_top_artists table  <--- cached per user, refreshed weekly
        |
        v
  useDiscoverEvents hook  ----+---- Edmtrain events (existing cache)
        |                     |
        |                     +---- Platform upcoming_shows (new RPC)
        |                     |
        |                     +---- artist_associations (existing)
        |                     |
        |                     +---- User's logged show_artists (existing)
        v
  Scored + ranked picks (max 8)
        |
        v
  DiscoverFeed component (portrait tiles + "why" labels)
```

---

## Phase 1: Spotify User OAuth

### Why now?
Spotify taste data dramatically improves recommendations for users who have logged few shows on Scene. A user with 500 Spotify listening hours but only 3 logged shows still gets great picks. This is the single biggest signal upgrade possible.

### OAuth Flow: Authorization Code + PKCE (no backend secret needed)

Since the Spotify Client Credentials flow is already working for artist image resolution, we add user-level OAuth using PKCE (runs entirely client-side, no secret exposure):

1. User taps "Connect Spotify" in Profile or Discover empty state
2. Redirect to Spotify authorize URL with PKCE code challenge
3. Callback at `/auth/spotify/callback` exchanges code for tokens
4. Edge function `sync-spotify-taste` uses the access token to fetch:
   - `GET /me/top/artists?time_range=medium_term&limit=50`
   - `GET /me/top/artists?time_range=long_term&limit=50`
5. Results stored in `spotify_top_artists` table, deduplicated
6. Refresh token stored securely for weekly re-sync

### Database: `spotify_connections` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to auth.users, unique |
| access_token | text | encrypted at rest |
| refresh_token | text | encrypted at rest |
| expires_at | timestamptz | token expiry |
| spotify_user_id | text | Spotify profile ID |
| connected_at | timestamptz | |
| last_synced_at | timestamptz | |

RLS: users can only read/update their own row.

### Database: `spotify_top_artists` table

| Column | Type | Notes |
|--------|------|-------|
| id | uuid | PK |
| user_id | uuid | FK to auth.users |
| artist_name | text | normalized lowercase |
| spotify_artist_id | text | |
| genres | text[] | from Spotify artist object |
| popularity | int | 0-100 |
| time_range | text | 'medium_term' or 'long_term' |
| rank_position | int | position in top list |
| synced_at | timestamptz | |

RLS: users can only read their own rows. Unique constraint on (user_id, spotify_artist_id, time_range).

### Edge Function: `sync-spotify-taste`

- Accepts user's access token (passed via auth header)
- Fetches top artists from Spotify (medium_term + long_term)
- Upserts into `spotify_top_artists`
- Optionally fetches related artists for top 10 to expand the taste graph
- Updates `last_synced_at` on `spotify_connections`

---

## Phase 2: Platform Social Proof

### Database Function: `get_discover_upcoming_near_me`

Security-definer function that returns anonymized aggregates of other users' upcoming shows in the same city:

```sql
CREATE OR REPLACE FUNCTION public.get_discover_upcoming_near_me(
  p_user_id uuid,
  p_city text
)
RETURNS TABLE (
  artist_name text,
  show_date date,
  venue_name text,
  venue_location text,
  artist_image_url text,
  attendee_count bigint
)
```

- Bypasses RLS safely (only returns aggregate counts, never user identities)
- Excludes the requesting user's own shows
- Only future-dated shows
- Groups by artist + date

---

## Phase 3: Scoring Algorithm

### New Hook: `useDiscoverEvents`

Combines all signals and scores each candidate event:

| Signal | Points | Source |
|--------|--------|--------|
| Spotify top artist (medium_term) | +15 | spotify_top_artists |
| Spotify top artist (long_term) | +12 | spotify_top_artists |
| Spotify related artist | +7 | expanded taste graph |
| Direct artist match (user has logged this artist) | +10 | show_artists |
| Co-occurrence match | +5 | artist_associations |
| Platform social proof | +3 per attendee (cap 9) | RPC function |
| Festival | +2 | edmtrain_events |

Minimum threshold: score >= 1 (anything with a signal). Cap at 8 cards. Score 0 items excluded entirely.

### "Why Recommended" Labels

Each card gets a translucent pill:

| Signal | Label |
|--------|-------|
| Spotify top artist | "In your top artists" |
| Spotify related artist | "Similar to [Artist]" |
| Direct match | "You've seen [Artist]" |
| Social proof | "3 others going" |
| Co-occurrence | "Fans of [Artist] love this" |
| Festival only | "Festival near you" |

Priority: Spotify top > direct match > social proof > related/co-occurrence > festival.

---

## Phase 4: UI Components

### New: `DiscoverFeed.tsx`

- Renders inside Discover tab of WhatsNextStrip
- Horizontal scroll of portrait tiles (reuses `EdmtrainEventCard`)
- Adds `reasonLabel` prop to cards
- Three states:
  - **Not connected to Spotify + no logged shows**: "Connect Spotify or log shows to get personalized picks" with Connect button
  - **Connected but no matching events**: "Keep using Scene to unlock personalized recommendations"
  - **Has picks**: Scrollable portrait tile carousel

### Modified: `EdmtrainEventCard.tsx`

- Add optional `reasonLabel?: string` prop
- When present, render a small pill: `text-[9px] bg-white/10 backdrop-blur-sm rounded-full px-2 py-0.5` above the venue/date line

### Modified: `WhatsNextStrip.tsx`

- Remove "coming soon" placeholder (lines 354-363)
- Remove "Soon" badge from Discover tab button
- Import and render `DiscoverFeed`
- Thread `userArtistNames` as a new prop

### Modified: `SceneView.tsx`

- Pass `userArtistNames` to `WhatsNextStrip`

### New: Spotify Connect UI

- Button in Profile settings: "Connect Spotify"
- Also shown in Discover tab empty state
- Visual: Spotify green icon + "Connect" label
- On tap: initiates PKCE OAuth flow

---

## Implementation Order

1. **Database migrations** -- create `spotify_connections`, `spotify_top_artists` tables, and `get_discover_upcoming_near_me` function
2. **Spotify OAuth PKCE flow** -- client-side auth + callback route
3. **Edge function `sync-spotify-taste`** -- fetch and store user's top artists
4. **`useDiscoverEvents` hook** -- scoring algorithm combining all signals
5. **`DiscoverFeed` component** -- UI with portrait tiles and reason labels
6. **Wire into WhatsNextStrip** -- replace placeholder, thread props
7. **Profile "Connect Spotify" button** -- settings integration

---

## Secrets Required

The existing `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET` secrets are already configured and will be reused. No new secrets needed -- PKCE flow uses only the client ID on the frontend, and the edge function uses the existing credentials for token refresh.

---

## Security Considerations

- Spotify tokens stored in `spotify_connections` with RLS restricting to own user
- PKCE flow means no client secret exposed to the browser
- `get_discover_upcoming_near_me` is security-definer, returns only aggregates
- No PII leakage -- other users' identities never exposed through Discover

