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
 * Check if a route would exceed the max latitude (indicating a polar-crossing arc)
 */
export const wouldExceedLatitude = (
  start: [number, number],
  end: [number, number],
  maxLatitude: number = 52
): boolean => {
  // Sample the path to check max latitude
  for (let i = 0; i <= 20; i++) {
    const t = i / 20;
    const point = interpolateGreatCircle(start, end, t);
    if (Math.abs(point[1]) > maxLatitude) {
      return true;
    }
  }
  return false;
};

/**
 * Generate a curved arc path between two coordinates
 * Returns empty array if the route would cross polar regions
 */
export const generateArcPath = (
  start: [number, number],
  end: [number, number],
  numPoints: number = 50,
  maxLatitude: number = 52 // Reject routes that go above this
): [number, number][] => {
  // Check if this route would go too far north/south
  if (wouldExceedLatitude(start, end, maxLatitude)) {
    // Return a straight line at lower opacity instead (will be filtered)
    return [];
  }
  
  const path: [number, number][] = [];
  
  for (let i = 0; i <= numPoints; i++) {
    const t = i / numPoints;
    const point = interpolateGreatCircle(start, end, t);
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
// CRITICAL: Only use routes that stay below 52° latitude to avoid polar arcs
// Avoid: transpacific routes (LA↔Tokyo), transatlantic to northern Europe from west coast

// 2024: Americas + Europe only - safe routes
export const JOURNEY_2024 = [
  0, 7,       // NYC → Austin
  7, 8,       // Austin → Chicago  
  8, 1,       // Chicago → LA
  1, 21,      // LA → Mexico City
  21, 0,      // Mexico City → NYC
  0, 6,       // NYC → São Paulo
  6, 13,      // São Paulo → Buenos Aires
  13, 0,      // Buenos Aires → NYC
  0, 2,       // NYC → London
  2, 10,      // London → Paris
  10, 11,     // Paris → Barcelona
  11, 2,      // Barcelona → London
  2, 0,       // London → NYC
];

// 2025: Americas + Europe + Australia via South America (no transpacific)
export const JOURNEY_2025 = [
  0, 1,       // NYC → LA
  1, 15,      // LA → SF
  15, 21,     // SF → Mexico City
  21, 0,      // Mexico City → NYC
  0, 6,       // NYC → São Paulo
  6, 13,      // São Paulo → Buenos Aires
  13, 5,      // Buenos Aires → Sydney (southern route)
  5, 14,      // Sydney → Melbourne
  14, 6,      // Melbourne → São Paulo (southern return)
  6, 0,       // São Paulo → NYC
  0, 2,       // NYC → London
  2, 9,       // London → Amsterdam
  9, 3,       // Amsterdam → Berlin
  3, 10,      // Berlin → Paris
  10, 11,     // Paris → Barcelona
  11, 2,      // Barcelona → London
  2, 0,       // London → NYC
];

// 2026: Global with all southern/equatorial routing
export const JOURNEY_2026 = [
  0, 16,      // NYC → Toronto
  16, 8,      // Toronto → Chicago
  8, 7,       // Austin (if available) or Chicago → Austin
  7, 21,      // Austin → Mexico City
  21, 15,     // Mexico City → SF
  15, 1,      // SF → LA
  1, 0,       // LA → NYC
  0, 6,       // NYC → São Paulo
  6, 20,      // São Paulo → Cape Town
  20, 13,     // Cape Town → Buenos Aires
  13, 5,      // Buenos Aires → Sydney (southern)
  5, 19,      // Sydney → Singapore
  19, 18,     // Singapore → Bangkok
  18, 12,     // Bangkok → Seoul
  12, 4,      // Seoul → Tokyo
  4, 19,      // Tokyo → Singapore (stay in Asia)
  19, 6,      // Singapore → São Paulo (via southern route)
  6, 0,       // São Paulo → NYC
  0, 2,       // NYC → London
  2, 10,      // London → Paris
  10, 17,     // Paris → Ibiza
  17, 11,     // Ibiza → Barcelona
  11, 3,      // Barcelona → Berlin
  3, 9,       // Berlin → Amsterdam
  9, 2,       // Amsterdam → London
  2, 0,       // London → NYC
];

// All years: Epic journey using only safe routes
export const JOURNEY_ALL = [
  // Americas
  0, 16,      // NYC → Toronto
  16, 8,      // Toronto → Chicago
  8, 7,       // Chicago → Austin
  7, 21,      // Austin → Mexico City
  21, 15,     // Mexico City → SF
  15, 1,      // SF → LA
  1, 0,       // LA → NYC
  // South America + Africa
  0, 6,       // NYC → São Paulo
  6, 13,      // São Paulo → Buenos Aires
  13, 20,     // Buenos Aires → Cape Town
  20, 6,      // Cape Town → São Paulo
  6, 0,       // São Paulo → NYC
  // Europe
  0, 2,       // NYC → London
  2, 10,      // London → Paris
  10, 17,     // Paris → Ibiza
  17, 11,     // Ibiza → Barcelona
  11, 9,      // Barcelona → Amsterdam
  9, 3,       // Amsterdam → Berlin
  3, 2,       // Berlin → London
  2, 0,       // London → NYC
  // Asia-Pacific via southern route
  0, 6,       // NYC → São Paulo
  6, 5,       // São Paulo → Sydney (southern)
  5, 14,      // Sydney → Melbourne
  14, 19,     // Melbourne → Singapore
  19, 18,     // Singapore → Bangkok
  18, 12,     // Bangkok → Seoul
  12, 4,      // Seoul → Tokyo
  4, 18,      // Tokyo → Bangkok (stay regional)
  18, 19,     // Bangkok → Singapore
  19, 5,      // Singapore → Sydney
  5, 6,       // Sydney → São Paulo (southern return)
  6, 0,       // São Paulo → NYC
];
