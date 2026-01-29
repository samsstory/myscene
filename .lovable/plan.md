
# Show Ranker UI/UX Enhancement Plan

## Overview
Transform the Show Ranker experience with polished animations, haptic feedback, and brand-consistent visual design that matches the website mockup aesthetic.

---

## Features to Implement

### 1. Card Entry Animation (Slide-in from sides)
Cards will enter with a staggered animation - left card slides in from left, right card slides in from right.

**Changes:**
- Add new keyframes to `tailwind.config.ts`:
  - `slide-in-left`: Cards enter from -100% translateX
  - `slide-in-right`: Cards enter from +100% translateX
- Add `pairKey` state in `Rank.tsx` to trigger re-animation when pairs change
- Pass `position` prop ("left" | "right") to `RankingCard`
- Apply animation classes with staggered delays (left: 0ms, right: 150ms)

---

### 2. Winner Selection Animation + Haptic Feedback
When a card is tapped, it will flash with a cyan glow, scale up slightly, then the pair transitions out.

**Changes:**
- Add new state `selectedWinner` in `Rank.tsx` to track which card was selected
- Create a "winner pulse" animation with:
  - Brief scale-up to 1.05
  - Cyan glow border/shadow effect
  - 400ms duration before transitioning to next pair
- Add haptic feedback using `navigator.vibrate(50)` on supported devices
- Loser card fades out slightly during winner animation

---

### 3. Completion Celebration (Confetti)
When rankings stabilize (progress reaches 100%), trigger a confetti celebration.

**Changes:**
- Install `canvas-confetti` package (lightweight, no dependencies)
- Create `useConfetti` hook or inline the celebration logic
- Trigger confetti burst when `showPair` becomes `null` and progress was previously < 100%
- Configure confetti with brand colors (cyan, coral, gold particles)

---

### 4. Header Hierarchy with Brand Glow
Apply SceneLogo-style luminous treatment to the "Show Ranker" headline for brand consistency.

**Changes:**
- Update header in `Rank.tsx` with:
  - Increase tracking to match logo style (tracking-[0.15em])
  - Add textShadow with white glow: `0 0 8px rgba(255,255,255,0.4)`
  - Uppercase styling for consistency

---

### 5. Enhanced Photo Fallback
Replace the simple gradient placeholder with a proper mesh gradient + Scene star logo.

**Changes:**
- Update `RankingCard.tsx` photo fallback section:
  - Add radial mesh gradients (cyan top-left, coral bottom-right at 15-20% opacity)
  - Add 3% opacity noise texture overlay using inline SVG
  - Increase star size and add luminous glow effect matching SceneLogo style
  - Add subtle pulse-glow animation to the fallback

---

## Technical Implementation Details

### New Tailwind Keyframes
```text
slide-in-left: { from: { opacity: 0, transform: translateX(-100%) }, to: { opacity: 1, transform: translateX(0) } }
slide-in-right: { from: { opacity: 0, transform: translateX(100%) }, to: { opacity: 1, transform: translateX(0) } }
winner-pulse: { 0%: { transform: scale(1) }, 50%: { transform: scale(1.05) }, 100%: { transform: scale(1) } }
fade-scale-out: { from: { opacity: 1, transform: scale(1) }, to: { opacity: 0, transform: scale(0.95) } }
```

### Files to Modify
| File | Changes |
|------|---------|
| `tailwind.config.ts` | Add slide-in-left, slide-in-right, winner-pulse, fade-scale-out keyframes and animations |
| `src/index.css` | Add winner-glow utility class with box-shadow |
| `src/components/Rank.tsx` | Add selectedWinner state, pairKey for re-animation, haptic feedback, confetti trigger |
| `src/components/rankings/RankingCard.tsx` | Add position prop, slide-in animation, winner state, enhanced fallback |
| `package.json` | Add canvas-confetti dependency |

### Animation Timeline (per comparison)
```text
1. [0ms]     Cards slide in from sides (300ms duration, staggered 150ms)
2. [450ms]   User can interact
3. [tap]     Winner card: scale + glow pulse (400ms)
             Loser card: slight fade + shrink
             Haptic vibration (50ms)
4. [400ms after tap] Both cards slide out, new pair slides in
```

---

## Summary
This plan delivers a polished, game-like ranking experience with:
- Engaging card entry animations that draw attention
- Satisfying winner feedback with visual + haptic confirmation
- Celebration moment when rankings complete
- Consistent brand styling throughout
- Premium photo fallback matching the app aesthetic
