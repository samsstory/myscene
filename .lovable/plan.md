

## Plan: Distance Comparison Rotation

### What We're Building

A rotating tagline below the "miles danced" stat that cycles through fun benchmarks (USA width, Earth circumference, Moon distance) every 5 seconds with a fade animation.

### Files to Create

**`src/lib/distance-comparisons.ts`** — Pure utility function

Returns a human-readable comparison string based on mileage tier:
- Under ~2,800 mi: "X% across the USA 🇺🇸" (with special copy at 50%, 75%+)
- ~2,800–30,000 mi: "X% around the world 🌍" / "Xx around the world 🌍"
- 30,000+ mi: "X% of the way to the Moon 🌙" / "You've danced to the Moon 🌙"

Also exports a `getComparisonsForMiles(miles)` function that returns an array of all applicable taglines for the user's tier (so we have multiple to rotate through when mileage is high enough to span tiers).

Under 100 miles: returns `["Keep dancing! 🕺"]` (static, no rotation).

### Files to Modify

**`src/components/home/StatsTrophyCard.tsx`**

- Import `getComparisonsForMiles` from the new utility
- Add `useState` for `comparisonIndex` and `useEffect` for the 5-second rotation interval (only when `milesDanced > 100` and comparisons array length > 1)
- Insert a new `<AnimatePresence>` + `<motion.p>` block directly below the existing miles danced line (line 181), using `key={comparisonIndex}` for fade-in/out transitions (opacity 0→1 over 500ms)
- Styling: `text-sm text-cyan-400/80 italic` — sits tight under the miles line with no extra spacing

### Technical Details

- The rotation `setInterval` cleans up on unmount and resets if `milesDanced` changes
- `AnimatePresence mode="wait"` ensures smooth crossfade between taglines (framer-motion already installed)
- The comparison function is pure with no side effects — easily testable
- No database changes, no new hooks, no new dependencies

### Implementation Order

1. Create `src/lib/distance-comparisons.ts`
2. Add rotation state + comparison line to `StatsTrophyCard.tsx`

