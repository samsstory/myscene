

# Integrate Events Registry Into Search and Auto-Populate

## Overview

Two changes:
1. **Unified search** returns matching events from the `events` table so users see "Float Fest" with its venue/location pre-filled
2. **After saving** a festival/show-type entry, auto-upsert into the `events` table so future users benefit

---

## 1. Edge Function: `unified-search/index.ts`

Add an `events` table query alongside Spotify, Google, and Foursquare searches.

### New function: `searchEvents`

Query the `events` table using trigram similarity:

```typescript
async function searchEvents(searchTerm: string, supabaseClient: any): Promise<UnifiedSearchResult[]> {
  const { data } = await supabaseClient
    .from('events')
    .select('id, name, venue_name, venue_location, venue_id, event_type, year')
    .ilike('name', `%${searchTerm}%`)
    .order('year', { ascending: false })
    .limit(5);

  // Deduplicate by name (keep most recent year)
  const seen = new Set<string>();
  const results: UnifiedSearchResult[] = [];
  for (const event of (data || [])) {
    const key = event.name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    results.push({
      type: 'venue',
      id: event.venue_id || `event-${event.id}`,
      name: event.name,
      location: event.venue_location || event.venue_name || '',
      tier: 'primary',
      // Pass event metadata through for downstream use
      eventId: event.id,
      eventType: event.event_type,
      venueName: event.venue_name,
    });
  }
  return results;
}
```

### Wire into main handler

Add `searchEvents` to the `Promise.all` alongside Spotify/venues/userHistory. Insert event results **before** Google/Foursquare venues with `tier: 'primary'` so they appear at the top of the venue section.

### Interface update

Add optional fields to `UnifiedSearchResult`: `eventId`, `eventType`, `venueName` (the physical venue name, separate from the event name).

---

## 2. Frontend: `UnifiedSearchStep.tsx`

Update the `UnifiedSearchResult` interface to include optional `eventId?: string`, `eventType?: string`, `venueName?: string` fields passed through from the edge function. No other changes needed here -- results already render as venue cards.

---

## 3. Frontend: `AddShowFlow.tsx` -- handle event selection

In `handleUnifiedSelect`, when a result has `eventId` set (meaning it came from the events registry):

- Set `eventName` to the event name
- Set `venue` to the event's physical venue name
- Set `venueLocation` to the event's location
- This means the user can **skip the venue step** since venue is already known
- Jump directly to the **Date step** instead of the Venue step

---

## 4. Frontend: `AddShowFlow.tsx` -- auto-populate events table on save

After successfully inserting a new show with `show_type = 'festival'` or `show_type = 'show'` and an `event_name`:

```typescript
if (!isEditing && showData.eventName && (showData.showType === 'festival' || showData.showType === 'show')) {
  const showYear = new Date(showDate).getFullYear();
  await supabase
    .from('events')
    .upsert({
      name: showData.eventName,
      venue_name: showData.venue,
      venue_location: showData.venueLocation || null,
      venue_id: venueIdToUse,
      event_type: showData.showType,
      year: showYear,
      created_by_user_id: user.id,
    }, { onConflict: 'name,year', ignoreDuplicates: true });
}
```

This fires after the show insert, using `ignoreDuplicates: true` so the first uploader's data is preserved. The `title_case` trigger standardizes the name automatically.

---

## Files to modify

| File | Change |
|------|--------|
| `supabase/functions/unified-search/index.ts` | Add `searchEvents` function, wire into `Promise.all`, merge results before external venues |
| `src/components/add-show-steps/UnifiedSearchStep.tsx` | Add `eventId`, `eventType`, `venueName` to interface |
| `src/components/AddShowFlow.tsx` | Handle event-registry selection (skip venue step), auto-upsert events on save |

