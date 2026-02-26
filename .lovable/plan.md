

## Plan: Community Rankings Section Overhaul

### Summary
Redesign the "Top Rated Near You" section to emphasize community aggregate rankings with win rate/matchup data from the ELO system, conversational copy, and a refreshed card design.

### Current State
- **SceneView.tsx** renders a `<SectionLabel>Top Rated Near You</SectionLabel>` followed by a `TopRatedSection` component
- **TopRatedSection** delegates to `PopularFeedGrid` which shows numbered leaderboard rows with rank numbers, artist images, venue names, user counts, and a "+" button
- **PopularFeedGrid** has `GeoTabs` (City/Country/World pills) and `SubTabs` (Sets/Shows/Festivals pills) as filter controls
- **usePopularNearMe** fetches shows filtered by geo scope, aggregates by artist or event, returns `PopularItem[]` with `userCount`
- **usePopularShows** defines `PopularItem` types (`PopularArtist` | `PopularEvent`) — neither includes win rate or matchup count
- The ELO data exists in `show_rankings` (elo_score, comparisons_count) and `show_comparisons` (show1_id, show2_id, winner_id) — win rate can be computed from comparisons

### Technical Details

#### 1. Extend PopularItem types (`src/hooks/usePopularShows.ts`)
Add three new optional fields to both `PopularArtist` and `PopularEvent`:
- `winRate: number | null` — percentage (0–100), computed from show_comparisons
- `matchupCount: number` — total comparisons across all users
- `userCountRanked: number` — users who have this in their ranked list (with comparisons > 0)

#### 2. Enrich data in `usePopularNearMe` hook (`src/hooks/usePopularNearMe.ts`)
After fetching shows and aggregating by artist/event, also:
- Fetch `show_rankings` rows for the relevant show IDs to get `comparisons_count`
- Fetch `show_comparisons` rows to compute win counts per show (where `winner_id = show_id`)
- Aggregate win rate at the artist/event level: sum wins / sum total appearances in comparisons
- Pass `winRate`, `matchupCount`, `userCountRanked` into each `PopularItem`
- Also return the user's resolved city name (already available from profile) so the header can display it

#### 3. Update hook return value
`usePopularNearMe` will additionally return `cityName: string | null` so SceneView can display "Top Ranked in Los Angeles"

#### 4. Redesign `PopularFeedGrid` (`src/components/home/PopularFeedGrid.tsx`)

**Header area changes:**
- Accept `cityName` prop and `geoScope` to construct the title: "Top Ranked in [City]" / "Top Ranked in [Country]" / "Top Ranked Worldwide"
- Add subtitle: "Shows that dominate their matchups"
- Replace the `GeoTabs` pill strip with a simpler dropdown showing "Showing: Los Angeles ▼" that expands to Nearby / Country / Worldwide options
- Keep the Sets/Shows/Festivals SubTabs

**LeaderboardRow card changes:**
- Remove the rank number column (#1, #2, #3)
- Keep artist image (slightly larger, 12×12 rounded-xl)
- Keep artist name + venue name
- Replace the small user count badge with a stats line: `⚡ 94% wins · 203 matchups · 👥 89 users`
- If win rate data isn't available for an item, show a softer fallback: `👥 89 users`
- Change the "+" button label to "Add to My Scene"
- Add a subtle distinct background tint (e.g., `bg-white/[0.03]` with a faint amber/warm border) to differentiate from Upcoming Shows

#### 5. Update SceneView section (`src/components/home/SceneView.tsx`)
- Remove the standalone `<SectionLabel>Top Rated Near You</SectionLabel>` — the title is now rendered inside PopularFeedGrid
- Pass `cityName` from the hook into PopularFeedGrid
- The `TopRatedSection` wrapper remains but passes the new prop through

### Files Modified
1. `src/hooks/usePopularShows.ts` — extend PopularItem interfaces
2. `src/hooks/usePopularNearMe.ts` — fetch ELO/comparison data, return cityName
3. `src/components/home/PopularFeedGrid.tsx` — full redesign of header + card layout
4. `src/components/home/SceneView.tsx` — update section rendering

### What Stays Unchanged
- VS Hero Widget, Stats Trophy Card, Upcoming Shows, WhatsNextStrip — untouched
- The ELO system itself — no schema changes needed
- The show_rankings and show_comparisons tables — read-only usage

