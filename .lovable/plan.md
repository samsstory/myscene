

# Smooth Inertia Tuning for Map Panning

## Overview
Adjust the momentum/inertia behavior when panning the map so it feels more natural and responsive. This involves configuring Mapbox's `DragPanHandler` with custom inertia settings that provide a smoother deceleration curve after releasing a drag gesture.

## Current State
The map is initialized with default Mapbox settings, which means it uses the default inertia values:
- `linearity: 0` (no velocity scaling)
- `maxSpeed: 1400` (max drag velocity)
- `deceleration: 2500` (rate of speed reduction)
- Default bezier easing function

## Proposed Changes
Configure custom inertia settings to create a more natural, "gliding" feel similar to iOS scrolling physics.

### Inertia Parameter Tuning

| Parameter | Default | Proposed | Effect |
|-----------|---------|----------|--------|
| `linearity` | 0 | 0.25 | Scales drag velocity - higher values make the initial momentum feel more connected to finger movement |
| `deceleration` | 2500 | 3000 | Slightly faster deceleration for snappier response without feeling abrupt |
| `maxSpeed` | 1400 | 1800 | Higher max speed allows faster flicks to travel further |
| `easing` | bezier | custom ease-out | Smooth ease-out curve for natural deceleration |

### Implementation Details

**File to modify:** `src/components/MapView.tsx`

**Step 1: Add inertia configuration after map initialization**

In the map initialization `useEffect`, after creating the map instance, configure the `dragPan` handler with custom inertia settings:

```typescript
map.current = new mapboxgl.Map({
  container: mapContainer.current,
  style: "mapbox://styles/mapbox/dark-v11",
  center: defaultCenter,
  zoom: defaultZoom,
  dragPan: {
    linearity: 0.25,
    easing: (t: number) => 1 - Math.pow(1 - t, 3), // Cubic ease-out
    deceleration: 3000,
    maxSpeed: 1800
  }
});
```

**Alternative approach (for runtime adjustment):**

If we want to adjust settings after initialization or conditionally:

```typescript
// After map is loaded
map.current.on('load', () => {
  map.current.dragPan.enable({
    linearity: 0.25,
    easing: (t: number) => 1 - Math.pow(1 - t, 3),
    deceleration: 3000,
    maxSpeed: 1800
  });
});
```

## Easing Function Options

The easing function defines how the velocity decreases over time. Options to consider:

1. **Cubic ease-out** (recommended): `t => 1 - Math.pow(1 - t, 3)`
   - Starts fast, slows down gradually - feels natural

2. **Quadratic ease-out**: `t => t * (2 - t)`
   - Slightly less dramatic than cubic

3. **Exponential ease-out**: `t => 1 - Math.pow(2, -10 * t)`
   - Very smooth at the end

## Why These Values?

- **Linearity 0.25**: Provides a light connection between finger speed and map momentum without feeling sluggish
- **Deceleration 3000**: Slightly faster than default - the map settles quicker, which feels more controlled
- **Max Speed 1800**: Allows for satisfying fast flicks across large areas
- **Cubic ease-out**: Mimics physical friction - natural deceleration curve

---

## Technical Details

### TypeScript Types
Mapbox GL JS exports `DragPanOptions` type:
```typescript
type DragPanOptions = {
  linearity?: number;
  easing?: (t: number) => number;
  deceleration?: number;
  maxSpeed?: number;
};
```

### Location of Change
Lines 285-290 in `src/components/MapView.tsx` - the map constructor options

### Testing Considerations
- Test on both desktop (mouse drag) and mobile (touch swipe)
- Verify the map "glides" smoothly after releasing a drag
- Ensure quick flicks travel an appropriate distance
- Confirm the map settles without jittery motion at the end

