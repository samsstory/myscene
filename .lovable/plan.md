

## Remove Music Taste Tags (Scene Title Badge)

The "scene title" feature — the badge showing labels like "Techno Purist", "House Head", "Genre Fluid", etc. — lives in `StatsTrophyCard.tsx` and is derived from the `topGenre` prop via the `getSceneTitle()` function.

### Changes

**1. `src/components/home/StatsTrophyCard.tsx`**
- Delete the `getSceneTitle()` function (lines 29–43)
- Remove the `sceneTitle` useMemo (line 107)
- Remove the badge `<span>` that renders `🎵 {sceneTitle}` (lines 192–196)
- Remove `topGenre` from the props interface, destructuring, and memo comparator
- The `topGenre` computation in `useHomeStats.ts` and the prop pass-through in `SceneView.tsx` can stay or be removed — they're inert without the badge. Cleanest to remove them too.

**2. `src/hooks/useHomeStats.ts`**
- Remove `topGenre` from the return type and all computation logic (the artist genre aggregation block ~lines 344–373)
- Remove from default return object

**3. `src/components/home/SceneView.tsx`**
- Remove the `topGenre` prop from `<StatsTrophyCard>` usage and from the `StatsForCard` interface

Three files, purely deletions. No database or backend changes needed.

