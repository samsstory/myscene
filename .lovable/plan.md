
# Automatic Venue Matching from Photo GPS Data

## Overview

When a user uploads a photo in the bulk upload flow, the system will automatically detect the venue by:
1. Reading the photo's GPS coordinates from EXIF metadata (already implemented)
2. Calling a new edge function that searches Google Places Nearby API within 400m
3. Auto-populating the venue field with the best match
4. Allowing users to select from alternative nearby venues if needed

## Architecture

```text
Photo Upload Flow
       │
       ▼
┌─────────────────┐     ┌──────────────────────┐
│ Extract EXIF    │────►│ Has GPS coordinates? │
│ (client-side)   │     └──────────────────────┘
└─────────────────┘              │
                          Yes    │    No
                          ┌──────┴──────┐
                          ▼             ▼
              ┌───────────────────┐   Manual venue
              │ match-venue-from- │   selection
              │ location (edge fn)│   (existing)
              └───────────────────┘
                          │
                          ▼
              ┌───────────────────┐
              │ Google Places     │
              │ Nearby Search API │
              │ (400m radius)     │
              └───────────────────┘
                          │
                          ▼
              ┌───────────────────┐
              │ Filter for music  │
              │ venue types       │
              └───────────────────┘
                          │
                          ▼
              ┌───────────────────┐
              │ Match to existing │
              │ venues in DB      │
              └───────────────────┘
                          │
                          ▼
              ┌───────────────────┐
              │ Return primary +  │
              │ alternative venues│
              └───────────────────┘
```

## Implementation Details

### 1. New Edge Function: `match-venue-from-location`

**File:** `supabase/functions/match-venue-from-location/index.ts`

**Input:**
```typescript
{
  latitude: number;
  longitude: number;
  timestamp?: string; // Optional - for future filtering by date
}
```

**Output:**
```typescript
{
  primaryVenue: {
    id?: string;           // Internal venue ID (if exists in DB)
    externalPlaceId: string; // Google Places ID
    name: string;
    address: string;
    city?: string;
    distanceMeters: number;
  } | null;
  alternativeVenues: Array<{
    id?: string;
    externalPlaceId: string;
    name: string;
    address: string;
    city?: string;
    distanceMeters: number;
  }>;
  matchSource: 'database' | 'places_api' | 'none';
}
```

**Logic:**
1. First check local `venues` table for venues within 400m using Haversine formula
2. If no local matches, call Google Places Nearby Search API
3. Filter results for music venue types: `night_club`, `bar`, `stadium`, `music_venue`, `point_of_interest`
4. Exclude irrelevant types: hotels, restaurants, gas stations, etc.
5. Sort by distance and return top 3 closest
6. Cache new venues to the database for future lookups

### 2. Update EXIF Types

**File:** `src/lib/exif-utils.ts`

Add venue suggestion types to `PhotoWithExif`:

```typescript
export interface VenueSuggestion {
  id?: string;
  externalPlaceId?: string;
  name: string;
  address: string;
  city?: string;
  distanceMeters: number;
}

export interface PhotoWithExif {
  // ... existing fields ...
  suggestedVenue?: VenueSuggestion;
  alternativeVenues?: VenueSuggestion[];
  venueMatchStatus?: 'pending' | 'found' | 'not_found' | 'no_gps';
}
```

### 3. New Hook: `useVenueFromLocation`

**File:** `src/hooks/useVenueFromLocation.ts`

```typescript
export function useVenueFromLocation() {
  const matchVenue = async (
    latitude: number,
    longitude: number
  ): Promise<VenueMatchResult> => {
    const { data, error } = await supabase.functions.invoke(
      'match-venue-from-location',
      { body: { latitude, longitude } }
    );
    return data;
  };
  
  return { matchVenue };
}
```

### 4. Update BulkReviewStep

**File:** `src/components/bulk-upload/BulkReviewStep.tsx`

- On mount, trigger venue matching for all photos with GPS data
- Show loading state while matching
- Pass matched venues to `PhotoReviewCard`

### 5. Update PhotoReviewCard

**File:** `src/components/bulk-upload/PhotoReviewCard.tsx`

Changes:
- Auto-populate venue field when `suggestedVenue` exists
- Add visual indicator for auto-detected venues (location pin icon)
- Add dropdown to select from `alternativeVenues`
- Show distance from photo location
- Keep manual search as fallback

**UI Changes:**
```text
┌─────────────────────────────────────────────┐
│ 📍 The Basement East               ▼       │ ← Auto-detected
│    Nashville, TN • 120m away               │
└─────────────────────────────────────────────┘

Dropdown shows:
┌─────────────────────────────────────────────┐
│ ✓ The Basement East (120m)                 │
│   Exit/In (280m)                           │
│   The Basement (350m)                      │
│   ─────────────────────                    │
│   Search for a different venue...          │
└─────────────────────────────────────────────┘
```

### 6. Configuration

**Edge Function Config:** `supabase/config.toml`
```toml
[functions.match-venue-from-location]
verify_jwt = true
```

**Environment:** Uses existing `GOOGLE_PLACES_API_KEY` secret (already configured)

## File Changes Summary

| File | Action |
|------|--------|
| `supabase/functions/match-venue-from-location/index.ts` | Create |
| `supabase/config.toml` | Update |
| `src/lib/exif-utils.ts` | Update - add venue suggestion types |
| `src/hooks/useVenueFromLocation.ts` | Create |
| `src/components/bulk-upload/BulkReviewStep.tsx` | Update - trigger matching |
| `src/components/bulk-upload/PhotoReviewCard.tsx` | Update - show venue UI |

## Testing the Flow

1. **With GPS Photo:**
   - Upload a photo taken at a known music venue
   - Verify venue is auto-detected and populated
   - Check that alternatives are shown in dropdown
   - Confirm selecting an alternative updates the form

2. **Without GPS Photo:**
   - Upload a photo without location data
   - Verify fallback to manual venue search
   - Check that "No GPS" indicator is shown

3. **Edge Cases:**
   - Photo in area with no music venues (should show "No venues found")
   - Photo with GPS but no timestamp
   - Multiple photos in batch with mixed GPS availability

## Technical Notes

- **Rate Limiting:** Google Places Nearby Search has usage limits. The edge function will first check local DB to minimize API calls.
- **Caching:** New venues from Google are cached to improve future lookups.
- **Distance Calculation:** Uses Haversine formula for accurate distance on Earth's surface.
- **Privacy:** GPS data is only used server-side and not stored with the show record.
