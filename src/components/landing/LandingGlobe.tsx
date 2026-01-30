import { useEffect, useRef, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  generateArcPath,
  createMultiArcGeoJSON,
  isArcVisible,
  ARC_DURATION,
  HUB_DELAY,
  HOLD_DURATION,
  FADE_DURATION,
  HubConfig,
  HUBS_2024,
  HUBS_2025,
  HUBS_2026,
  HUBS_ALL,
} from "@/lib/globe-arc-utils";

const MAPBOX_TOKEN = "pk.eyJ1Ijoic2FtdWVsd2hpdGUxMjMxIiwiYSI6ImNtaDRjdndoNTExOGoyanBxbXBvZW85ZnoifQ.Dday-uhaPP_gF_s0E3xy2Q";

// City markers with year data for progressive growth visualization
export const CITY_MARKERS = [
  // === CORE CITIES (appear in all years) ===
  { coordinates: [-73.99, 40.73] as [number, number], count: 4, years: [2024, 2025, 2026], country: "US" },   // 0: New York
  { coordinates: [-118.24, 34.05] as [number, number], count: 3, years: [2024, 2025, 2026], country: "US" },  // 1: Los Angeles
  { coordinates: [-0.12, 51.51] as [number, number], count: 3, years: [2024, 2025, 2026], country: "UK" },    // 2: London
  { coordinates: [13.40, 52.52] as [number, number], count: 2, years: [2024, 2025, 2026], country: "DE" },    // 3: Berlin
  { coordinates: [139.69, 35.69] as [number, number], count: 2, years: [2024, 2025, 2026], country: "JP" },   // 4: Tokyo
  { coordinates: [151.21, -33.87] as [number, number], count: 2, years: [2024, 2025, 2026], country: "AU" },  // 5: Sydney
  { coordinates: [-46.63, -23.55] as [number, number], count: 2, years: [2024, 2025, 2026], country: "BR" },  // 6: São Paulo
  
  // === 2024 ONLY ===
  { coordinates: [-97.74, 30.27] as [number, number], count: 2, years: [2024], country: "US" },               // 7: Austin
  { coordinates: [-87.63, 41.88] as [number, number], count: 1, years: [2024], country: "US" },               // 8: Chicago
  { coordinates: [4.90, 52.37] as [number, number], count: 1, years: [2024], country: "NL" },                 // 9: Amsterdam
  
  // === 2025+ (new in 2025) ===
  { coordinates: [2.35, 48.85] as [number, number], count: 2, years: [2025, 2026], country: "FR" },           // 10: Paris
  { coordinates: [2.17, 41.39] as [number, number], count: 2, years: [2025, 2026], country: "ES" },           // 11: Barcelona
  { coordinates: [126.98, 37.57] as [number, number], count: 1, years: [2025, 2026], country: "KR" },         // 12: Seoul
  { coordinates: [-58.38, -34.60] as [number, number], count: 1, years: [2025, 2026], country: "AR" },        // 13: Buenos Aires
  { coordinates: [144.96, -37.81] as [number, number], count: 1, years: [2025, 2026], country: "AU" },        // 14: Melbourne
  
  // === 2026 ONLY (new in 2026) ===
  { coordinates: [-122.42, 37.77] as [number, number], count: 2, years: [2026], country: "US" },              // 15: San Francisco
  { coordinates: [-79.38, 43.65] as [number, number], count: 1, years: [2026], country: "CA" },               // 16: Toronto
  { coordinates: [1.40, 38.91] as [number, number], count: 3, years: [2026], country: "ES" },                 // 17: Ibiza
  { coordinates: [100.50, 13.76] as [number, number], count: 1, years: [2026], country: "TH" },               // 18: Bangkok
  { coordinates: [103.82, 1.35] as [number, number], count: 1, years: [2026], country: "SG" },                // 19: Singapore
  { coordinates: [18.42, -33.93] as [number, number], count: 1, years: [2026], country: "ZA" },               // 20: Cape Town
  { coordinates: [-99.13, 19.43] as [number, number], count: 2, years: [2026], country: "MX" },               // 21: Mexico City
];

interface LandingGlobeProps {
  selectedYear: number | 'all';
}

interface ArcState {
  currentHubIndex: number;
  phase: 'drawing' | 'holding' | 'fading' | 'waiting';
  startTime: number;
  visibleArcs: [number, number][][];
  completedArcs: [number, number][][];
}

