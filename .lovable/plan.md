

# ShowReviewSheet Enhancement: Engagement & Context Features

## Overview

Add four new features to increase user engagement and provide richer emotional/contextual information about shows.

| Feature | Purpose | User Value |
|---------|---------|------------|
| "Rank This Show" CTA | Prompt ranking for shows with few comparisons | Solidifies show position, increases engagement |
| Download Image | Alternative share method | Saves overlay image locally for any platform |
| Time Context | "2 years ago" emotional framing | Nostalgia trigger, memory context |
| Venue Map/Link | Quick navigation to venue | Real-world connection, directions |

## Implementation Details

### 1. "Rank This Show" CTA

Display a subtle prompt when a show has fewer than 5 comparisons, encouraging users to rank it.

**Location**: Below the rank display in HeroPhotoSection, or as a dedicated card below the ratings section.

**Logic**:
```typescript
const needsMoreRanking = comparisonsCount < 5 && rankTotal > 1;
```

**UI Design**:
```typescript
{needsMoreRanking && (
  <button
    onClick={onRankThisShow}
    className="mt-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 
               text-amber-400/80 text-xs font-medium hover:bg-amber-500/20 transition-colors
               flex items-center gap-1.5"
  >
    <Scale className="h-3 w-3" />
    Rank this show
  </button>
)}
```

**New Props**:
```typescript
// HeroPhotoSection
onRankThisShow?: () => void;

// ShowReviewSheet
onNavigateToRank?: () => void;  // Callback to switch to Rank tab
```

**Behavior**: Closes the sheet and navigates to the Rank tab (uses existing `onNavigateToRank` pattern from Home.tsx).

### 2. Download Image Button

Add a "Save" button to the secondary actions row that generates and downloads the show card as an image.

**Location**: Secondary actions row (alongside Send, Edit Review, etc.)

**Implementation Pattern**: Reuse canvas generation logic from PhotoOverlayEditor.

**Logic**:
```typescript
const handleDownloadImage = async () => {
  // Generate a simple show card image using canvas
  const canvas = document.createElement('canvas');
  canvas.width = 1080;
  canvas.height = 1920;
  const ctx = canvas.getContext('2d');
  
  if (!ctx) {
    toast({ title: "Download failed", variant: "destructive" });
    return;
  }

  // Draw gradient background
  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Draw show info (artist, venue, date, score)
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 72px system-ui';
  ctx.fillText(headliner?.name || '', 100, 800);
  // ... additional text rendering

  // Download
  canvas.toBlob((blob) => {
    if (blob) {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${headliner?.name}-${show.venue.name}.png`;
      a.click();
      URL.revokeObjectURL(url);
      toast({ title: "Image saved" });
    }
  }, 'image/png');
};
```

**Simpler Alternative**: If photo exists, just download that photo. If no photo, open the PhotoOverlayEditor with a fallback template.

**UI**:
```typescript
<Button
  variant="ghost"
  size="sm"
  onClick={handleDownloadImage}
  className="text-white/50 hover:text-white hover:bg-white/10"
>
  <Download className="h-4 w-4 mr-2" />
  Save
</Button>
```

### 3. Time Context ("2 years ago")

Display relative time alongside the formatted date for emotional context.

**Location**: HeroPhotoSection metadata bar, after the formatted date.

**Implementation**: Use date-fns `formatDistanceToNow`.

**Code**:
```typescript
import { formatDistanceToNow, parseISO } from "date-fns";

// In HeroPhotoSection
const formattedDate = format(parseISO(date), "MMM d, yyyy");
const timeAgo = formatDistanceToNow(parseISO(date), { addSuffix: true });
```

**UI Update** (line 91-92 in HeroPhotoSection):
```typescript
<p className="text-white/60 text-sm mt-1 truncate">
  {venue.name} · {formattedDate}
</p>
<p className="text-white/40 text-xs">
  {timeAgo}
</p>
```

Or inline:
```typescript
<p className="text-white/60 text-sm mt-1 truncate">
  {venue.name} · {formattedDate} <span className="text-white/40">({timeAgo})</span>
