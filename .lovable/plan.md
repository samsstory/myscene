

# Add Direct Instagram Share to Feed Cards

## Overview

Add a prominent Instagram share button directly on each RecentShowCard in the feed, bypassing the intermediate ShareShowSheet for maximum conversion. Shows with photos go straight to the PhotoOverlayEditor; shows without photos open a quick text-based share generator.

---

## Strategic Decision: ALL Shows Get Share Button

| Scenario | Icon Style | Tap Behavior |
|----------|------------|--------------|
| **Has photo** | Vibrant gradient Instagram icon | Opens PhotoOverlayEditor directly (1 tap) |
| **No photo** | Muted Instagram icon | Opens ShareShowSheet with text-only share (existing flow) |

**Rationale**: Even shows without photos have a beautiful text-based share image (already built). Not blocking sharing drives more virality and subtly encourages photo uploads.

---

## Visual Layout

```text
CURRENT FEED CARD:
+------------------------------------------+
|  [📷]  Artist Name                       |
|        📍 Venue               [#3 of 47] |
|        📅 Jan 15                         |
+------------------------------------------+
            ^ Card tap → Review Sheet

PROPOSED FEED CARD:
+------------------------------------------+
|  [📷]  Artist Name            [📸]       |  <- Instagram icon
|        📍 Venue               [#3 of 47] |
|        📅 Jan 15                         |
+------------------------------------------+
            ^ Card tap → Review Sheet
                                ^ Share tap → Editor/Sheet
```

---

## Component Changes

### 1. RecentShowCard.tsx

**Add new prop and Instagram button:**

```tsx
interface RecentShowCardProps {
  show: Show;
  rankInfo: RankInfo;
  onTap: (show: Show) => void;
  onShare: (show: Show) => void;  // NEW
}
```

**Update layout to include share icon:**

```tsx
<div className="flex gap-4">
  {/* Photo thumbnail */}
  <div className="w-20 h-20 ...">
    ...
  </div>

  {/* Info */}
  <div className="flex-1 min-w-0 flex flex-col justify-center">
    ...
  </div>

  {/* Actions column - right side */}
  <div className="flex-shrink-0 flex flex-col items-center justify-between py-1">
    {/* Instagram share button */}
    <button
      onClick={(e) => {
        e.stopPropagation();
        onShare(show);
      }}
      className={cn(
        "p-1.5 rounded-full transition-all",
        show.photo_url 
          ? "text-pink-500 hover:bg-pink-500/10" 
          : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
      )}
    >
      <Instagram className="h-5 w-5" />
    </button>
    
    {/* Rank badge */}
    <ShowRankBadge ... />
  </div>
</div>
```

### 2. Home.tsx

**Add state for direct editor access:**

```tsx
const [directEditShow, setDirectEditShow] = useState<Show | null>(null);
const [directEditOpen, setDirectEditOpen] = useState(false);
```

**Add share handler with smart routing:**

```tsx
const handleShareFromCard = (show: Show) => {
  if (show.photo_url) {
    // Has photo → Direct to PhotoOverlayEditor
    setDirectEditShow(show);
    setDirectEditOpen(true);
  } else {
    // No photo → ShareShowSheet (text-based share)
    setShareShow(show);
    setShareSheetOpen(true);
  }
};
```

**Update RecentShowCard usage:**

```tsx
<RecentShowCard
  key={show.id}
  show={show}
  rankInfo={getShowRankInfo(show.id)}
  onTap={(s) => {
    setReviewShow(s);
    setReviewSheetOpen(true);
  }}
  onShare={handleShareFromCard}  // NEW
/>
```

**Add Direct PhotoOverlayEditor Sheet:**

```tsx
{/* Direct Photo Overlay Editor for feed cards */}
<Sheet open={directEditOpen} onOpenChange={setDirectEditOpen}>
  <SheetContent side="bottom" className="h-[90vh] overflow-hidden flex flex-col">
    <SheetHeader className="flex-shrink-0">
      <SheetTitle>Share to Instagram</SheetTitle>
    </SheetHeader>
    <div className="flex-1 overflow-y-auto mt-4">
      {directEditShow && directEditShow.photo_url && (
        <PhotoOverlayEditor
          show={normalizeShowForEditor(directEditShow)}
          onClose={() => setDirectEditOpen(false)}
          allShows={shows.map(normalizeShowForEditor)}
          rankings={rankings}
        />
      )}
    </div>
  </SheetContent>
</Sheet>
```

**Add normalizer function (reused from ShareShowSheet):**

```tsx
const normalizeShowForEditor = (show: Show) => ({
  ...show,
  artists: show.artists.map(a => ({
    ...a,
    is_headliner: a.isHeadliner ?? false,
  })),
  venue_name: show.venue?.name || "",
  show_date: show.date || "",
  artist_performance: show.artistPerformance,
  venue_vibe: show.venueVibe,
});
```

---

## User Flow Comparison

```text
BEFORE (5+ taps):
Card → Review Sheet → Share button → ShareShowSheet → Edit Photo → Editor

AFTER (1 tap with photo):
Card → [📸 Icon] → Editor directly

AFTER (2 taps without photo):
Card → [📸 Icon] → ShareShowSheet → Download/Copy
```

---

## File Changes Summary

| File | Change |
|------|--------|
| `src/components/home/RecentShowCard.tsx` | Add `onShare` prop, Instagram icon button with conditional styling |
| `src/components/Home.tsx` | Add direct editor state, smart share handler, PhotoOverlayEditor sheet |

---

## Visual Polish

### Instagram Icon States

**With Photo (encourages sharing):**
```tsx
className="text-pink-500 hover:bg-pink-500/10 hover:scale-110"
```

**Without Photo (available but muted):**
```tsx
className="text-muted-foreground/50 hover:text-muted-foreground"
```

### Optional: Pulse animation for new shows

For shows added in the last 24 hours, add a subtle pulse to draw attention:

```tsx
{isRecentlyAdded && (
  <span className="absolute -top-1 -right-1 w-2 h-2 bg-pink-500 rounded-full animate-pulse" />
)}
```

---

## Edge Cases

| Scenario | Behavior |
|----------|----------|
| Tap card body | Opens Review Sheet (unchanged) |
| Tap Instagram icon | Opens Editor (photo) or ShareSheet (no photo) |
| Very long artist names | Text truncates, icon stays visible |
| Small screens | Icon maintains 44px touch target |

---

## Metrics Impact

| Metric | Expected Change |
|--------|-----------------|
| Share rate | ⬆️ 3-5x (fewer taps) |
| Photo upload rate | ⬆️ (muted icon hints "add photo") |
| Time to share | ⬇️ 80% (5+ taps → 1 tap) |

