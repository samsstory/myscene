import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = "pk.eyJ1Ijoic2FtdWVsd2hpdGUxMjMxIiwiYSI6ImNtaDRjdndoNTExOGoyanBxbXBvZW85ZnoifQ.Dday-uhaPP_gF_s0E3xy2Q";

// Static city markers to display on the globe
const CITY_MARKERS = [
  { coordinates: [-118.24, 34.05], count: 12 },  // Los Angeles
  { coordinates: [-122.42, 37.77], count: 8 },   // San Francisco
  { coordinates: [-73.99, 40.73], count: 15 },   // New York
  { coordinates: [-0.12, 51.51], count: 6 },     // London
  { coordinates: [4.90, 52.37], count: 3 },      // Amsterdam
  { coordinates: [2.35, 48.85], count: 2 },      // Paris
  { coordinates: [139.69, 35.69], count: 1 },    // Tokyo
  { coordinates: [-43.17, -22.91], count: 2 },   // Rio de Janeiro
  { coordinates: [151.21, -33.87], count: 1 },   // Sydney
];

const LandingGlobe = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      projection: "globe",
      center: [-40, 25], // Atlantic-centered view showing Americas and Europe
      zoom: 1.3,
      interactive: false,
      attributionControl: false,
    });

    mapRef.current = map;

    map.on("style.load", () => {
      // Enable 3D atmosphere/fog effect
      map.setFog({
        color: "hsl(222, 47%, 8%)",
        "high-color": "hsl(222, 47%, 12%)",
        "horizon-blend": 0.08,
        "space-color": "hsl(222, 47%, 4%)",
        "star-intensity": 0.15,
      });

      // Add GeoJSON source for city markers
      const geojsonData: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: CITY_MARKERS.map((city, index) => ({
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
      };

      map.addSource("city-markers", {
        type: "geojson",
        data: geojsonData,
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

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ background: "hsl(222, 47%, 6%)" }}
    />
  );
};

export default LandingGlobe;
