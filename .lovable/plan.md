

## Phase 3 Step 1: StatsTrophyCard Performance Optimization — Updated Plan

### User Feedback Incorporated

Two adjustments based on your review:

---

### 1. TopArtists Comparator — Use Content Check

The custom `React.memo` comparator will use a name-based content check instead of length-only:

```text
prev.topArtists.map(a => a.name).join(',') ===
next.topArtists.map(a => a.name).join(',')
```

This catches reordering or name changes even when the array length stays the same. The array is always ≤3 items, so the `.map().join()` cost is negligible.

---

### 2. Stable Empty Array Fallback in SceneView

**Problem identified**: In `SceneView.tsx` line 98:
```text
topArtists={stats?.topArtists ?? []}
```
When `stats` is undefined (loading state), this creates a **new empty array** every render, which defeats `React.memo` on `StatsTrophyCard`.

**Fix**: Hoist a module-level constant:
```text
const EMPTY_ARTISTS: { name: string; imageUrl: string | null }[] = [];
```
Then use `stats?.topArtists ?? EMPTY_ARTISTS`.

---

### 3. No Object Memoization Needed

The concern about memoizing a stats object before passing to `StatsTrophyCard` does **not apply** here. `SceneView` already destructures stats into individual primitive props (`totalShows={stats?.allTimeShows ?? 0}`, etc.). The `React.memo` comparator compares these primitives directly — no wrapper object to worry about.

---

### Full Step 1 Changes

**`src/components/home/StatsTrophyCard.tsx`**:
- Wrap with `React.memo` using custom comparator (content check for `topArtists`)
- `useMemo` for `sceneTitle`, `percentileLabel`, `topArtistNames`
- Hoist gradient style objects to module-level constants

**`src/components/home/SceneView.tsx`**:
- Hoist `EMPTY_ARTISTS` constant to module level
- Hoist `defaultEdmtrainHandler` to module level
- Use `EMPTY_ARTISTS` in the `topArtists` prop fallback

### Files Changed

| File | Change |
|------|--------|
| `StatsTrophyCard.tsx` | `React.memo` with content-aware comparator, `useMemo` for derived values, hoisted styles |
| `SceneView.tsx` | Module-level `EMPTY_ARTISTS` constant, hoisted `defaultEdmtrainHandler` |