const LandingGlobe = ({ selectedYear }: LandingGlobeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const animationRef = useRef<number | null>(null);
  const isUserInteractingRef = useRef(false);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Arc animation refs
  const arcAnimationRef = useRef<number | null>(null);
  const arcStateRef = useRef<ArcState>({
    currentHubIndex: 0,
    phase: 'waiting',
    startTime: 0,
    visibleArcs: [],
    completedArcs: [],
  });

  const filteredMarkers = useMemo(() => {
    if (selectedYear === 'all') return CITY_MARKERS;
    return CITY_MARKERS.filter(m => m.years.includes(selectedYear as number));
  }, [selectedYear]);

  const hubConfigs = useMemo((): HubConfig[] => {
    if (selectedYear === 'all') return HUBS_ALL;
    switch (selectedYear) {
      case 2024: return HUBS_2024;
      case 2025: return HUBS_2025;
      case 2026: return HUBS_2026;
      default: return HUBS_2024;
    }
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

  // Generate arcs for a hub burst (hub -> all spokes simultaneously)
  const generateHubArcs = useCallback((hub: HubConfig): [number, number][][] => {
    const hubCity = CITY_MARKERS[hub.hubIndex];
    if (!hubCity) return [];
    
    return hub.spokes
      .map(spokeIndex => {
        const spokeCity = CITY_MARKERS[spokeIndex];
        if (!spokeCity) return null;
        return generateArcPath(hubCity.coordinates, spokeCity.coordinates, 40);
      })
      .filter((arc): arc is [number, number][] => arc !== null);
  }, []);

  // Stop arc animation
  const stopArcAnimation = useCallback(() => {
    if (arcAnimationRef.current) {
      cancelAnimationFrame(arcAnimationRef.current);
      arcAnimationRef.current = null;
    }
  }, []);

  // Start/restart arc animation
  const startArcAnimation = useCallback(() => {
    if (!mapRef.current) return;
    
    stopArcAnimation();
    
    arcStateRef.current = {
      currentHubIndex: 0,
      phase: 'waiting',
      startTime: performance.now(),
      visibleArcs: [],
      completedArcs: [],
    };

    const animate = (currentTime: number) => {
      if (!mapRef.current) return;
      
      const map = mapRef.current;
      const state = arcStateRef.current;
      const elapsed = currentTime - state.startTime;
      const cameraCenter = map.getCenter();

      // Find the next visible hub
      const findNextVisibleHub = (startIndex: number): { hub: HubConfig; index: number } | null => {
        for (let i = 0; i < hubConfigs.length; i++) {
          const idx = (startIndex + i) % hubConfigs.length;
          const hub = hubConfigs[idx];
          const hubCity = CITY_MARKERS[hub.hubIndex];
          
          // Check if hub and at least one spoke are visible
          const visibleSpokes = hub.spokes.filter(spokeIdx => {
            const spokeCity = CITY_MARKERS[spokeIdx];
            if (!spokeCity) return false;
            return isArcVisible(hubCity.coordinates, spokeCity.coordinates, cameraCenter, -0.2);
          });
          
          if (visibleSpokes.length > 0) {
            return { hub: { ...hub, spokes: visibleSpokes }, index: idx };
          }
        }
        return null;
      };

      if (state.phase === 'waiting') {
        // Look for a visible hub to draw
        const visibleHub = findNextVisibleHub(state.currentHubIndex);
        
        if (visibleHub) {
          // Start drawing this hub's arcs
          state.currentHubIndex = visibleHub.index;
          state.visibleArcs = generateHubArcs(visibleHub.hub);
          state.phase = 'drawing';
          state.startTime = currentTime;
        }
        // Keep waiting if nothing visible
        
      } else if (state.phase === 'drawing') {
        const progress = Math.min(elapsed / ARC_DURATION, 1);
        
        // Build partial arcs based on progress
        const partialArcs = state.visibleArcs.map(arc => {
          const pointsToShow = Math.max(1, Math.ceil(progress * arc.length));
          return arc.slice(0, pointsToShow);
        });
        
        // Combine with completed arcs from previous hubs
        const allArcs = [...state.completedArcs, ...partialArcs];
        
        const source = map.getSource("journey-arcs") as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData(createMultiArcGeoJSON(allArcs));
        }
        
        if (progress >= 1) {
          // Done drawing this hub, add to completed and hold briefly
          state.completedArcs = [...state.completedArcs, ...state.visibleArcs];
          state.phase = 'holding';
          state.startTime = currentTime;
        }
        
      } else if (state.phase === 'holding') {
        // Show all completed arcs
        const source = map.getSource("journey-arcs") as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData(createMultiArcGeoJSON(state.completedArcs));
        }
        
        if (elapsed > HOLD_DURATION) {
          // Move to next hub or fade out
          const nextHubIndex = (state.currentHubIndex + 1) % hubConfigs.length;
          
          if (nextHubIndex === 0) {
            // Completed full cycle, fade out
            state.phase = 'fading';
            state.startTime = currentTime;
          } else {
            // Move to next hub
            state.currentHubIndex = nextHubIndex;
            state.phase = 'waiting';
            state.startTime = currentTime;
          }
        }
        
      } else if (state.phase === 'fading') {
        const fadeProgress = Math.min(elapsed / FADE_DURATION, 1);
        const opacity = 1 - fadeProgress;
        
        if (map.getLayer("arc-trail")) {
          map.setPaintProperty("arc-trail", "line-opacity", 0.4 * opacity);
        }
        if (map.getLayer("arc-head")) {
          map.setPaintProperty("arc-head", "line-opacity", 0.9 * opacity);
        }
        
        if (fadeProgress >= 1) {
          // Reset everything
          if (map.getLayer("arc-trail")) {
            map.setPaintProperty("arc-trail", "line-opacity", 0.4);
          }
          if (map.getLayer("arc-head")) {
            map.setPaintProperty("arc-head", "line-opacity", 0.9);
          }
          
          const source = map.getSource("journey-arcs") as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData(createMultiArcGeoJSON([]));
          }
          
          state.currentHubIndex = 0;
          state.phase = 'waiting';
          state.startTime = currentTime + HUB_DELAY; // Brief pause before restart
          state.visibleArcs = [];
          state.completedArcs = [];
        }
      }
      
      arcAnimationRef.current = requestAnimationFrame(animate);
    };
    
    arcAnimationRef.current = requestAnimationFrame(animate);
  }, [hubConfigs, generateHubArcs, stopArcAnimation]);

  const startAutoRotation = useCallback(() => {
    if (!mapRef.current || isUserInteractingRef.current) return;
    
    const rotateGlobe = () => {
      if (!mapRef.current || isUserInteractingRef.current) {
        animationRef.current = null;
        return;
      }
      
      const center = mapRef.current.getCenter();
      center.lng -= 0.12; // Slightly slower rotation
      mapRef.current.setCenter(center);
      
      animationRef.current = requestAnimationFrame(rotateGlobe);
    };
    
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
    }
    animationRef.current = requestAnimationFrame(rotateGlobe);
  }, []);

  const stopAutoRotation = useCallback(() => {
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }
  }, []);

  const handleInteractionStart = useCallback(() => {
    isUserInteractingRef.current = true;
    stopAutoRotation();
    
    if (resumeTimeoutRef.current) {
      clearTimeout(resumeTimeoutRef.current);
      resumeTimeoutRef.current = null;
    }
  }, [stopAutoRotation]);

  const handleInteractionEnd = useCallback(() => {
    isUserInteractingRef.current = false;
    startAutoRotation();
  }, [startAutoRotation]);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      projection: "globe",
      center: [-40, 25],
      zoom: 0.9,
      interactive: true,
      attributionControl: false,
      dragPan: false,
      scrollZoom: false,
      doubleClickZoom: false,
      touchZoomRotate: false,
      keyboard: false,
      dragRotate: true,
    });

    mapRef.current = map;

    map.touchZoomRotate.enableRotation();

    map.on("mousedown", handleInteractionStart);
    map.on("touchstart", handleInteractionStart);
    map.on("mouseup", handleInteractionEnd);
    map.on("touchend", handleInteractionEnd);
    map.on("dragend", handleInteractionEnd);

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

      map.addSource("journey-arcs", {
        type: "geojson",
        data: createMultiArcGeoJSON([]),
      });

      // Arc trail layer (thicker, lower opacity glow)
      map.addLayer({
        id: "arc-trail",
        type: "line",
        source: "journey-arcs",
        paint: {
          "line-color": "hsl(189, 94%, 55%)",
          "line-width": 3,
          "line-opacity": 0.4,
          "line-blur": 2,
        },
      });

      // Arc head layer (thinner, sharper leading edge)
      map.addLayer({
        id: "arc-head",
        type: "line",
        source: "journey-arcs",
        paint: {
          "line-color": "hsl(189, 94%, 65%)",
          "line-width": 1.5,
          "line-opacity": 0.9,
          "line-blur": 0,
        },
      });

      // Outer glow layer for cities
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

      // Inner solid dot for cities
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

      startAutoRotation();
      startArcAnimation();
    });

    return () => {
      stopAutoRotation();
      stopArcAnimation();
      if (resumeTimeoutRef.current) {
        clearTimeout(resumeTimeoutRef.current);
      }
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Update markers and restart arc animation when year changes
  useEffect(() => {
    if (!mapRef.current) return;
    
    const source = mapRef.current.getSource("city-markers") as mapboxgl.GeoJSONSource;
    if (source) {
      source.setData(createGeoJSON(filteredMarkers));
    }
    
    startArcAnimation();
  }, [filteredMarkers, startArcAnimation]);

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full cursor-grab active:cursor-grabbing [&_.mapboxgl-ctrl-logo]:hidden [&_.mapboxgl-ctrl-attrib]:hidden"
      style={{ background: "hsl(222, 47%, 6%)" }}
    />
  );
};

export default LandingGlobe;
