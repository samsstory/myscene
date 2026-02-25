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

  const d = Math.acos(
    Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1)
  );

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
  maxLatitude: number = 52
): [number, number][] => {
  if (wouldExceedLatitude(start, end, maxLatitude)) {
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
export const ARC_DURATION = 500;
export const ARC_DELAY = 80;
export const HOLD_DURATION = 2000;
export const FADE_DURATION = 500;

// Journey sequences with NYC (index 0) as home base
export const JOURNEY_2024 = [
  0, 7, 7, 8, 8, 1, 1, 21, 21, 0, 0, 6, 6, 13, 13, 0, 0, 2, 2, 10, 10, 11, 11, 2, 2, 0,
];

export const JOURNEY_2025 = [
  0, 1, 1, 15, 15, 21, 21, 0, 0, 6, 6, 13, 13, 5, 5, 14, 14, 6, 6, 0, 0, 2, 2, 9, 9, 3, 3, 10, 10, 11, 11, 2, 2, 0,
];

export const JOURNEY_2026 = [
  0, 16, 16, 8, 8, 7, 7, 21, 21, 15, 15, 1, 1, 0, 0, 6, 6, 20, 20, 13, 13, 5, 5, 19, 19, 18, 18, 12, 12, 4, 4, 19, 19, 6, 6, 0, 0, 2, 2, 10, 10, 17, 17, 11, 11, 3, 3, 9, 9, 2, 2, 0,
];

export const JOURNEY_ALL = [
  0, 16, 16, 8, 8, 7, 7, 21, 21, 15, 15, 1, 1, 0,
  0, 6, 6, 13, 13, 20, 20, 6, 6, 0,
  0, 2, 2, 10, 10, 17, 17, 11, 11, 9, 9, 3, 3, 2, 2, 0,
  0, 6, 6, 5, 5, 14, 14, 19, 19, 18, 18, 12, 12, 4, 4, 18, 18, 19, 19, 5, 5, 6, 6, 0,
];
