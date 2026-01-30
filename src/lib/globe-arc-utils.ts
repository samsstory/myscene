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

/**
 * Check if a point is visible from the current globe view
 * Uses the dot product between camera direction and point normal
 */
export const isPointVisible = (
  point: [number, number],
  cameraCenter: { lng: number; lat: number },
  threshold: number = 0 // 0 = exactly on horizon, negative = slightly behind
): boolean => {
  const lon1 = toRadians(cameraCenter.lng);
  const lat1 = toRadians(cameraCenter.lat);
  const lon2 = toRadians(point[0]);
  const lat2 = toRadians(point[1]);
  
  // Calculate angle between camera center and point
  const cosAngle = 
    Math.sin(lat1) * Math.sin(lat2) +
    Math.cos(lat1) * Math.cos(lat2) * Math.cos(lon2 - lon1);
  
  // Point is visible if angle is less than 90 degrees (cosAngle > 0)
  return cosAngle > threshold;
};

/**
 * Check if an arc (both endpoints) is visible
 */
export const isArcVisible = (
  start: [number, number],
  end: [number, number],
  cameraCenter: { lng: number; lat: number },
  threshold: number = -0.1 // Slightly permissive to catch arcs near horizon
): boolean => {
  return isPointVisible(start, cameraCenter, threshold) && 
         isPointVisible(end, cameraCenter, threshold);
};

// Animation timing constants
export const ARC_DURATION = 400; // ms per arc (faster for multiple simultaneous)
export const HUB_DELAY = 800; // ms pause between hub bursts
export const HOLD_DURATION = 1500; // ms to hold complete hub pattern
export const FADE_DURATION = 400; // ms to fade out

// Hub-and-spoke configuration
// Each hub has indices of cities to connect to (city indices from CITY_MARKERS)
export interface HubConfig {
  hubIndex: number;
  spokes: number[];
}

// Hub configurations by year - designed for crossing paths and visual drama
// Hub cities radiate to multiple destinations simultaneously
export const HUBS_2024: HubConfig[] = [
  { hubIndex: 0, spokes: [2, 7, 8] },      // NYC → London, Austin, Chicago
  { hubIndex: 2, spokes: [3, 9] },          // London → Berlin, Amsterdam
  { hubIndex: 3, spokes: [4] },             // Berlin → Tokyo
  { hubIndex: 4, spokes: [5] },             // Tokyo → Sydney
  { hubIndex: 1, spokes: [6, 7] },          // LA → São Paulo, Austin
];

export const HUBS_2025: HubConfig[] = [
  { hubIndex: 0, spokes: [2, 10, 6] },      // NYC → London, Paris, São Paulo
  { hubIndex: 2, spokes: [3, 11, 10] },     // London → Berlin, Barcelona, Paris
  { hubIndex: 4, spokes: [12, 5, 14] },     // Tokyo → Seoul, Sydney, Melbourne
  { hubIndex: 1, spokes: [6, 13] },         // LA → São Paulo, Buenos Aires
  { hubIndex: 11, spokes: [3] },            // Barcelona → Berlin
];

export const HUBS_2026: HubConfig[] = [
  { hubIndex: 0, spokes: [2, 10, 16] },     // NYC → London, Paris, Toronto
  { hubIndex: 2, spokes: [3, 11, 17] },     // London → Berlin, Barcelona, Ibiza
  { hubIndex: 4, spokes: [12, 18, 19] },    // Tokyo → Seoul, Bangkok, Singapore
  { hubIndex: 19, spokes: [5, 14] },        // Singapore → Sydney, Melbourne
  { hubIndex: 1, spokes: [15, 21, 6] },     // LA → SF, Mexico City, São Paulo
  { hubIndex: 6, spokes: [13, 20] },        // São Paulo → Buenos Aires, Cape Town
];

export const HUBS_ALL: HubConfig[] = [
  { hubIndex: 0, spokes: [2, 10, 16, 6] },  // NYC hub (major)
  { hubIndex: 2, spokes: [3, 11, 17, 10] }, // London hub (major)
  { hubIndex: 4, spokes: [12, 18, 19, 5] }, // Tokyo hub (major)
  { hubIndex: 1, spokes: [15, 21, 6, 13] }, // LA hub (major)
  { hubIndex: 6, spokes: [13, 20] },        // São Paulo secondary
  { hubIndex: 19, spokes: [14, 18] },       // Singapore secondary
];

// Legacy journey sequences (kept for backwards compatibility)
export const JOURNEY_2024 = [0, 2, 3, 9, 4, 5, 6, 7, 8, 1];
export const JOURNEY_2025 = [0, 10, 11, 3, 12, 4, 14, 5, 6, 13, 1, 2];
export const JOURNEY_2026 = [0, 16, 2, 10, 11, 17, 3, 12, 4, 18, 19, 5, 14, 20, 6, 13, 21, 15, 1];
