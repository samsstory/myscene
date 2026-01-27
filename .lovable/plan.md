

# Vertical Stacked Overlay Layout

## Overview

Redesign the overlay card from a wide horizontal layout (280px fixed width) to a compact vertical stack that harmonizes with the tall 9:16 Instagram Story format.

---

## Visual Comparison

```text
CURRENT (Horizontal):                    NEW (Vertical Stack):
+------------------------+               +------------+
| Artist Name      4.5   |               |    4.5     |  <- Large score
| 📍 Venue Name          |               | Artist Name|  <- Centered
| January 15, 2025       |               | 📍 Venue   |
| [==Progress Bars===]   |               |   Date     |
| "Notes quote..."       |               |  [Bars]    |
| #3 of 47    SCENE      |               |  "Notes"   |
+------------------------+               | #3   SCENE |
                                         +------------+
```

---

## Design Principles

1. **Centered alignment** - All text centered for a portrait-friendly look
2. **Score prominence** - Large rating at top as the visual anchor
3. **Narrower width** - Reduce from 280px to ~180px to fit comfortably on narrow images
4. **Stacked elements** - Artist, venue, date flow vertically instead of side-by-side
5. **Compact progress bars** - Shorter width with category initials instead of full labels

---

## Technical Changes

### File: `src/components/PhotoOverlayEditor.tsx`

#### 1. Overlay Container (lines ~774-787)

**Current:**
```tsx
<div
  id="rating-overlay"
  className="... rounded-3xl p-6 ..."
  style={{
    width: 280,
    ...
  }}
>
```

**New:**
```tsx
<div
  id="rating-overlay"
  className="... rounded-2xl p-4 text-center ..."
  style={{
    width: 160,  // Narrower for vertical layout
    ...
  }}
>
```

#### 2. Score and Artist Section (lines ~788-811)

**Current:** Side-by-side with flexbox `justify-between`
```tsx
<div className="flex items-start justify-between gap-4 mb-2">
  <h2 className="text-2xl ...">Artist Name</h2>
  <div className="text-4xl ...">4.5</div>
</div>
```

**New:** Stacked vertically, score on top
```tsx
{/* Large score at top - the visual anchor */}
{overlayConfig.showRating && (
  <div className="text-5xl font-black ... mb-2">
    {score.toFixed(1)}
  </div>
)}

{/* Artist name below score */}
{overlayConfig.showArtists && (
  <h2 className="text-lg font-bold mb-1">
    {headliners.map(a => a.name).join(", ")}
  </h2>
)}
```

#### 3. Venue and Date (lines ~813-834)

**Current:** Left-aligned with icons
```tsx
<p className="text-lg mb-1 flex items-center gap-2">
  <MapPin /> {venue}
</p>
<p className="text-sm opacity-90 mb-3">{date}</p>
```

**New:** Centered, compact
```tsx
{overlayConfig.showVenue && (
  <p className="text-sm mb-0.5 flex items-center justify-center gap-1">
    <MapPin className="h-3 w-3" />
    {show.venue_name}
  </p>
)}

{overlayConfig.showDate && (
  <p className="text-xs opacity-80 mb-2">{formattedDate}</p>
)}
```

#### 4. Detailed Ratings (lines ~836-896)

**Current:** Full labels ("Performance", "Sound", etc.) with long progress bars
```tsx
<span className="w-20">Performance</span>
<div className="flex-1 h-1.5 ...">
```

**New:** Single-letter initials with compact bars
```tsx
<div className="grid grid-cols-5 gap-1 text-[10px]">
  {/* P - Performance */}
  <div className="flex flex-col items-center">
    <span className="opacity-60">P</span>
    <div className="w-full h-1 bg-white/20 rounded-full">
      <div className="h-full bg-white" style={{ width: `${pct}%` }} />
    </div>
  </div>
  {/* S - Sound, L - Lighting, C - Crowd, V - Vibe */}
</div>
```

#### 5. Notes Section (lines ~899-906)

**Current:** Left-aligned italic text
**New:** Centered, smaller text
```tsx
{overlayConfig.showNotes && show.notes && (
  <p className="text-xs italic opacity-80 line-clamp-2 mb-2">
    "{show.notes}"
  </p>
)}
```

#### 6. Footer with Rank and Logo (lines ~908-926)

**Current:** Space-between layout
**New:** Stacked or side-by-side centered
```tsx
<div className="mt-2 flex items-center justify-between text-[10px]">
  {overlayConfig.showRank && rankData.total > 0 && (
    <span className="font-semibold ...">#{position}</span>
  )}
  <span className="font-bold tracking-wider opacity-30">SCENE</span>
</div>
```

---

## Summary of Style Changes

| Element | Current | New |
|---------|---------|-----|
| Container width | 280px | 160px |
| Padding | p-6 | p-4 |
| Border radius | rounded-3xl | rounded-2xl |
| Text alignment | Left | Center |
| Score position | Top-right, inline | Top, standalone |
| Score size | text-4xl | text-5xl |
| Artist size | text-2xl | text-lg |
| Venue/Date | Stacked left | Centered compact |
| Rating bars | Horizontal with labels | Grid with initials |

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/PhotoOverlayEditor.tsx` | Restructure overlay from horizontal to vertical stacked layout |

