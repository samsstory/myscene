# Discover Tab: Implementation Complete ✅

## What was built

### Database
- `spotify_connections` table — stores OAuth tokens per user with RLS
- `spotify_top_artists` table — cached taste data per user with RLS  
- `get_discover_upcoming_near_me()` — security-definer RPC for anonymized social proof

### Spotify OAuth (PKCE)
- `src/lib/spotify-pkce.ts` — client-side PKCE auth utilities
- `src/pages/SpotifyCallback.tsx` — callback handler at `/auth/spotify/callback`
- `VITE_SPOTIFY_CLIENT_ID` — frontend env var for PKCE flow

### Backend
- `supabase/functions/sync-spotify-taste/` — fetches top artists, refreshes tokens, upserts data

### Hooks
- `src/hooks/useSpotifyConnection.ts` — manages Spotify connection state
- `src/hooks/useDiscoverEvents.ts` — scoring algorithm combining all signals

### UI
- `src/components/home/DiscoverFeed.tsx` — Discover tab with portrait tiles + reason labels
- `EdmtrainEventCard.tsx` — added `reasonLabel` prop
- `WhatsNextStrip.tsx` — replaced "coming soon" placeholder with DiscoverFeed
- `Profile.tsx` — added "Music Taste" section with Connect/Disconnect Spotify

### Scoring weights
| Signal | Points |
|--------|--------|
| Spotify top artist | +15 |
| Logged show artist | +10 |
| Co-occurrence match | +5 |
| Social proof | +3/attendee (cap 9) |
| Festival | +2 |

## Future enhancements
- Weekly auto-resync of Spotify taste data via cron
- Spotify related artists expansion for deeper taste graph
- Friend-specific "going" badges on Discover cards
