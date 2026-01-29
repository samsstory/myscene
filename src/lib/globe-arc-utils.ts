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
 * Returns an array of [lng, lat] coordinates forming the arc
 */
export const generateArcPath = (
  start: [number, number],
  end: [number, number],
  numPoints: number = 50
): [number, number][] => {
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
export const ARC_DURATION = 600; // ms per arc
export const ARC_DELAY = 100; // ms pause between arcs
export const HOLD_DURATION = 2000; // ms to hold complete journey
export const FADE_DURATION = 500; // ms to fade out

// Curated journey sequences (indices into CITY_MARKERS array)
// These are designed to create visually dramatic arcs across the globe

// 2024: NYC → London → Berlin → Amsterdam → Tokyo → Sydney → São Paulo → Austin → Chicago → LA
export const JOURNEY_2024 = [0, 2, 3, 9, 4, 5, 6, 7, 8, 1];

// 2025: NYC → Paris → Barcelona → Berlin → Seoul → Tokyo → Melbourne → Sydney → São Paulo → Buenos Aires → LA → London
export const JOURNEY_2025 = [0, 10, 11, 3, 12, 4, 14, 5, 6, 13, 1, 2];

// 2026: NYC → Toronto → London → Paris → Barcelona → Ibiza → Berlin → Seoul → Tokyo → Bangkok → Singapore → Sydney → Melbourne → Cape Town → São Paulo → Buenos Aires → Mexico City → SF → LA
export const JOURNEY_2026 = [0, 16, 2, 10, 11, 17, 3, 12, 4, 18, 19, 5, 14, 20, 6, 13, 21, 15, 1];
