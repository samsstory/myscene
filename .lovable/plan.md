

## Plan: Stats Trophy Card Enhancements — Title Badge, Artists Grid, Geographic Stats

The distance comparison rotation is already implemented and working. This plan adds the four remaining enhancements.

### Changes Overview

```text
BEFORE                              AFTER
┌──────────────────────────┐       ┌──────────────────────────┐
│  YOUR SCENE STATS        │       │  🎵 BASS HEAD    (pill)  │
│                          │       │  YOUR SCENE STATS        │
│  47      │ —     │ 8     │       │                          │
│  SHOWS   │ GENRE │VENUES │       │  47     │ 89     │ 8     │
│                          │       │  SHOWS  │ARTISTS │VENUES │
│  📍 1,240 miles danced   │       │                          │
│  🏆 Fred again.., Bonobo │       │  📍 1,240 miles danced   │
└──────────────────────────┘       │  "25% across the USA"    │
                                   │  🌍 12 cities · 4 countries│
                                   │  🏆 Fred again.., Bonobo │
                                   └──────────────────────────┘
```

### Files to Modify

**1. `src/hooks/useHomeStats.ts`** (1 line)

After the genre calculation block (around line 396), if `topGenre` is still `null` but `allArtists` has entries, set `topGenre = "Eclectic"`. This eliminates the "—" fallback in the UI.

**2. `src/components/home/StatsTrophyCard.tsx`** (main changes)

Four additions to the existing component:

- **Props**: Add `uniqueArtists: number`, `uniqueCities: number`, `uniqueCountries: number` to the interface. Keep `topGenre` (used by title badge now, not grid).

- **Title badge**: A pure function `getSceneTitle(topGenre, totalShows)` maps genre + show count to a persona string. Renders as a small gradient pill (cyan→purple, `text-[10px] uppercase tracking-widest`) above "YOUR SCENE STATS". Has a subtle slow pulse glow via CSS `animate-pulse`. Hidden when `totalShows === 0`. Falls back to "Music Lover" if genre is null.

  Genre mapping:
  - Electronic → "Rave Veteran" (50+) / "Raver" (<50)
  - House → "House Head"
  - Techno → "Techno Purist"
  - Hip Hop → "Hypebeast"
  - Rock → "Headbanger"
  - Indie → "Indie Kid"
  - Pop → "Pop Stan"
  - Eclectic → "Genre Fluid"
  - Default → "Music Lover"

- **Middle stat box**: Replace the Genre text box with a `CountUp` for `uniqueArtists`, labeled "🎵 Artists". Same visual style as Shows and Venues boxes.

- **Geographic row**: Below the distance comparison tagline, render `🌍 X cities · Y countries` in the same `text-[12px] text-muted-foreground` style. Only shown if `uniqueCities > 0 || uniqueCountries > 0`. If only 1 country, show just cities.

- **Empty state blur**: Update the blurred placeholder to show "Artists" instead of "Genre" in the middle box.

**3. `src/components/home/SceneView.tsx`** (prop threading)

Update `StatsForCard` interface to include `uniqueArtists`, `uniqueCities`, `uniqueCountries`. Pass them to `StatsTrophyCard`.

**4. `src/index.css`** (optional)

Add a `title-badge-glow` keyframe if the existing `animate-pulse` doesn't produce a subtle enough effect. This would be a 3-second opacity oscillation between 0.8 and 1.0.

### No Database Changes

All data (`uniqueArtists`, `uniqueCities`, `uniqueCountries`, `topGenre`) is already computed in `useHomeStats` and available in the `stats` object passed through `Home.tsx` → `SceneView.tsx`.

### Implementation Order

1. Fix genre fallback in `useHomeStats.ts`
2. Update `StatsTrophyCard.tsx` — title badge, swap genre→artists, geographic row
3. Thread props in `SceneView.tsx`
4. Test all states: 0 shows (blur), 1 show, full stats

