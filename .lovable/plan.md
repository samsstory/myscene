
# Plan: Equalizer-Style Rating Visualization

## Overview

Replace the current cryptic single-letter labels (P, S, L, C, V) with horizontal progress bars with an intuitive **equalizer visualization** using icons + continuous vertical bars. Each rating category will have an icon above 5 stacked segments, where filled segments appear as one continuous bar (no gaps) with empty space above.

## Current State

The detailed ratings currently display as:
```
P     S     L     C     V
[==] [===] [==] [=] [====]
```
- Single letters are cryptic and hard to decode
- Horizontal progress bars don't communicate "how good" visually
- No immediate visual hierarchy

## Proposed Design

```text
🎤    🔊    💡    👥    ✨
█     █     █     ▁     █
█     █     █     ▁     █
█     █     ▁     ▁     █
▁     █     ▁     ▁     █
▁     █     ▁     ▁     █
─────────────────────────
3/5   5/5   2/5   1/5   5/5
```

**Key Design Elements:**
1. **Icons above each bar**: Descriptive emojis (🎤 Performance, 🔊 Sound, 💡 Lighting, 👥 Crowd, ✨ Vibe)
2. **5 vertical segments per bar**: Each segment represents 1 point
3. **Continuous fill from bottom**: A rating of 3 fills segments 1-3 as one solid block
4. **Empty segments above**: Remaining 2 segments show as muted/transparent
5. **Monochrome styling**: White filled, white/20 empty - works on any background

## Implementation Details

### DOM Rendering (Screen Preview)

**Location:** Lines 848-895 in `src/components/PhotoOverlayEditor.tsx`

Replace the current grid with a new equalizer component:

```typescript
{overlayConfig.showDetailedRatings && (show.artist_performance || show.sound || show.lighting || show.crowd || show.venue_vibe) && (
  <div 
    className="flex justify-center gap-2 mb-2 cursor-pointer transition-opacity hover:opacity-70"
    onClick={(e) => { e.stopPropagation(); toggleConfig("showDetailedRatings"); }}
  >
    {[
      { icon: "🎤", value: show.artist_performance },
      { icon: "🔊", value: show.sound },
      { icon: "💡", value: show.lighting },
      { icon: "👥", value: show.crowd },
      { icon: "✨", value: show.venue_vibe },
    ].filter(r => r.value).map((rating, idx) => (
      <div key={idx} className="flex flex-col items-center gap-0.5">
        {/* Icon label */}
        <span className="text-[10px]">{rating.icon}</span>
        {/* Equalizer bar - 5 segments, bottom-up fill, NO GAPS */}
        <div className="flex flex-col-reverse w-3 h-10">
          {/* Filled portion - continuous block */}
          <div 
            className="w-full bg-white rounded-sm"
            style={{ height: `${(rating.value! / 5) * 100}%` }}
          />
          {/* Empty portion above - muted */}
          <div 
            className="w-full bg-white/20 rounded-sm"
            style={{ height: `${((5 - rating.value!) / 5) * 100}%` }}
          />
        </div>
      </div>
    ))}
  </div>
)}
```

**Visual Result:**
- Icons clearly indicate what each bar represents
- Filled portion is ONE continuous element (no segment gaps)
- Empty portion sits above as a muted block
- Tall bars = high ratings, immediately communicative

### Canvas Rendering (Export)

**Location:** Lines 424-464 in `src/components/PhotoOverlayEditor.tsx`

Update the canvas drawing to match the DOM visualization:

```typescript
// Detailed ratings - Equalizer style with icons
if (overlayConfig.showDetailedRatings && (show.artist_performance || show.sound || show.lighting || show.crowd || show.venue_vibe)) {
  const ratings = [
    { icon: "🎤", value: show.artist_performance },
    { icon: "🔊", value: show.sound },
    { icon: "💡", value: show.lighting },
    { icon: "👥", value: show.crowd },
    { icon: "✨", value: show.venue_vibe },
  ].filter((r) => r.value);

  const barWidth = 10 * scaleX;
  const barHeight = 40 * scaleY;
  const gap = 8 * scaleX;
  const totalWidth = ratings.length * barWidth + (ratings.length - 1) * gap;
  const startX = centerX - totalWidth / 2;

  // Draw each bar
  ratings.forEach((rating, index) => {
    const barX = startX + index * (barWidth + gap);
    
    // Icon above bar
    ctx.font = `${10 * overlayScale * scaleX}px system-ui`;
    ctx.fillStyle = "white";
    ctx.fillText(rating.icon, barX + barWidth / 2, yPos);
    
    const barTop = yPos + 4 * scaleY;
    const fillHeight = (rating.value! / 5) * barHeight;
    const emptyHeight = barHeight - fillHeight;
    
    // Empty portion (top) - muted
    if (emptyHeight > 0) {
      ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
      ctx.beginPath();
      ctx.roundRect(barX, barTop, barWidth, emptyHeight, 2 * scaleX);
      ctx.fill();
    }
    
    // Filled portion (bottom) - solid white, NO GAPS
    ctx.fillStyle = "rgba(255, 255, 255, 1)";
    ctx.beginPath();
    ctx.roundRect(barX, barTop + emptyHeight, barWidth, fillHeight, 2 * scaleX);
    ctx.fill();
  });
  
  yPos += 48 * scaleY;
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/PhotoOverlayEditor.tsx` | Update DOM rendering (lines ~848-895) and canvas drawing (lines ~424-464) |

## Visual Comparison

### Before (Current)
```
P     S     L     C     V
[==] [===] [==] [=] [====]
```
- Cryptic letters
- Horizontal bars don't communicate quality hierarchy

### After (Equalizer)
```
🎤    🔊    💡    👥    ✨
┃     ┃     ┃           ┃
┃     ┃     ┃           ┃
┃     ┃           ░     ┃
░     ┃     ░     ░     ┃
░     ┃     ░     ░     ┃
```
- Icons are self-explanatory
- Taller = better (intuitive)
- No gaps in filled sections - clean, continuous bars
- Empty space above shows room for improvement

## Edge Cases

1. **Single rating only**: Bar still displays with icon, centered
2. **All ratings maxed (5/5)**: Full bars, no empty space above
3. **All ratings low (1/5)**: Minimal fill, large empty space above
4. **Mixed ratings**: Visual hierarchy immediately apparent

## Technical Notes

- Bars use `flex-col-reverse` in DOM to stack bottom-up
- Canvas draws empty portion first (top), then filled portion (bottom)
- Both DOM and canvas use rounded corners (2px) for softness
- Width per bar: 12px in DOM, scaled appropriately for canvas export
- Height per bar: 40px total (8px per segment conceptually, but rendered as continuous)
