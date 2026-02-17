

# Smarter Venue Filtering in Unified Search

## Problem
Two issues at play:
1. The `unified-search` function uses an outdated Google Places API with a weak blacklist, letting irrelevant results (dentists, flower shops) through when searching "Ultra Music Festival"
2. A strict whitelist (like in `search-venues`) would block unconventional concert locations like "Under the K Bridge" in NYC, a warehouse, a rooftop, or a random park

## Recommended Approach: Whitelist + Fallback Tier

Port the proven whitelist logic from `search-venues` into `unified-search`, but add a **secondary tier** for results that don't match the whitelist. This gives users the best of both worlds:

- **Primary results**: Whitelisted venue types (clubs, arenas, theaters, parks, etc.) shown prominently
- **Secondary results**: Non-whitelisted places shown in a collapsed "Other locations" section, so users can still pick unconventional spots

This avoids Gemini/AI overhead entirely while solving both the noise problem and the edge-case venue problem.

## Changes

### 1. `supabase/functions/unified-search/index.ts`

**Replace the `searchGooglePlaces` function:**
- Switch from legacy `textsearch/json` endpoint to modern `v1/places:searchText` (same as `search-venues`)
- Append `"music venue OR festival"` to bias the query
- Use `X-Goog-FieldMask` headers to get `types` data

**Add whitelist filtering from `search-venues`:**
- Import the `relevantGoogleTypes` set and `relevantCategoryKeywords` list
- Filter results into two tiers: `matched` (whitelist hit or exact name match) and `other` (everything else)
- Remove the old `excludeKeywords` blacklist entirely

**Add Foursquare as a parallel source:**
- Query Foursquare alongside Google (same pattern as `search-venues`)
- Apply the `relevantCategoryKeywords` whitelist with the same two-tier approach

**Update the results structure:**
- Add an optional `tier` field to `UnifiedSearchResult` (`'primary' | 'other'`)
- Primary tier: whitelisted venues, user history, exact name matches
- Other tier: non-whitelisted but not explicitly excluded

### 2. `src/components/add-show-steps/UnifiedSearchStep.tsx`

**Add "Other locations" collapsible section:**
- Split venue results into primary and secondary tiers
- Primary venues display as they do now
- Secondary venues appear in a collapsed "More locations" section that expands on tap
- This keeps the main list clean while preserving access to unusual spots

## Technical Details

- The `relevantGoogleTypes` set already includes `night_club`, `bar`, `park`, `event_venue`, `tourist_attraction` -- nightclubs and parks are covered
- Name-match bypass ensures that if someone searches "Under the K Bridge" and Google returns it, it passes through regardless of type
- The "Other locations" section acts as a safety net -- even a random Google result can be selected, it's just not front and center
- No new API keys or secrets needed; uses existing `GOOGLE_PLACES_API_KEY` and `FOURSQUARE_API_KEY`
- No added latency -- Foursquare and Google run in parallel (same as `search-venues`)

