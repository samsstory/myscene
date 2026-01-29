
# Bias-Free Ranking Mockup: Hybrid Approach

## Overview
Redesign the RankingSpotlight mockup to eliminate all ranking-related data and create a pure "gut feeling" comparison experience. Users see only their own logged details (photo, artists, venue, date, aspect ratings, and notes) with no ELO scores, comparison counts, or current standings that could bias their decision.

## Design Principles
- **Zero ranking context** - No ELO, no "Current #1", no comparison counts
- **Memory-first** - Surface the user's own ratings and notes to help them remember how the show felt
- **Clean progress indicator** - Simple visual progress without numbers
- **Gut decisions** - The UI encourages instinctive choices based on memory

---

## Changes to RankingSpotlight.tsx

### 1. Header: Minimal Progress Bar
Replace "Power Rankings / 12 comparisons" with a subtle progress bar:

```text
┌─────────────────────────────────────────────┐
│  Rank Your Shows                            │
│  ═══════════════░░░░░░░░  (progress bar)    │
└─────────────────────────────────────────────┘
```

- Title: "Rank Your Shows" (action-oriented, no "Power Rankings" gamification)
- Progress bar: Thin horizontal bar showing visual progress (no numbers)
- Styling: `h-1 bg-white/10` track with `bg-primary` fill

### 2. Cards: Full Memory Context
Expand each VS card to include:

```text
┌─────────────────────────────────────────────┐
│  ┌───────────────────────────────────────┐  │
│  │         [Photo 4:3 ratio]             │  │
│  │                                        │  │
│  └───────────────────────────────────────┘  │
│                                             │
│  Odesza                                     │
│  The Gorge · Aug 2024                       │
│                                             │
│  ┌─ Compact Aspect Ratings ─────────────┐   │
│  │ Show  ████████░░  Great              │   │
│  │ Sound ██████████  Amazing            │   │
│  │ Crowd ██████░░░░  Okay               │   │
│  └──────────────────────────────────────┘   │
│                                             │
│  "Best sunset I've ever seen at a show.     │
│   Crowd energy was incredible."             │
└─────────────────────────────────────────────┘
```

Components per card:
- **Photo**: 4:3 aspect ratio (existing)
- **Artist name**: Headliner in semibold
- **Venue + Date**: Single line with bullet separator
- **Aspect ratings**: Compact mini-bars (using existing gradient logic)
  - Only show ratings that have values
  - Icons removed for space - just label + bar
- **Notes**: Truncated to 2-3 lines, italic styling

### 3. Footer: Remove Entirely
Delete the "Current #1: Fred again.. @ Ally Pally" section completely.

### 4. VS Badge
Keep the existing centered VS badge - it works well.

---

## Detailed Implementation

### File: `src/components/landing/RankingSpotlight.tsx`

**Imports to add:**
```tsx
import { Music, Volume2, Lightbulb, Users, Building2 } from "lucide-react";
```

**New MiniRatingBar component (inline):**
```tsx
const MiniRatingBar = ({ label, value }: { label: string; value: number }) => {
  const gradient = value >= 4 ? "from-emerald-500 to-cyan-400" 
                 : value >= 3 ? "from-amber-500 to-yellow-400"
                 : "from-orange-500 to-amber-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/50 w-10">{label}</span>
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
    </div>
  );
};
```

**Mock data structure for cards:**
```tsx
const leftShow = {
  photo: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&q=80",
  artist: "Odesza",
  venue: "The Gorge",
  date: "Aug 2024",
  ratings: { show: 4, sound: 5, crowd: 3 },
  notes: "Best sunset I've ever seen. The Gorge is magical."
};

const rightShow = {
  photo: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
  artist: "Rufus Du Sol",
  venue: "Red Rocks",
  date: "Jun 2023", 
  ratings: { show: 5, sound: 4, lighting: 5 },
  notes: "Absolutely transcendent. Red Rocks amplified everything."
};
```

**New card rendering:**
```tsx
const renderShowCard = (show: typeof leftShow) => (
  <div className="flex-1 group cursor-pointer">
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-2.5 
                    transition-all group-hover:border-primary/50 group-hover:bg-white/[0.06]">
      {/* Photo */}
      <div 
        className="w-full aspect-[4/3] rounded-lg mb-2"
        style={{
          backgroundImage: `url('${show.photo}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      
      {/* Artist & Venue */}
      <div className="text-white text-xs font-semibold">{show.artist}</div>
      <div className="text-white/50 text-[10px] mb-2">
        {show.venue} · {show.date}
      </div>
      
      {/* Compact Ratings */}
      <div className="space-y-1 mb-2">
        {show.ratings.show && <MiniRatingBar label="Show" value={show.ratings.show} />}
        {show.ratings.sound && <MiniRatingBar label="Sound" value={show.ratings.sound} />}
        {show.ratings.lighting && <MiniRatingBar label="Light" value={show.ratings.lighting} />}
        {show.ratings.crowd && <MiniRatingBar label="Crowd" value={show.ratings.crowd} />}
      </div>
      
      {/* Notes */}
      <p className="text-[9px] text-white/40 italic line-clamp-2 leading-relaxed">
        "{show.notes}"
      </p>
    </div>
  </div>
);
```

**New header with progress bar:**
```tsx
{/* Header - Progress focused */}
<div className="px-4 py-3 space-y-2">
  <span className="text-white/80 text-sm font-medium">Rank Your Shows</span>
  {/* Minimal progress bar - no numbers */}
  <div className="h-1 bg-white/10 rounded-full overflow-hidden">
    <div 
      className="h-full bg-primary rounded-full transition-all"
      style={{ width: "60%" }}
    />
  </div>
</div>
```

---

## Visual Layout Summary

```text
┌─────────────────────────────────────────────────────┐
│  Rank Your Shows                                    │
│  ══════════════════════░░░░░░░░░░  (progress bar)   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ┌─────────────┐          ┌─────────────┐          │
│  │   Photo     │   VS     │   Photo     │          │
│  │             │          │             │          │
│  ├─────────────┤          ├─────────────┤          │
│  │ Odesza      │          │ Rufus Du Sol│          │
│  │ Gorge · '24 │          │ Rocks · '23 │          │
│  │             │          │             │          │
│  │ Show ████░  │          │ Show █████  │          │
│  │ Sound█████  │          │ Sound████░  │          │
│  │ Crowd███░░  │          │ Light█████  │          │
│  │             │          │             │          │
│  │ "Best       │          │ "Absolutely │          │
│  │  sunset..." │          │  transcen..." │         │
│  └─────────────┘          └─────────────┘          │
│                                                     │
│              Tap to choose the winner               │
│                                                     │
├─────────────────────────────────────────────────────┤
│     [Home] [Globe] [Crown*]      [+]               │
└─────────────────────────────────────────────────────┘
```

**Key removals:**
- ~~"Power Rankings"~~ → "Rank Your Shows"
- ~~"12 comparisons"~~ → Visual progress bar only
- ~~"Current #1: Fred again.."~~ → Removed entirely

**Key additions:**
- Compact aspect rating bars on each card
- Truncated notes (user's own words) in italics
- Pure memory-based decision making

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/landing/RankingSpotlight.tsx` | Complete mockup redesign with progress bar header, expanded memory cards with ratings/notes, footer removal |

## Technical Notes
- All data in the mockup is static/hardcoded (this is a landing page showcase)
- The actual `Rank.tsx` component already has the infrastructure for displaying ratings
- This mockup design can inform future updates to the real ranking interface
