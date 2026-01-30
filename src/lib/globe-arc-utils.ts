// Utility functions for generating great-circle arc paths on a globe

/**
 * Convert degrees to radians
 */
const toRadians = (deg: number): number => (deg * Math.PI) / 180;

/**
 * Convert radians to degrees
 */
const toDegrees = (rad: number): number => (rad * 180) / Math.PI;

/**
 * Interpolate along a great-circle path between two points on a sphere
 * Uses spherical linear interpolation (slerp)
 */
export const interpolateGreatCircle = (
  start: [number, number],
  end: [number, number],
  t: number
): [number, number] => {
  const lon1 = toRadians(start[0]);
  const lat1 = toRadians(start[1]);
  const lon2 = toRadians(end[0]);
  const lat2 = toRadians(end[1]);

  // Calculate the angular distance between points
  const d = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  );

  // Handle case where points are the same or very close
  if (d < 0.0001) {
    return start;
  }

  const a = Math.sin((1 - t) * d) / Math.sin(d);
  const b = Math.sin(t * d) / Math.sin(d);

  const x = a * Math.cos(lat1) * Math.cos(lon1) + b * Math.cos(lat2) * Math.cos(lon2);
  const y = a * Math.cos(lat1) * Math.sin(lon1) + b * Math.cos(lat2) * Math.sin(lon2);
  const z = a * Math.sin(lat1) + b * Math.sin(lat2);

  const lat = Math.atan2(z, Math.sqrt(x * x + y * y));
  const lon = Math.atan2(y, x);

  return [toDegrees(lon), toDegrees(lat)];
};

/**
 * Generate a curved arc path between two coordinates
 * Clamps latitude to avoid unrealistic polar routes
 */
export const generateArcPath = (
  start: [number, number],
  end: [number, number],
  numPoints: number = 50,
  maxLatitude: number = 65 // Clamp to avoid polar routes
): [number, number][] => {
  const path: [number, number][] = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    let point = interpolateGreatCircle(start, end, t);
    
    // Clamp latitude to avoid polar routes
    if (point[1] > maxLatitude) {
      point = [point[0], maxLatitude];
    } else if (point[1] < -maxLatitude) {
      point = [point[0], -maxLatitude];
    }
    
    path.push(point);
  }
  
  return path;
};

/**
 * Create a GeoJSON LineString from arc coordinates
 */
export const createArcGeoJSON = (
  coordinates: [number, number][]
): GeoJSON.Feature<GeoJSON.LineString> => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "LineString",
    coordinates,
  },
});

/**
 * Create a GeoJSON FeatureCollection with multiple arcs
 */
export const createMultiArcGeoJSON = (
  arcs: [number, number][][]
): GeoJSON.FeatureCollection<GeoJSON.LineString> => ({
  type: "FeatureCollection",
  features: arcs.map((coordinates) => ({
    type: "Feature" as const,
    properties: {},
    geometry: {
      type: "LineString" as const,
      coordinates,
    },
  })),
});

// Animation timing constants
export const ARC_DURATION = 500; // ms per arc
export const ARC_DELAY = 80; // ms pause between arcs
export const HOLD_DURATION = 2000; // ms to hold complete journey
export const FADE_DURATION = 500; // ms to fade out

// Journey sequences with NYC (index 0) as home base
// Designed to minimize overlapping transatlantic routes and avoid polar appearance
// Each region is explored before returning home

// 2024: Regional focus with minimal Atlantic crossings
export const JOURNEY_2024 = [
  0, 7,       // NYC → Austin
  7, 8,       // Austin → Chicago
  8, 1,       // Chicago → LA
  1, 0,       // LA → NYC (domestic loop complete)
  0, 2,       // NYC → London (single Atlantic crossing)
  2, 9,       // London → Amsterdam
  9, 3,       // Amsterdam → Berlin
  3, 2,       // Berlin → London
  2, 0,       // London → NYC (return - same route back)
  0, 6,       // NYC → São Paulo
  6, 5,       // São Paulo → Sydney (southern route)
  5, 4,       // Sydney → Tokyo
  4, 1,       // Tokyo → LA (Pacific)
  1, 0,       // LA → NYC
];

// 2025: Explore each region fully before moving on
export const JOURNEY_2025 = [
  0, 1,       // NYC → LA
  1, 4,       // LA → Tokyo (Pacific)
  4, 12,      // Tokyo → Seoul
  12, 4,      // Seoul → Tokyo
  4, 14,      // Tokyo → Melbourne
  14, 5,      // Melbourne → Sydney
  5, 6,       // Sydney → São Paulo (southern)
  6, 13,      // São Paulo → Buenos Aires
  13, 6,      // Buenos Aires → São Paulo
  6, 0,       // São Paulo → NYC
  0, 2,       // NYC → London (single Atlantic crossing)
  2, 10,      // London → Paris
  10, 11,     // Paris → Barcelona
  11, 10,     // Barcelona → Paris
  10, 3,      // Paris → Berlin
  3, 2,       // Berlin → London
  2, 0,       // London → NYC (return)
];

// 2026: Global with strategic routing
export const JOURNEY_2026 = [
  0, 16,      // NYC → Toronto
  16, 8,      // Toronto → Chicago
  8, 21,      // Chicago → Mexico City
  21, 15,     // Mexico City → SF
  15, 1,      // SF → LA
  1, 4,       // LA → Tokyo (Pacific)
  4, 12,      // Tokyo → Seoul
  12, 18,     // Seoul → Bangkok
  18, 19,     // Bangkok → Singapore
  19, 5,      // Singapore → Sydney
  5, 14,      // Melbourne → Sydney
  14, 6,      // Melbourne → São Paulo (southern)
  6, 20,      // São Paulo → Cape Town
  20, 6,      // Cape Town → São Paulo
  6, 13,      // São Paulo → Buenos Aires
  13, 0,      // Buenos Aires → NYC
  0, 2,       // NYC → London (single crossing)
  2, 10,      // London → Paris
  10, 17,     // Paris → Ibiza
  17, 11,     // Ibiza → Barcelona
  11, 3,      // Barcelona → Berlin
  3, 2,       // Berlin → London
  2, 0,       // London → NYC (return)
];

// All years: Epic journey minimizing Atlantic overlap
export const JOURNEY_ALL = [
  0, 16,      // NYC → Toronto
  16, 8,      // Toronto → Chicago
  8, 7,       // Chicago → Austin
  7, 21,      // Austin → Mexico City
  21, 15,     // Mexico City → SF
  15, 1,      // SF → LA
  1, 4,       // LA → Tokyo (Pacific)
  4, 12,      // Tokyo → Seoul
  12, 18,     // Seoul → Bangkok
  18, 19,     // Bangkok → Singapore
  19, 5,      // Singapore → Sydney
  5, 14,      // Sydney → Melbourne
  14, 6,      // Melbourne → São Paulo (southern)
  6, 13,      // São Paulo → Buenos Aires
  13, 20,     // Buenos Aires → Cape Town
  20, 6,      // Cape Town → São Paulo
  6, 0,       // São Paulo → NYC
  0, 2,       // NYC → London (single Atlantic crossing to Europe)
  2, 10,      // London → Paris
  10, 17,     // Paris → Ibiza
  17, 11,     // Ibiza → Barcelona
  11, 9,      // Barcelona → Amsterdam
  9, 3,       // Amsterdam → Berlin
  3, 2,       // Berlin → London
  2, 0,       // London → NYC (final return)
];
