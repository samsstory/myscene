

# Stylized "SCENE" Logo with Subtle Glow

## Overview

Transform the plain grey "SCENE" text into a memorable, stylized typographic watermark with a soft white glow that floats elegantly over any photo background.

---

## Design Approach

### Typography Treatment

| Aspect | Current | New |
|--------|---------|-----|
| Case | ALL CAPS | Title Case ("Scene") - matches header |
| Weight | Bold | Heavy/Black (more presence) |
| Tracking | Wide | Extra-wide (more air, more premium) |
| Opacity | 30% grey | 70-80% white (more visible) |
| Effect | Grayscale filter | Soft drop shadow glow |

### The Glow Effect

```text
                    ╭─────────────╮
  Current:          │   SCENE     │  ← Flat, grey, forgettable
                    ╰─────────────╯
  
                    ╭─────────────╮
  New:              │   Scene     │  ← White with soft luminous halo
                    │ ░░░░░░░░░░░ │     that adapts to any background
                    ╰─────────────╯
```

The glow creates a "light source" effect - as if the text is subtly illuminated, making it pop without being aggressive.

---

## Technical Implementation

### DOM Rendering (PhotoOverlayEditor.tsx, ~line 909-914)

**Current:**
```tsx
<span 
  className="font-bold tracking-wider opacity-30" 
  style={{ filter: "grayscale(100%)" }}
>
  SCENE
</span>
```

**New:**
```tsx
<span 
  className="font-black tracking-[0.25em] text-white/75"
  style={{ 
    textShadow: "0 0 8px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.2)" 
  }}
>
  Scene
</span>
```

Key changes:
- `font-black` → Maximum weight for presence
- `tracking-[0.25em]` → Extra-wide letter spacing for premium feel
- `text-white/75` → Higher opacity for visibility
- `textShadow` → Two-layer glow: tight inner halo + soft outer bloom

---

### Canvas Export (PhotoOverlayEditor.tsx, ~line 519-523)

**Current:**
```tsx
ctx.font = `bold ${10 * overlayScale * scaleX}px system-ui`;
ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
ctx.fillText("SCENE", ...);
```

**New:**
```tsx
// Set up font
ctx.font = `900 ${10 * overlayScale * scaleX}px system-ui`;
ctx.textAlign = "right";

// Multi-layer glow effect (painted bottom to top)
// Outer soft glow
ctx.shadowColor = "rgba(255, 255, 255, 0.3)";
ctx.shadowBlur = 16 * scaleX;
ctx.shadowOffsetX = 0;
ctx.shadowOffsetY = 0;
ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
ctx.fillText("Scene", ...);

// Reset shadow
ctx.shadowBlur = 0;
```

---

## Visual Result

The new logo will:

1. **Feel premium** - Heavy weight + wide tracking = luxury brand vibes
2. **Pop on any background** - The glow creates natural contrast against both dark and light areas
3. **Stay subtle** - It's still semi-transparent and doesn't compete with the show content
4. **Match brand consistency** - Title case "Scene" matches the app header

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/PhotoOverlayEditor.tsx` | Update logo styling in DOM (~line 909-914) and canvas export (~line 519-523) |

