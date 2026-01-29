import { useEffect, useRef, useMemo } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1Ijoic2FtdWVsd2hpdGUxMjMxIiwiYSI6ImNtaDRjdndoNTExOGoyanBxbXBvZW85ZnoifQ.Dday-uhaPP_gF_s0E3xy2Q";

// City markers with year data for progressive growth visualization
export const CITY_MARKERS = [
  // === CORE CITIES (appear in all years) ===
  { coordinates: [-73.99, 40.73], count: 4, years: [2024, 2025, 2026], country: "US" },   // New York
  { coordinates: [-118.24, 34.05], count: 3, years: [2024, 2025, 2026], country: "US" },  // Los Angeles
  { coordinates: [-0.12, 51.51], count: 3, years: [2024, 2025, 2026], country: "UK" },    // London
  { coordinates: [13.40, 52.52], count: 2, years: [2024, 2025, 2026], country: "DE" },    // Berlin
  { coordinates: [139.69, 35.69], count: 2, years: [2024, 2025, 2026], country: "JP" },   // Tokyo
  { coordinates: [151.21, -33.87], count: 2, years: [2024, 2025, 2026], country: "AU" },  // Sydney
  { coordinates: [-46.63, -23.55], count: 2, years: [2024, 2025, 2026], country: "BR" },  // São Paulo
  
  // === 2024 ONLY ===
  { coordinates: [-97.74, 30.27], count: 2, years: [2024], country: "US" },               // Austin
  { coordinates: [-87.63, 41.88], count: 1, years: [2024], country: "US" },               // Chicago
  { coordinates: [4.90, 52.37], count: 1, years: [2024], country: "NL" },                 // Amsterdam
  
  // === 2025+ (new in 2025) ===
  { coordinates: [2.35, 48.85], count: 2, years: [2025, 2026], country: "FR" },           // Paris
  { coordinates: [2.17, 41.39], count: 2, years: [2025, 2026], country: "ES" },           // Barcelona
  { coordinates: [126.98, 37.57], count: 1, years: [2025, 2026], country: "KR" },         // Seoul
  { coordinates: [-58.38, -34.60], count: 1, years: [2025, 2026], country: "AR" },        // Buenos Aires
  { coordinates: [144.96, -37.81], count: 1, years: [2025, 2026], country: "AU" },        // Melbourne
  
  // === 2026 ONLY (new in 2026) ===
  { coordinates: [-122.42, 37.77], count: 2, years: [2026], country: "US" },              // San Francisco
  { coordinates: [-79.38, 43.65], count: 1, years: [2026], country: "CA" },               // Toronto
  { coordinates: [1.40, 38.91], count: 3, years: [2026], country: "ES" },                 // Ibiza
  { coordinates: [100.50, 13.76], count: 1, years: [2026], country: "TH" },               // Bangkok
  { coordinates: [103.82, 1.35], count: 1, years: [2026], country: "SG" },                // Singapore
  { coordinates: [18.42, -33.93], count: 1, years: [2026], country: "ZA" },               // Cape Town
  { coordinates: [-99.13, 19.43], count: 2, years: [2026], country: "MX" },               // Mexico City
];

interface LandingGlobeProps {
  selectedYear: number | 'all';
}

const LandingGlobe = ({ selectedYear }: LandingGlobeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  const filteredMarkers = useMemo(() => {
    if (selectedYear === 'all') return CITY_MARKERS;
    return CITY_MARKERS.filter(m => m.years.includes(selectedYear as number));
  }, [selectedYear]);

  const createGeoJSON = (markers: typeof CITY_MARKERS): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: markers.map((city, index) => ({
      type: "Feature" as const,
      id: index,
      geometry: {
        type: "Point" as const,
        coordinates: city.coordinates,
      },
      properties: {
        count: city.count,
      },
    })),
  });

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      projection: "globe",
      center: [-40, 25],
      zoom: 0.9,
      interactive: false,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("style.load", () => {
      map.setFog({
        color: "hsl(222, 47%, 8%)",
        "high-color": "hsl(222, 47%, 12%)",
        "horizon-blend": 0.08,
        "space-color": "hsl(222, 47%, 4%)",
        "star-intensity": 0.15,
      });

      map.addSource("city-markers", {
        type: "geojson",
        data: createGeoJSON(filteredMarkers),
      });

      // Outer glow layer
      map.addLayer({
        id: "city-glow",
        type: "circle",
        source: "city-markers",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "count"],
            1, 12,
            15, 24,
          ],
          "circle-color": "hsl(189, 94%, 55%)",
          "circle-opacity": 0.3,
          "circle-blur": 0.8,
        },
      });

      // Inner solid dot
      map.addLayer({
        id: "city-dots",
        type: "circle",
        source: "city-markers",
        paint: {
          "circle-radius": [
            "interpolate",
            ["linear"],
            ["get", "count"],
            1, 4,
            15, 8,
          ],
          "circle-color": "hsl(189, 94%, 55%)",
          "circle-opacity": 0.9,
          "circle-blur": 0.1,
        },
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers when year changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    const source = mapRef.current.getSource("city-markers") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(createGeoJSON(filteredMarkers));
    }
  }, [filteredMarkers]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ background: "hsl(222, 47%, 6%)" }}
    />
  );
};

export default LandingGlobe;
