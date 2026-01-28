

# Touch Feedback Animations for Map Dots

## Overview
Add visual feedback animations (scale up + enhanced glow) when users hover over or tap map dots on any device. This will make the dots feel more interactive and responsive, especially important on mobile where there are no cursor changes.

## Technical Approach

Mapbox GL JS supports dynamic paint property changes using **feature-state**. We'll use this to:
1. Track which feature (dot) is currently being interacted with
2. Apply scaled-up radius and intensified glow when a dot is hovered/touched

### Changes to MapView.tsx

**1. Add feature-state tracking for hover**

For each dot layer (country, city, venue), we'll:
- Store the currently hovered feature ID
- Use `map.setFeatureState()` to mark features as "hovered"
- Update paint properties to use expressions that reference `feature-state.hover`

**2. Update paint properties to react to feature-state**

Replace static `circle-radius` with expressions like:
```javascript
'circle-radius': [
  'case',
  ['boolean', ['feature-state', 'hover'], false],
  // Hovered: larger radius (e.g., +6px)
  ['interpolate', ['linear'], ['get', 'showCount'], 1, 28, 5, 34, 10, 40, 50, 50],
  // Default radius
  ['interpolate', ['linear'], ['get', 'showCount'], 1, 22, 5, 28, 10, 34, 50, 44]
]
```

Similarly for glow layers:
- Increase `circle-opacity` from 0.3 to 0.5 on hover
- Increase glow radius slightly

**3. Add touch event handlers for mobile**

Mapbox treats touch as click events, but we need to handle:
- `touchstart` on dots → set feature state to hovered
- `touchend` anywhere → clear hover state
- This provides visual feedback before the actual click action fires

**4. Add smooth transitions**

Add `circle-radius-transition` and `circle-opacity-transition` paint properties to animate the changes:
```javascript
'circle-radius-transition': { duration: 150 },
'circle-opacity-transition': { duration: 150 }
```

### Implementation Steps

1. **Modify `addCountryMarkers()` function**
   - Add unique IDs to GeoJSON features (required for feature-state)
   - Update circle paint with feature-state expressions for radius and opacity
   - Add transition properties
   - Update mouseenter/mouseleave handlers to use `setFeatureState`
   - Add touchstart handler for mobile feedback

2. **Apply same pattern to `addCityMarkers()`**
   - Same feature-state logic with city-specific colors and sizes

3. **Apply same pattern to `addVenueMarkers()`**
   - Same feature-state logic with venue-specific colors and sizes

4. **Add a ref to track hovered feature IDs**
   - `hoveredFeatureRef` to track current hover state across all layers
   - Needed for proper cleanup when switching between features

### Visual Effect Summary

| State | Radius | Glow Opacity | Glow Radius |
|-------|--------|--------------|-------------|
| Default | Base size | 0.3 | Base + 6px |
| Hovered/Touched | Base + 6px | 0.5 | Base + 12px |

The transition duration of 150ms will create a smooth, responsive feel without being sluggish.

---

## Technical Details

### Feature-State System
- Each GeoJSON feature needs a unique `id` property (we'll use array index)
- `map.setFeatureState({ source, id }, { hover: true })` marks a feature
- Paint expressions read this with `['feature-state', 'hover']`
- Must call `setFeatureState` with `hover: false` to clear

### Mobile Touch Handling
- `touchstart` on layer → set hover state (provides immediate feedback)
- The existing `click` handler still fires after touch
- Clear hover state on `touchend` (on document, not just layer)

### Event Handler Cleanup
- Need to store references to handlers for proper cleanup in useEffect
- Important to prevent memory leaks when layers are recreated

