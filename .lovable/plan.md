

# Constrain Overlay to Image Bounds

## The Problem

Currently, users can drag the overlay onto the black letterboxing areas (the black borders in 9:16 mode), but the exported image only includes the photo's native dimensions. This creates a "what you see is NOT what you get" issue - overlay content positioned on the black borders won't appear in the shared image.

## The Solution

Move the gesture handlers from the outer container to the inner photo wrapper, so the overlay's draggable area matches exactly what will be exported.

---

## Visual Explanation

```text
CURRENT (handlers on outer container):       FIXED (handlers on inner wrapper):
+---------------------------+                +---------------------------+
|  BLACK BORDER (touch OK)  |                |  BLACK BORDER (no touch)  |
|   +-------------------+   |                |   +-------------------+   |
|   |                   |   |                |   |                   |   |
|   |   PHOTO           |   |   <-- Overlay  |   |   PHOTO           |   |   <-- Overlay
|   |   (exported)      |   |   can go here  |   |   (exported)      |   |   CONSTRAINED
|   |                   |   |                |   |                   |   |   to this area
|   +-------------------+   |                |   +-------------------+   |
|  BLACK BORDER (touch OK)  |                |  BLACK BORDER (no touch)  |
+---------------------------+                +---------------------------+
```

---

## Technical Changes

### File: `src/components/PhotoOverlayEditor.tsx`

**Move handlers from outer to inner container:**

| Current | Fixed |
|---------|-------|
| Handlers on `#canvas-container` (outer black container) | Handlers on the photo wrapper div (inner element with `aspectRatio`) |

### Code Changes

**Before (line ~743-750):**
```tsx
<div
  ref={containerRef}
  id="canvas-container"
  className="relative bg-black overflow-hidden touch-none rounded-lg h-full w-full flex items-center justify-center"
  {...handlers}  // <- Handlers here allow dragging over black borders
>
  <div 
    className="relative"
    style={{ aspectRatio: ... }}
  >
```

**After:**
```tsx
<div
  ref={containerRef}
  id="canvas-container"
  className="relative bg-black overflow-hidden rounded-lg h-full w-full flex items-center justify-center"
  // <- No handlers here
>
  <div 
    className="relative touch-none"
    style={{ aspectRatio: ... }}
    {...handlers}  // <- Handlers moved here - only image area is draggable
  >
```

### Additional Change: Add `overflow-hidden` to photo wrapper

To visually clip the overlay when it goes beyond the image bounds (so users see exactly what will be exported):

```tsx
<div 
  className="relative touch-none overflow-hidden"
  style={{ aspectRatio: ... }}
  {...handlers}
>
```

---

## Result

After this fix:
1. Overlay can only be dragged within the actual photo bounds
2. If the overlay goes beyond the edges, it gets visually clipped
3. What users see in the editor matches exactly what gets exported
4. The black letterboxing areas become non-interactive "preview only" regions

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/PhotoOverlayEditor.tsx` | Move `{...handlers}` and `touch-none` from outer container to inner photo wrapper; add `overflow-hidden` to clip overlay |

