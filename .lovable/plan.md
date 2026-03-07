

# Empty State Dashboard Improvements

Two empty-state sections get the "blurred preview behind glassmorphism CTA" treatment. No animation on the overlays — they render immediately.

---

## 1. VS Hero Widget empty state (< 2 shows)

**File:** `src/components/home/VSHeroWidget.tsx` (lines 58-78)

Replace the current plain card with a layered design:

- **Background layer**: A blurred (`blur-[6px]`, `opacity-40`, `pointer-events-none`) mock of the actual VS matchup UI — two side-by-side cards using existing sample images (`/images/fred-again-msg.webp` and `/images/odesza-red-rocks.png`) with fake artist names, the centered VS badge with cyan-to-purple gradient, and "Which was better?" subtitle. This mirrors what the real `VSHeroWidget` renders when populated.
- **Foreground overlay**: A glassmorphism card (`bg-white/[0.04]`, `backdrop-blur-md`, `border border-white/[0.08]`) centered over the blurred content with:
  - Trophy icon in a glowing circle (reuse existing pattern from StatsTrophyCard empty state)
  - "Start Ranking" heading
  - "Log 2 shows to start comparing your concerts head-to-head." subtext
  - "Add a show" CTA button (same styling as current)

## 2. Welcome cold-start section

**File:** `src/components/home/SceneView.tsx` (lines 280-304)

Replace the current plain "Welcome to Scene" card with a layered design:

- **Background layer**: A blurred (`blur-[6px]`, `opacity-40`, `pointer-events-none`) mock of the populated feed — a fake `WhatsNextStrip`-style layout showing:
  - A section label "What's Next"
  - 2-3 horizontal event card placeholders using existing sample images (`/images/rufus-du-sol-red-rocks.webp`, `/images/jamie-xx-printworks.webp`) with fake venue names and dates
  - A "Friends Going" row with 3 avatar circles from `/images/waitlist-*.png`
- **Foreground overlay**: Glassmorphism card with:
  - "Welcome to Scene ✦" heading
  - "Start by planning a show or finding friends who share your taste." subtext
  - Same two CTA buttons (Plan your first show / Find friends) with existing styling

---

## Summary

| File | Change |
|------|--------|
| `VSHeroWidget.tsx` | Replace plain empty state with blurred VS mockup + glass overlay |
| `SceneView.tsx` | Replace plain welcome card with blurred feed mockup + glass overlay |

Both use existing `/public/images/` assets — no new files needed. Hybrid approach: real artist images with fake stat labels.

