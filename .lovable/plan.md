

## Plan Confirmation: VS Hero Widget — Specific Details

### 1. VS Badge Styling — Upgraded with Glow

The current VS badge in `Rank.tsx` is deliberately subdued (28px, `bg-white/[0.06]`, `text-white/50`). For the hero widget, the badge will be **bolder and glowing**:

```text
Current (Rank tab):     w-7 h-7, white/6% bg, white/50% text, no shadow
Hero widget (new):      w-12 h-12, cyan→purple gradient bg, white bold text,
                        box-shadow: 0 0 20px rgba(0,217,255,0.4)
```

Specific implementation:
- 48px circle (`w-12 h-12`)
- Background: `bg-gradient-to-br from-[#00D9FF] to-[#7B61FF]`
- Text: `text-white font-bold text-sm`
- Glow: `style={{ boxShadow: '0 0 20px rgba(0,217,255,0.4)' }}`
- Slight rotation: `rotate-[-5deg]`
- `z-10`, centered between cards with absolute positioning
- Framer-motion spring entrance: scale 0 → 1.2 → 1.0 with 100ms delay after cards

This does NOT change the existing Rank tab badge — the hero widget has its own markup.

### 2. Card Sizing — Full-Width, Large, Tappable

The existing `RankingCard` uses `flex-1` and `aspect-[4/3]` for the photo area. In the hero widget, the two cards sit side-by-side in a `flex gap-3` container that spans the full content width (same layout as the Rank tab). Each card will be approximately **45-48% of screen width** with the 4:3 aspect ratio photo, making them ~160-170px tall on a 390px device. This is NOT a horizontal scroll thumbnail — they are the same large tappable cards from the Rank page.

No changes to `RankingCard` itself. The hero container will use:
```text
<div className="relative flex gap-3 items-start">
  <RankingCard ... position="left" />
  <VS badge />
  <RankingCard ... position="right" />
</div>
```

Identical structure to the Rank tab's line 710.

### 3. Auto-Advance Timing — No Spinner

The flow after a tap:

```text
0ms    User taps card
       → navigator.vibrate(10) haptic
       → setSelectedWinner(id) triggers win/lose animations on cards
       → ELO update fires async (non-blocking)

400ms  Animation completes
       → Next pair is already computed (selectSmartPairUtil runs synchronously
         against local state — no network call needed for pair selection)
       → setPairKey(k+1) + setShowPair(nextPair) + setSelectedWinner(null)
       → Cards slide in with existing animate-slide-in-left/right

Total: ~400ms animation + instant swap. Zero spinners.
```

The key insight: `selectSmartPairUtil` is a pure function that runs against in-memory arrays. The ELO upsert to the database happens fire-and-forget (optimistic update to local state first). The next pair is derived from the updated local state synchronously, so there is no loading gap.

The only loading state is the initial mount fetch (shows + rankings + comparisons), which uses a skeleton/loader. After that, all transitions are instant.

### Summary of Confirmed Specs

| Detail | Spec |
|--------|------|
| VS badge size | 48px circle |
| VS badge glow | `box-shadow: 0 0 20px rgba(0,217,255,0.4)` |
| VS badge bg | Cyan-to-purple gradient |
| VS badge entrance | Framer-motion spring scale |
| Card component | Existing `RankingCard`, unchanged |
| Card layout | `flex gap-3`, each `flex-1`, ~45% width |
| Card photo aspect | `aspect-[4/3]` (existing) |
| Tap feedback | `navigator.vibrate(10)` + win/lose animations |
| Auto-advance delay | 400ms (animation), then instant swap |
| Next pair computation | Synchronous (no network, no spinner) |
| DB write | Async fire-and-forget, optimistic local update |

All three concerns are addressed. Ready to build on your go.

