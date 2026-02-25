

## Root Cause Analysis

The globe map canvas exists in the DOM and Mapbox tiles are loading successfully (200 OK), but nothing is visible on screen. The issue is a **CSS specificity conflict** between Tailwind CSS and the Mapbox GL CSS.

### The Conflict

The map container element in `MapView.tsx` (line 697) has Tailwind classes `absolute inset-0`:

```
<div ref={mapContainer} className="absolute inset-0 rounded-xl overflow-hidden ..." />
```

When Mapbox initializes, it adds the `.mapboxgl-map` class to this same element. The Mapbox CSS contains:

```css
.mapboxgl-map { position: relative; overflow: hidden; }
```

Both `.absolute` (Tailwind) and `.mapboxgl-map` (Mapbox CSS) have identical CSS specificity of `(0,1,0)`. When specificity is equal, the **last declaration in source order wins**.

With the previous dynamic `<link>` injection approach, there was a race condition where the Mapbox CSS sometimes loaded after the map had already computed its dimensions — meaning the map could sometimes work by accident. With the new static `import "mapbox-gl/dist/mapbox-gl.css"`, Vite bundles the CSS and injects it **after** Tailwind's styles (since `index.css` is imported in `main.tsx` before `MapView.tsx` is loaded). This means `.mapboxgl-map { position: relative }` consistently overrides `.absolute { position: absolute }`.

The result: the map container loses its absolute positioning, becomes `position: relative` with no explicit height, and collapses to 0 visible height. The canvas inside renders at 0 dimensions.

### Fix Plan

**File: `src/components/MapView.tsx` (line 696-700)**

Move the critical positioning properties (`position: absolute`, `inset: 0`) to **inline styles**, which always beat class-based rules regardless of source order:

```tsx
<div 
  ref={mapContainer} 
  className="rounded-xl overflow-hidden [&_.mapboxgl-ctrl-logo]:hidden [&_.mapboxgl-ctrl-attrib]:hidden" 
  style={{ position: 'absolute', inset: 0, backgroundColor: 'hsl(222, 47%, 11%)' }}
/>
```

This is the safest approach because inline styles have specificity `(1,0,0,0)` and always win over any class selector.

**File: `src/components/landing/LandingGlobe.tsx`** — No change needed. The landing globe uses `w-full h-full` (explicit width/height), which is not overridden by `.mapboxgl-map { position: relative }`.

### Verification

After the fix, navigate to the Globe tab on the dashboard and confirm the map renders with visible tiles, markers, and zoom/pan interaction.

