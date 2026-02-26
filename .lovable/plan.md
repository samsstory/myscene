

## Plan: Optimize Spotify Circuit Breaker (#1 + #2)

### What changes
Two edge functions contain identical circuit breaker logic that caps the cooldown at **14,400s (4 hours)** regardless of the actual `Retry-After` header. We'll fix both.

**Files to edit:**
- `supabase/functions/batch-artist-images/index.ts`
- `supabase/functions/unified-search/index.ts`

### Changes per file

**`tripSpotifyBreaker` function** — replace the hardcoded 4-hour cap with:
- Use the actual `Retry-After` header value when present (Spotify typically sends 1–60s)
- Default to **30 seconds** when no header is present (instead of 60s)
- Cap at **120 seconds** max (instead of 14,400s) — enough to respect Spotify's sliding window without blocking for hours

```text
Before:  const retryAfterSec = parseInt(retryAfterHeader || '60', 10);
         const cappedSec = Math.min(retryAfterSec, 14400);

After:   const retryAfterSec = parseInt(retryAfterHeader || '30', 10);
         const cappedSec = Math.min(Math.max(retryAfterSec, 5), 120);
```

This means:
- Floor of 5 seconds (avoid zero-second breakers)
- Ceiling of 2 minutes (instead of 4 hours)
- Spotify's actual `Retry-After` is respected between those bounds

### Scope
- Two files, same ~3-line change in each
- No database changes
- No frontend changes
- Edge functions auto-deploy