</p>
```

### 4. Venue Map/Link

Make the venue name tappable to open in maps or navigate to the Globe view.

**Options**:
1. **Open in Google Maps** (external link) - Universal, works for directions
2. **Navigate to Globe view** (in-app) - Shows venue on the app's map

**Recommended**: Offer both via a small dropdown or long-press, with tap defaulting to Google Maps.

**Implementation**:

**New Props**:
```typescript
// HeroPhotoSection
onVenueTap?: () => void;  // Navigate to Globe view focused on venue

// ShowReviewSheet  
onNavigateToGlobe?: (venueId: string | null, venueName: string) => void;
```

**Google Maps URL**:
```typescript
const openInMaps = () => {
  const query = encodeURIComponent(`${venue.name}, ${venue.location}`);
  window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
};
```

**UI** (venue name becomes tappable):
```typescript
<button 
  onClick={openInMaps}
  className="text-white/60 text-sm mt-1 truncate hover:text-white/80 transition-colors flex items-center gap-1"
>
  <MapPin className="h-3 w-3" />
  {venue.name}
</button>
<span className="text-white/60 text-sm"> · {formattedDate}</span>
```

Alternative with in-app navigation:
```typescript
<button 
  onClick={onVenueTap}
  className="text-cyan-400/70 text-sm hover:text-cyan-400 transition-colors underline decoration-dotted"
>
  {venue.name}
</button>
```

## Updated Visual Layout

```text
┌─────────────────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────────────────┐  │
│  │              HERO PHOTO                               │  │
│  │                                                       │  │
│  │   ┌─────────────────────────────────────────────────┐ │  │
│  │   │  ARTIST NAME                           9.2      │ │  │
│  │   │  with Supporting Artist                         │ │  │
│  │   │  📍 Venue Name · Jan 15, 2023                   │ │  │  ← Venue tappable
│  │   │  2 years ago                                    │ │  │  ← Time context
│  │   │  #3 All Time · 8 comparisons                    │ │  │
│  │   │  [🎚️ Rank this show]                           │ │  │  ← CTA if <5 comparisons
│  │   └─────────────────────────────────────────────────┘ │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │    [✦ Share to Instagram]                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  [📤 Send]  [💾 Save]  [✏️ Edit]  [📷 Change]  [🗑️]       │  ← Save added
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

## Files to Edit

| File | Changes |
|------|---------|
| `src/components/show-review/HeroPhotoSection.tsx` | Add time context, venue tap handler, rank CTA |
| `src/components/ShowReviewSheet.tsx` | Add Download/Save button, wire up new callbacks |

## New Imports

```typescript
// HeroPhotoSection.tsx
import { formatDistanceToNow, parseISO, format } from "date-fns";
import { MapPin, Scale } from "lucide-react";

// ShowReviewSheet.tsx
import { Download } from "lucide-react";
```

## Props Updates

**HeroPhotoSection**:
```typescript
interface HeroPhotoSectionProps {
  // ... existing
  onVenueTap?: () => void;
  onRankThisShow?: () => void;
}
```

**ShowReviewSheet**:
```typescript
interface ShowReviewSheetProps {
  // ... existing
  onNavigateToRank?: () => void;
}
```

## Technical Notes

1. **Rank CTA Threshold**: Using 5 comparisons as the threshold - enough to indicate the ranking is still unstable but not so low it always shows
2. **Time Context**: `formatDistanceToNow` automatically handles "2 years ago", "3 months ago", "yesterday" etc.
3. **Google Maps**: Universal solution that works on all devices and opens native Maps app on mobile
4. **Download Image**: Simplified approach - if photo exists, generate overlay; if not, create a basic text card

## Summary

These four features transform the ShowReviewSheet from a passive review display into an engagement-driving experience:

- **Rank CTA**: Drives users to the core ranking mechanic
- **Download**: Removes friction for sharing anywhere
- **Time Context**: Emotional resonance with memories
- **Venue Link**: Real-world connection and utility

