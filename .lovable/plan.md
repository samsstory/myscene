

## Plan: Animation Polish + Top Percentile Stat

### Overview

Four coordinated changes: session-aware CountUp, slower/staggered animations, gentle badge glow, and a gold percentile pill.

### 1. `src/components/home/CountUp.tsx` — Session-Aware Animation

- Read `sessionStorage.getItem("scene_stats_animated")` on mount
- If already set: initialize `display = value` and `hasAnimated = true` (skip animation)
- After first animation completes: `sessionStorage.setItem("scene_stats_animated", "1")`
- Result: numbers count up on cold start, stay static when switching tabs

### 2. `src/hooks/useHomeStats.ts` — Add `totalUsers` Count

Add to `StatsData` interface:
```typescript
totalUsers: number;
```

After the existing stats queries (around line 449), add:
```typescript
const { count: totalUsers } = await supabase
  .from('profiles')
  .select('*', { count: 'exact', head: true });
```

Pass `totalUsers: totalUsers ?? 0` in the `setStats` call.

### 3. `src/components/home/StatsTrophyCard.tsx` — All Visual Changes

**Props**: Add `totalUsers?: number`

**Rotation interval**: Change from `5000` → `8000` ms, with a 2-second delay before first rotation starts

**Badge glow**: Replace `animate-pulse` with inline CSS keyframe `badge-breathe` (4s cycle, opacity 0.7→1.0):
```css
@keyframes badge-breathe {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}
```

**Staggered entrance**: Wrap bottom details section in `motion.div` with framer-motion variants:
- Container: `staggerChildren: 0.25, delayChildren: 0.3`
- Each row (miles, comparison, geo, artists): `motion.div` with fade-in variant (opacity 0→1, y 4→0, 400ms)

**Percentile pill**: Add `getPercentile(showCount, totalUsers)` function:
- Returns `null` if `showCount < 5` (hidden)
- If `totalUsers < 50`: returns `"Early Adopter ⭐"`
- Otherwise uses tiered brackets:
  - 100+ shows → "Top 1%"
  - 50+ → "Top 5%" (meaning user has more shows than 95% of users)
  - 20+ → "Top 10%"
  - 10+ → "Top 25%"
  - 5+ → "Top 50%"
- Rendered as gold/amber gradient pill next to "Your Scene Stats" text
- Styling: `text-[10px] uppercase`, amber gradient background, gold text, gold border

### 4. `src/components/home/SceneView.tsx` — Thread `totalUsers`

Add `totalUsers?: number` to `StatsForCard` interface. Pass `stats?.totalUsers` to `StatsTrophyCard`.

### Files Changed

| File | Change |
|------|--------|
| `CountUp.tsx` | sessionStorage guard for animation |
| `useHomeStats.ts` | Add `totalUsers` count query + interface |
| `StatsTrophyCard.tsx` | 8s rotation, 2s delay, stagger, badge breathe, percentile pill |
| `SceneView.tsx` | Thread `totalUsers` prop |

### Implementation Order

1. `CountUp.tsx` — sessionStorage guard
2. `useHomeStats.ts` — add `totalUsers`
3. `StatsTrophyCard.tsx` — all visual changes
4. `SceneView.tsx` — thread prop

