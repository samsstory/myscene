

# Fix Photo Overlay Export - Canvas Drawing Mismatch

## Problem Analysis

The exported/saved image looks garbled compared to the in-app preview. Looking at the screenshot, "SCENE" renders as "S#5CstEeaN E" with overlapping text. Three root causes:

1. **`ctx.letterSpacing` is broken**: Line 503 sets `ctx.letterSpacing = \`${0.25 * scaleX}em\`` -- the `letterSpacing` canvas property has very limited browser support (only Chrome 99+, no Safari/Firefox). When unsupported, it either does nothing or corrupts rendering. Multiplying em units by a pixel scale factor also makes no sense.

2. **DOM-dependent positioning is fragile**: The canvas code reads the overlay's `getBoundingClientRect()` to determine where to draw, but then manually positions text inside that rect using hardcoded offsets. This doesn't account for CSS flexbox layout, margins, padding, or the overlay's own `transform: scale() rotate()` which distorts the bounding rect.

3. **Text elements overlap**: The rank text, "SCENE" logo, artist name, venue, and date are all drawn at positions that don't match the actual DOM layout, causing them to stack on top of each other.

## Solution: Self-Contained Canvas Drawing

Rewrite `generateCanvas()` to calculate all positions independently from scratch (not reading DOM rects), using the same data and transform values that the React overlay uses. This makes the canvas output deterministic and DOM-independent.

### Technical Changes

**File: `src/components/PhotoOverlayEditor.tsx`**

Replace the `generateCanvas` function (lines ~345-515) with a rewritten version that:

1. **Removes `ctx.letterSpacing`** entirely -- instead draws "SCENE" with manually spaced characters using `ctx.measureText()` to add consistent gaps
2. **Calculates overlay position from state, not DOM**: Uses `transform.x`, `transform.y`, `transform.scale`, `transform.rotation`, and the known overlay width (160px) to compute all positions, scaled to canvas resolution
3. **Mirrors the DOM layout exactly**: Draws elements in the same vertical stack order as the JSX:
   - Artist name (bold, centered)
   - Venue with pin icon (small, centered) 
   - Date (smaller, centered)
   - Notes if enabled (italic, centered)
   - Footer: rank text + "SCENE" logo (centered, bottom)
4. **Properly scales font sizes**: Uses `overlayScale * scaleFactor` consistently, matching the CSS `transform: scale()` behavior
5. **Draws the MapPin icon**: Renders a simple pin shape on canvas to match the Lucide icon in the DOM
6. **Handles text shadow properly**: Applies canvas shadow settings that match the CSS `textShadow` values

### Key implementation details

- The overlay is 160px wide in DOM space; canvas scale factor = `canvas.width / containerWidth`
- The photo wrapper's aspect ratio and object-fit behavior must be replicated to know exactly where the image sits within the canvas
- `ctx.save()` / `ctx.restore()` used around the overlay drawing to apply rotation and scale as a canvas transform, matching the CSS transform
- The overlay background gradient uses the same HSL values as `getOverlayGradient()`
- "SCENE" characters drawn individually: measure each char width, add `charWidth * 0.25` spacing between them

