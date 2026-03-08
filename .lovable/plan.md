

## Bug: Incorrect city count on Globe/Map stats

### Problem
The `getCityFromLocation` parser produces inconsistent city keys from `venue_location` strings, causing the same city to be counted multiple times (or different cities to collapse). For user "Jonathanhikes":

| venue_location | Parsed city | Issue |
|---|---|---|
| `Austin, TX` | `Austin, TX` | — |
| `Austin, Texas` | `Austin, Texas` | Duplicate of above |
| `8509 Burleson Rd, Austin, TX 78719` | `Austin, TX` | Correct (matches first) |
| `Buena Vista Lake, Kern County, CA 93263` | `Buena Vista Lake, Kern County` | Missing state normalization |
| `Andador Careyes, 45407 Tonalá, Jalisco, Mexico` | `Andador Careyes, 45407 Tonalá` | Includes street number in city |

"Austin, TX" and "Austin, Texas" count as **2 separate cities** instead of 1. The function exists in two places with the same bug.

### Fix

Create a shared `getCityFromLocation` utility that normalizes output:

1. **Normalize US state abbreviations** — map full names ("Texas") to abbreviations ("TX") so `Austin, TX` and `Austin, Texas` produce the same key
2. **Strip zip codes more aggressively** — remove any trailing numeric sequences from all parts, not just the last
3. **Handle international addresses better** — for 4+ part addresses (street, neighborhood, city, country), skip the first parts to find the actual city

### Files to change

1. **New: `src/lib/location-utils.ts`** — Extract shared `getCityFromLocation` and `getCountryFromLocation` with normalization logic (single source of truth)
2. **`src/components/MapView.tsx`** (~lines 116-148) — Replace inline functions with imports from `location-utils.ts`
3. **`src/hooks/useHomeStats.ts`** (~lines 163-185) — Replace inline functions with imports from `location-utils.ts`

### Normalization approach
- Build a `STATE_FULL_TO_ABBREV` map (`"Texas" → "TX"`, etc.)
- In `getCityFromLocation`, after extracting city + state parts, normalize the state portion
- Output format: `"CityName, ST"` (always abbreviated) for consistent deduplication

