

# Stacked Memory Cards - "Rolodex" Show Feed

## Overview

Replace the current vertical card list with a **stacked, overlapping card interface** where shows layer on top of each other like a deck of cards. Each card shows a "peek" header (artist name only) until scrolled into focus, when it expands to reveal the full photo and metadata.

---

## Visual Design

```text
┌─────────────────────────────────────────────┐
│  Stat Pills + Dynamic Insight               │
├─────────────────────────────────────────────┤
│                                             │
│  Recent Shows                               │
│                                             │
│  ┌─────────────────────────────────────┐    │
│  │  ░░░░░░░░░░░░ Collapsed Card ░░░░░░░│◄── Peek header only
│  │  Tyler, the Creator                 │    (~60px visible)
│  ├─────────────────────────────────────┤    │
│  │  ░░░░░░░░░░░░ Collapsed Card ░░░░░░░│    │
│  │  Kendrick Lamar                     │    │
│  ├═════════════════════════════════════┤    │
│  │                                     │    │
│  │    ╔════════════════════════════╗   │◄── FOCUSED CARD
│  │    ║                            ║   │    (Full photo + overlay)
│  │    ║      [    PHOTO    ]       ║   │    
│  │    ║                            ║   │    
│  │    ║  ┌──────────────────────┐  ║   │    
│  │    ║  │ 9.2  Fred Again..    │  ║   │    
│  │    ║  │ Red Rocks · Dec 15   │  ║   │    
│  │    ║  └──────────────────────┘  ║   │    
│  │    ║               Scene ✦     ║   │    
│  │    ╚════════════════════════════╝   │    
│  │                                     │    
│  ├─────────────────────────────────────┤    
│  │  Bon Iver                           │◄── Next card peeking
│  └─────────────────────────────────────┘    
│                                             │
└─────────────────────────────────────────────┘
```

---

## Card States

### Collapsed State (Peek Header)

```text
┌─────────────────────────────────────────┐
│  ▓▓▓▓▓  Gradient bar  ▓▓▓▓▓             │  ← 4px colored bar 
│  Fred Again..                    #3     │  ← Artist + rank badge
└─────────────────────────────────────────┘
     │                                │
     └── Height: ~60px ───────────────┘
```

- **Top gradient bar**: Score-based color (green for 9+, gold for 7+, etc.)
- **Artist name**: Bold, truncated to single line
- **Rank badge**: Small pill on the right
- **Overlap**: Cards stack with ~20px visible between them

### Expanded State (Focused)

```text
┌─────────────────────────────────────────┐
│                                         │
│  ╭───────────────────────────────────╮  │
│  │                                   │  │
│  │         [ SHOW PHOTO ]            │  │  ← 16:9 or native ratio
│  │                                   │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ 9.2   Fred Again..          │  │  │  ← Floating overlay
│  │  │       Red Rocks Amphitheatre│  │  │     (like share image)
│  │  │       Dec 15, 2025          │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                        Scene ✦    │  │  ← Glow logo
│  ╰───────────────────────────────────╯  │
│                                         │
│   [ Share ]                    [ View ] │  ← Action buttons
│                                         │
└─────────────────────────────────────────┘
         │                          │
         └── Height: ~350-400px ────┘
```

### No-Photo Fallback

When a show has no photo, the expanded card uses a **gradient background** based on score:

```text
┌─────────────────────────────────────────┐
│  ╭───────────────────────────────────╮  │
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │
│  │ ▓▓▓▓▓  SCORE GRADIENT  ▓▓▓▓▓▓▓▓▓▓ │  │  ← Uses getScoreGradient()
│  │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │  │
│  │  ┌─────────────────────────────┐  │  │
│  │  │ 7.5   Bon Iver              │  │  │
│  │  │       The Anthem            │  │  │
│  │  │       Nov 22, 2025          │  │  │
│  │  └─────────────────────────────┘  │  │
│  │                        Scene ✦    │  │
│  ╰───────────────────────────────────╯  │
└─────────────────────────────────────────┘
```

