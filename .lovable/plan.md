
# Fix Globe Showcase - Display a 3D Globe with City Markers

## Current State
The `GlobeShowcase` mockup uses a flat SVG-based world map with abstract continent shapes - this doesn't match the actual app experience which shows a proper 3D globe with Mapbox's globe projection.

## Approach Analysis

### Option 1: Static Screenshot Image
- **Pros**: Zero runtime cost, guaranteed visual match with app
- **Cons**: Static (no interactivity), harder to update, larger file size

### Option 2: Enhanced SVG Globe (CSS-only)
- **Pros**: Lightweight, no external dependencies, works without JavaScript
- **Cons**: Won't look as realistic as actual Mapbox globe

### Option 3: Lightweight Mapbox Globe (Recommended)
- **Pros**: Matches actual app experience exactly, uses existing Mapbox token, real 3D globe projection
- **Cons**: Requires loading Mapbox library (already in bundle), slightly more complex

**Recommendation**: Option 3 - Use a simplified Mapbox instance with globe projection. Since Mapbox is already installed and used in the app, there's no additional bundle size. The globe can be made non-interactive (for landing page performance) while still showing the authentic 3D globe appearance with fog atmosphere effects.

---

## Implementation Plan

### Step 1: Create a LandingGlobe Component
Create a new component that renders a non-interactive Mapbox globe specifically for the landing page mockup:

**File**: `src/components/landing/LandingGlobe.tsx`

- Initialize Mapbox with `globe` projection (this is the default at low zoom)
- Use `mapbox://styles/mapbox/dark-v11` (same as actual app)
- Set initial zoom to ~1.5 for globe view
- Enable fog/atmosphere effect with `map.setFog({})` for the 3D appearance
- Disable all user interaction (`interactive: false`)
- Remove all UI controls (no zoom buttons, no compass)
- Add static glowing markers at predefined world locations

### Step 2: Add Static City Markers
Render glowing blue bubble markers at predetermined coordinates that match the demo screenshot:
- North America (US West Coast cluster - Los Angeles, San Francisco)
- US East Coast (New York, Brooklyn)
- Europe (London, Amsterdam)
- Optional: scattered global points

Each marker will have:
- Outer glow layer (subtle pulse animation)
- Inner solid dot with number count
- Use the app's primary color (`hsl(189, 94%, 55%)`)

### Step 3: Update GlobeShowcase Layout
Modify `src/components/landing/GlobeShowcase.tsx`:
- Add the dynamic island spacer (like other mockups)
- Replace the SVG continent shapes with the new `LandingGlobe` component
- Keep the existing stats overlay and bottom navigation
- Fix header alignment with Scene logo

### Step 4: Style Adjustments
- Ensure the globe container fits within the phone mockup viewport
- Match the dark background color (`#0a1628` or similar)
- Position the "World" navigation pill in top-left corner
- Keep the floating location button on the right side (visual only)

---

## Technical Details

### Mapbox Configuration for Landing Globe
```typescript
const map = new mapboxgl.Map({
  container: containerRef.current,
  style: 'mapbox://styles/mapbox/dark-v11',
  center: [-40, 30], // Atlantic-centered view
  zoom: 1.5, // Globe view
  interactive: false, // Disable all interaction
  attributionControl: false // Hide for cleaner mockup
});

map.on('style.load', () => {
  map.setFog({}); // Enable 3D atmosphere
});
```

### Static Markers with GeoJSON
```typescript
const markerData = {
  type: 'FeatureCollection',
  features: [
    { coordinates: [-118.24, 34.05], count: 3 }, // LA
    { coordinates: [-73.99, 40.73], count: 2 },  // NYC
    { coordinates: [-0.12, 51.51], count: 3 },   // London
    // ... more cities
  ]
};
```

### Circle Layer Styling
Use the same styling as the actual `MapView.tsx`:
- `circle-color`: `hsl(189, 94%, 55%)`
- `circle-blur`: 0.1 for soft edges
- Outer glow layer with higher blur and opacity

---

## Files to Modify

| File | Changes |
|------|---------|
| `src/components/landing/LandingGlobe.tsx` | **New file** - Static Mapbox globe component |
| `src/components/landing/GlobeShowcase.tsx` | Replace SVG with LandingGlobe, add spacer for notch |

## Performance Considerations
- The Mapbox instance will be non-interactive, reducing CPU usage
- Uses the same Mapbox token already in the app
- Component will only mount when scrolled into view (natural lazy loading via React)
- No geocoding API calls - all marker positions are hardcoded
