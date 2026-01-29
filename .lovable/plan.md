
# Animated Journey Arcs on the Globe

## Overview
Add animated arc lines that draw sequentially from city to city, creating a visual "world tour" effect showing the user's music journey. The arcs will follow a curated artistic order designed to create visually interesting patterns across the globe.

## Visual Design

### Arc Style
- **Color**: Glowing cyan matching existing markers (`hsl(189, 94%, 55%)`)
- **Effect**: Bright leading edge with a fading trail behind it
- **Shape**: Curved great-circle arcs (natural globe curvature)
- **Animation**: Sequential drawing — each arc completes before the next begins

### Journey Order (Curated for Visual Interest)
I've designed routes that create sweeping cross-globe arcs rather than short regional hops:

**2024 Journey** (10 cities):
NYC → London → Berlin → Amsterdam → Tokyo → Sydney → São Paulo → Austin → Chicago → LA

**2025 Journey** (12 cities):  
NYC → Paris → Barcelona → Berlin → Seoul → Tokyo → Melbourne → Sydney → São Paulo → Buenos Aires → LA → London

**2026 Journey** (18 cities):
NYC → Toronto → London → Paris → Barcelona → Ibiza → Berlin → Seoul → Tokyo → Bangkok → Singapore → Sydney → Melbourne → Cape Town → São Paulo → Buenos Aires → Mexico City → SF → LA

These routes create dramatic long-distance arcs across oceans and continents.

### Timing
- Each arc draws over ~600ms
- ~100ms pause between arcs
- 2 second hold when journey complete
- Fade out and restart loop

## Technical Approach

### 1. Arc Generation Function
Calculate curved path coordinates between two points:
- Generate 50 intermediate points along great-circle path
- Add altitude offset at midpoint for the arc "lift"
- Return as LineString coordinates array

### 2. Curated Journey Sequences
Define year-specific city orderings as index arrays that reference CITY_MARKERS, designed to maximize visual arc sweep across the globe.

### 3. New Mapbox Layers
Add two line layers for the glow effect:
- **Arc trail**: Thicker, lower opacity, more blur (the fading tail)
- **Arc head**: Thinner, higher opacity, sharp (the bright leading edge)

### 4. Animation System
Use `requestAnimationFrame` with:
- Track current arc index and draw progress (0-1)
- Progressively add points to the line geometry
- When arc complete, start next arc
- When all arcs complete, hold then fade and restart

### 5. Year Switching
When year changes:
- Cancel current animation
- Clear arc layers
- Load new journey sequence for selected year
- Restart animation from beginning

### 6. "All Years" View
Display all journey arcs simultaneously (from all years), creating a dense web of travel paths.

## File Changes

### Modified: `src/components/landing/LandingGlobe.tsx`

**New constants:**
- `JOURNEY_2024`, `JOURNEY_2025`, `JOURNEY_2026` — curated city index sequences
- `ARC_DURATION`, `ARC_DELAY`, `HOLD_DURATION` — timing constants

**New utility functions:**
- `generateArcPath(start, end, numPoints)` — creates curved arc coordinates
- `interpolateGreatCircle(start, end, t)` — spherical interpolation helper

**New refs:**
- `arcAnimationRef` — for the arc animation frame
- `arcProgressRef` — tracks current arc index and progress

**Modified `style.load` handler:**
- Add `journey-arcs` GeoJSON source (initially empty)
- Add `arc-trail` and `arc-head` line layers with glow styling

**New effect:**
- Start arc animation when map loads or year changes
- Manage animation lifecycle and cleanup

**Animation loop:**
- Update arc line geometry each frame
- Progress through journey sequence
- Loop continuously with hold/fade between cycles
