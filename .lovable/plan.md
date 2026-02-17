
# Fix: "Fixing Locations..." Button Freeze on Show Globe

## Problem
When a user clicks "Fix All Missing Locations", the button shows a spinner with "Fixing Locations..." and the app freezes in that state indefinitely.

**Root cause**: The `backfill-venue-coordinates` edge function processes shows one-by-one with a 200ms delay between each, plus a geocoding API call per show. For even a handful of shows this can exceed the edge function timeout (~60s), causing the invoke call to hang and the loading spinner to never clear.

**Secondary issue**: The response handler assumes `data.results.success` exists without null checks, which can crash if the edge function returns an unexpected shape.

---

## Fix Summary

1. **Add a timeout wrapper** around the `supabase.functions.invoke` call in `handleFixMissingLocations` so the UI always recovers, even if the edge function hangs.

2. **Add null-safe access** to the response data (`data?.results?.success`) to prevent crashes on malformed responses.

3. **Optimize the edge function** to process shows in parallel (batch of 3-5 concurrently) instead of sequentially, reducing total execution time significantly.

4. **Add a global timeout** inside the edge function itself to return partial results before hitting the platform timeout.

---

## Technical Details

### File: `src/components/MapView.tsx`

- Wrap the `supabase.functions.invoke` call in a `Promise.race` with a 55-second timeout, so the UI always exits the loading state.
- Add safe access: `data?.results?.success > 0` instead of `data.results.success > 0`.
- Show a user-friendly toast if the timeout fires, suggesting they try again or fix manually.

### File: `supabase/functions/backfill-venue-coordinates/index.ts`

- Replace the sequential `for` loop with batched parallel processing (3 shows at a time using `Promise.all` on slices).
- Remove the 200ms per-show delay (the batching naturally rate-limits).
- Add a time guard: if elapsed time exceeds 50 seconds, stop processing and return partial results with a flag indicating incomplete work.
- Return a `partial: true` field when not all shows were processed so the frontend can inform the user.

### Result

- The "Fixing Locations..." button will never freeze indefinitely.
- Backfilling will be 3-5x faster due to parallel processing.
- Partial results are reported gracefully if the function runs out of time.
