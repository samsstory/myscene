import { useEffect, useRef, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import {
  generateArcPath,
  createMultiArcGeoJSON,
  ARC_DURATION,
  ARC_DELAY,
  HOLD_DURATION,
  FADE_DURATION,
  JOURNEY_2024,
  JOURNEY_2025,
  JOURNEY_2026,
  JOURNEY_ALL,
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

const LandingGlobe = ({ selectedYear }: LandingGlobeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const animationRef = useRef<number | null>(null);
  const isUserInteractingRef = useRef(false);
  const resumeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Arc animation refs
  const arcAnimationRef = useRef<number | null>(null);
  const arcStateRef = useRef<{
    journeyIndex: number;
    arcProgress: number;
    phase: 'drawing' | 'holding' | 'fading';
    startTime: number;
    allArcs: [number, number][][];
  }>({
    journeyIndex: 0,
    arcProgress: 0,
    phase: 'drawing',
    startTime: 0,
    allArcs: [],
  });

  const filteredMarkers = useMemo(() => {
    if (selectedYear === 'all') return CITY_MARKERS;
    return CITY_MARKERS.filter(m => m.years.includes(selectedYear as number));
  }, [selectedYear]);

  // Get the journey sequence based on year (now as pairs: [from, to, from, to, ...])
  const journeyPairs = useMemo((): number[] => {
    if (selectedYear === 'all') return JOURNEY_ALL;
    switch (selectedYear) {
      case 2024: return JOURNEY_2024;
      case 2025: return JOURNEY_2025;
      case 2026: return JOURNEY_2026;
      default: return JOURNEY_2024;
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

  // Generate all arc paths from journey pairs
  const generateJourneyArcs = useCallback((pairs: number[]): [number, number][][] => {
    const arcs: [number, number][][] = [];
    // Process pairs: [from1, to1, from2, to2, ...]
    for (let i = 0; i < pairs.length - 1; i += 2) {
      const startCity = CITY_MARKERS[pairs[i]];
      const endCity = CITY_MARKERS[pairs[i + 1]];
      if (startCity && endCity) {
        const arc = generateArcPath(startCity.coordinates, endCity.coordinates, 50);
        arcs.push(arc);
      }
    }
    return arcs;
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
    
    const allArcs = generateJourneyArcs(journeyPairs);
    arcStateRef.current = {
      journeyIndex: 0,
      arcProgress: 0,
      phase: 'drawing',
      startTime: performance.now(),
      allArcs,
    };

    const animate = (currentTime: number) => {
      if (!mapRef.current) return;
      
      const state = arcStateRef.current;
      const elapsed = currentTime - state.startTime;
      
      if (state.phase === 'drawing') {
        // Calculate which arc we're on and its progress
        const totalArcTime = ARC_DURATION + ARC_DELAY;
        const currentArcIndex = Math.floor(elapsed / totalArcTime);
        const arcElapsed = elapsed % totalArcTime;
        const arcProgress = Math.min(arcElapsed / ARC_DURATION, 1);
        
        if (currentArcIndex >= state.allArcs.length) {
          // All arcs drawn, switch to holding phase
          state.phase = 'holding';
          state.startTime = currentTime;
        } else {
          state.journeyIndex = currentArcIndex;
          state.arcProgress = arcProgress;
          
          // Build the visible arcs - all completed arcs plus current progress
          const visibleArcs: [number, number][][] = [];
          
          // Add all completed arcs
          for (let i = 0; i < currentArcIndex; i++) {
            visibleArcs.push(state.allArcs[i]);
          }
          
          // Add current arc progress with safety checks
          const currentArc = state.allArcs[currentArcIndex];
          if (currentArc && currentArc.length > 0) {
            if (arcElapsed <= ARC_DURATION) {
              const pointsToShow = Math.max(1, Math.ceil(arcProgress * currentArc.length));
              visibleArcs.push(currentArc.slice(0, pointsToShow));
            } else {
              visibleArcs.push(currentArc);
            }
          }
          
          // Update the map source
          const source = mapRef.current.getSource("journey-arcs") as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData(createMultiArcGeoJSON(visibleArcs));
          }
        }
      } else if (state.phase === 'holding') {
        // Show all arcs during hold
        const source = mapRef.current.getSource("journey-arcs") as mapboxgl.GeoJSONSource;
        if (source) {
          source.setData(createMultiArcGeoJSON(state.allArcs));
        }
        
        if (elapsed > HOLD_DURATION) {
          state.phase = 'fading';
          state.startTime = currentTime;
        }
      } else if (state.phase === 'fading') {
        // Update opacity for fade effect
        const fadeProgress = Math.min(elapsed / FADE_DURATION, 1);
        const opacity = 1 - fadeProgress;
        
        if (mapRef.current.getLayer("arc-trail")) {
          mapRef.current.setPaintProperty("arc-trail", "line-opacity", 0.4 * opacity);
        }
        if (mapRef.current.getLayer("arc-head")) {
          mapRef.current.setPaintProperty("arc-head", "line-opacity", 0.9 * opacity);
        }
        
        if (fadeProgress >= 1) {
          // Reset and restart
          if (mapRef.current.getLayer("arc-trail")) {
            mapRef.current.setPaintProperty("arc-trail", "line-opacity", 0.4);
          }
          if (mapRef.current.getLayer("arc-head")) {
            mapRef.current.setPaintProperty("arc-head", "line-opacity", 0.9);
          }
          
          const source = mapRef.current.getSource("journey-arcs") as mapboxgl.GeoJSONSource;
          if (source) {
            source.setData(createMultiArcGeoJSON([]));
          }
          
          state.journeyIndex = 0;
          state.arcProgress = 0;
          state.phase = 'drawing';
          state.startTime = currentTime;
        }
      }
      
      arcAnimationRef.current = requestAnimationFrame(animate);
    };
    
    arcAnimationRef.current = requestAnimationFrame(animate);
  }, [journeyPairs, generateJourneyArcs, stopArcAnimation]);

  const startAutoRotation = useCallback(() => {
    if (!mapRef.current || isUserInteractingRef.current) return;
    
    const rotateGlobe = () => {
      if (!mapRef.current || isUserInteractingRef.current) {
        animationRef.current = null;
        return;
      }
      
      const center = mapRef.current.getCenter();
      center.lng -= 0.12;
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
        color: "hsl(222, 47%, 11%)",
        "high-color": "hsl(222, 47%, 11%)",
        "horizon-blend": 0.02,
        "space-color": "hsl(222, 47%, 6%)",
        "star-intensity": 0.12,
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