---

## Interaction Model

| Gesture | Action |
|---------|--------|
| Scroll | Cards snap into focus position |
| Tap collapsed card | Scrolls that card into focus |
| Tap expanded card | Opens ShowReviewSheet for full details |
| Tap Share button | Opens PhotoOverlayEditor (if photo) or ShareShowSheet |
| Swipe horizontally | Could trigger quick-share (future enhancement) |

---

## Technical Implementation

### 1. New Component: `StackedShowCard.tsx`

```tsx
interface StackedShowCardProps {
  show: Show;
  rankInfo: RankInfo;
  isExpanded: boolean;
  onExpand: () => void;
  onTap: () => void;
  onShare: () => void;
}
```

**Collapsed state renders:**
- Gradient top bar (4px, score-colored)
- Artist name (single line, bold)
- Rank badge (right side)

**Expanded state renders:**
- Full photo with rounded corners
- Floating overlay (score, artist, venue, date)
- "Scene" watermark with glow effect
- Action buttons (Share, View)

### 2. New Component: `StackedShowList.tsx`

**Scroll container with snap behavior:**

```tsx
<div 
  className="overflow-y-auto snap-y snap-mandatory"
  style={{ scrollSnapType: "y mandatory" }}
>
  {shows.map((show, index) => (
    <div 
      key={show.id}
      className="snap-center"
      style={{ 
        marginTop: index === 0 ? 0 : "-40px", // Overlap
        zIndex: shows.length - index 
      }}
    >
      <StackedShowCard ... />
    </div>
  ))}
</div>
```

**Intersection Observer** to detect which card is in the viewport center:

```tsx
const observerRef = useRef<IntersectionObserver | null>(null);

useEffect(() => {
  observerRef.current = new IntersectionObserver(
    (entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && entry.intersectionRatio > 0.5) {
          setExpandedId(entry.target.dataset.showId);
        }
      });
    },
    { threshold: 0.5, rootMargin: "-40% 0px -40% 0px" }
  );
  // ... attach to card refs
}, []);
```

### 3. Update `Home.tsx`

Replace the current RecentShowCard map with the new StackedShowList:

```tsx
// Before
{recentShows.map((show) => (
  <RecentShowCard key={show.id} ... />
))}

// After
<StackedShowList 
  shows={recentShows}
  rankings={rankings}
  onShowTap={(show) => { setReviewShow(show); setReviewSheetOpen(true); }}
  onShowShare={handleShareFromCard}
/>
```

### 4. CSS Additions (index.css or tailwind.config.ts)

Add smooth expansion animation:

```css
.card-expand {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.card-collapsed {
  height: 60px;
  overflow: hidden;
}

.card-expanded {
  height: auto;
  min-height: 350px;
}
```

---

## Files to Create/Modify

| File | Action | Description |
|------|--------|-------------|
| `src/components/home/StackedShowCard.tsx` | **Create** | Individual card with collapsed/expanded states |
| `src/components/home/StackedShowList.tsx` | **Create** | Scroll container with snap + intersection observer |
| `src/components/Home.tsx` | **Modify** | Replace RecentShowCard usage with StackedShowList |
| `src/lib/utils.ts` | **Modify** | Add solid gradient helper for no-photo fallback |
| `src/index.css` | **Modify** | Add card expansion keyframes |
| `src/components/home/RecentShowCard.tsx` | **Delete** | No longer needed (replaced by StackedShowCard) |

---

## Edge Cases

| Scenario | Handling |
|----------|----------|
| 0 shows | Show empty state with CTA to add first show |
| 1 show | Single expanded card, no stacking |
| No photo | Use score-based gradient background |
| Long artist name | Truncate with ellipsis in collapsed state |
| Multiple artists | Show headliner only in collapsed, full list in expanded |

---

## Performance Considerations

- **Lazy load photos**: Only load images for cards near viewport
- **Virtualization**: For users with 100+ shows, consider virtualizing the list
- **Reduce repaints**: Use `will-change: transform` on cards during scroll

