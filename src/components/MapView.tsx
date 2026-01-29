import { useEffect, useRef, useState, useMemo, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from "@/components/ui/drawer";
import { Edit, MapPin, Minus, Globe, Camera } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MapRightPanel from "./map/MapRightPanel";
import MapYearToggle from "./map/MapYearToggle";
import MapStatsCard from "./map/MapStatsCard";

interface Show {
  id: string;
  artists: Array<{ name: string; isHeadliner: boolean }>;
  venue: { name: string; location: string };
  date: string;
  rating: number;
  latitude?: number;
  longitude?: number;
  photo_url?: string | null;
}

interface MapViewProps {
  shows: Show[];
  onEditShow: (show: Show) => void;
  onAddFromPhotos?: () => void;
  onAddSingleShow?: () => void;
}

const MAPBOX_TOKEN = "pk.eyJ1Ijoic2FtdWVsd2hpdGUxMjMxIiwiYSI6ImNtaDRjdndoNTExOGoyanBxbXBvZW85ZnoifQ.Dday-uhaPP_gF_s0E3xy2Q";

const MapView = ({ shows, onEditShow, onAddFromPhotos, onAddSingleShow }: MapViewProps) => {
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
  const [showsWithoutLocation, setShowsWithoutLocation] = useState<Show[]>([]);
  const [homeCoordinates, setHomeCoordinates] = useState<[number, number] | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [isLocationCardMinimized, setIsLocationCardMinimized] = useState(false);
  const [selectedYear, setSelectedYear] = useState<string>("all");

  // Extract unique years from shows and sort descending
  const availableYears = useMemo(() => {
    const years = new Set<string>();
    shows.forEach(show => {
      if (show.date) {
        const year = new Date(show.date).getFullYear().toString();
        years.add(year);
      }
    });
    const sortedYears = Array.from(years).sort((a, b) => parseInt(b) - parseInt(a));
    return [...sortedYears, "all"];
  }, [shows]);

  // Filter shows by selected year
  const filteredShows = useMemo(() => {
    if (selectedYear === "all") return shows;
    return shows.filter(show => {
      if (!show.date) return false;
      return new Date(show.date).getFullYear().toString() === selectedYear;
    });
  }, [shows, selectedYear]);

  // Shows with valid coordinates for the map
  const mappableShows = useMemo(() => {
    return filteredShows.filter(show => show.latitude && show.longitude);
  }, [filteredShows]);

  // Extract country from location string
  const getCountryFromLocation = (location: string): string => {
    const parts = location.split(',').map(p => p.trim());
    const lastPart = parts[parts.length - 1];
    if (['USA', 'US', 'United States', 'U.S.', 'U.S.A.'].includes(lastPart)) {
      return 'United States';
    }
    const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    for (const part of parts) {
      const cleanedPart = part.replace(/\s*\d+\s*$/, '').trim();
      if (usStates.includes(cleanedPart)) {
        return 'United States';
      }
    }
    if (parts.length >= 2) {
      return lastPart;
    }
    return 'United States';
  };

  // Extract city from location string
  const getCityFromLocation = (location: string): string => {
    const parts = location.split(',').map(p => p.trim());
    if (parts.length >= 3 && /^\d/.test(parts[0])) {
      return `${parts[1]}, ${parts[2].replace(/\s*\d+\s*$/, '').trim()}`;
    }
    if (parts.length >= 2) {
      const state = parts[1].replace(/\s*\d+\s*$/, '').trim();
      return `${parts[0]}, ${state}`;
    }
    return parts[0];
  };

  // Fetch user's home city coordinates
  useEffect(() => {
    const fetchHomeCoordinates = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('home_city, home_latitude, home_longitude')
          .eq('id', user.id)
          .maybeSingle();

        if (profile?.home_latitude && profile?.home_longitude) {
          setHomeCoordinates([profile.home_longitude, profile.home_latitude]);
        }
      } catch (error) {
        console.error('Error fetching home coordinates:', error);
      }
    };

    fetchHomeCoordinates();
  }, []);

  // Filter shows without location
  useEffect(() => {
    const showsWithout = shows.filter(show => {
      if (show.latitude && show.longitude) return false;
      if (!show.venue.location) return true;
      const country = getCountryFromLocation(show.venue.location);
      return !country || country === 'Unknown';
    });
    setShowsWithoutLocation(showsWithout);
  }, [shows]);

  const handleFixMissingLocations = async () => {
    try {
      setIsBackfilling(true);
      const { data, error } = await supabase.functions.invoke('backfill-venue-coordinates', {
        body: {}
      });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to fix missing locations. Please try again.",
          variant: "destructive"
        });
        return;
      }
      
      if (data.results.success > 0) {
        toast({
          title: "Success!",
          description: `Fixed ${data.results.success} show${data.results.success > 1 ? 's' : ''}. Refreshing map...`
        });
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        toast({
          title: "No Changes",
          description: "No shows were able to be geocoded. Please add location details manually.",
          variant: "default"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fix missing locations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBackfilling(false);
    }
  };

  // Calculate stats based on filtered shows
  const mapStats = useMemo(() => {
    const countries = new Set<string>();
    const cities = new Set<string>();
    const venues = new Set<string>();

    filteredShows.forEach(show => {
      if (show.venue.location) {
        countries.add(getCountryFromLocation(show.venue.location));
        cities.add(getCityFromLocation(show.venue.location));
      }
      venues.add(show.venue.name);
    });

    return {
      totalShows: filteredShows.length,
      totalCountries: countries.size,
      totalCities: cities.size,
      totalVenues: venues.size,
    };
  }, [filteredShows]);

  // Create a photo marker element
  const createPhotoMarker = useCallback((show: Show): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'photo-marker';
    
    if (show.photo_url) {
      // Photo thumbnail marker
      el.innerHTML = `
        <div class="photo-marker-container">
          <img src="${show.photo_url}" alt="" class="photo-marker-img" />
          <div class="photo-marker-glow"></div>
        </div>
      `;
    } else {
      // Fallback dot marker with artist initial
      const initial = show.artists[0]?.name?.charAt(0) || '♪';
      el.innerHTML = `
        <div class="dot-marker-container">
          <span class="dot-marker-initial">${initial}</span>
          <div class="dot-marker-glow"></div>
        </div>
      `;
    }
    
    return el;
  }, []);

  // Create a cluster marker element
  const createClusterMarker = useCallback((count: number): HTMLElement => {
    const el = document.createElement('div');
    el.className = 'cluster-marker';
    el.innerHTML = `
      <div class="cluster-marker-container">
        <span class="cluster-marker-count">${count}</span>
        <div class="cluster-marker-glow"></div>
      </div>
    `;
    return el;
  }, []);

  // Initialize map with clustering
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const defaultCenter: [number, number] = homeCoordinates || [-98.5795, 39.8283];
    const defaultZoom = homeCoordinates ? 4 : 2;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: defaultCenter,
      zoom: defaultZoom,
      dragPan: {
        linearity: 0.25,
        easing: (t: number) => 1 - Math.pow(1 - t, 3),
        deceleration: 3000,
        maxSpeed: 1800
      }
    });

    map.current.on('load', () => {
      if (!map.current) return;

      // Add GeoJSON source with clustering
      map.current.addSource('shows', {
        type: 'geojson',
        data: {
          type: 'FeatureCollection',
          features: []
        },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 60
      });

      // Cluster circles (background glow)
      map.current.addLayer({
        id: 'cluster-glow',
        type: 'circle',
        source: 'shows',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'hsl(189, 94%, 55%)',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            30, 5,
            40, 10,
            50, 25,
            60
          ],
          'circle-opacity': 0.25,
          'circle-blur': 0.8
        }
      });

      // Cluster circles (main)
      map.current.addLayer({
        id: 'clusters',
        type: 'circle',
        source: 'shows',
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': 'hsl(189, 94%, 55%)',
          'circle-radius': [
            'step',
            ['get', 'point_count'],
            20, 5,
            28, 10,
            36, 25,
            44
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': 'rgba(255, 255, 255, 0.4)'
        }
      });

      // Cluster count labels
      map.current.addLayer({
        id: 'cluster-count',
        type: 'symbol',
        source: 'shows',
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-size': 13,
          'text-allow-overlap': true
        },
        paint: {
          'text-color': '#ffffff'
        }
      });

      // Click on cluster = zoom in
      map.current.on('click', 'clusters', (e) => {
        if (!map.current) return;
        const features = map.current.queryRenderedFeatures(e.point, { layers: ['clusters'] });
        if (!features.length) return;
        
        const clusterId = features[0].properties?.cluster_id;
        const source = map.current.getSource('shows') as mapboxgl.GeoJSONSource;
        
        source.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err || !map.current) return;
          const geometry = features[0].geometry as GeoJSON.Point;
          map.current.easeTo({
            center: geometry.coordinates as [number, number],
            zoom: zoom
          });
        });
      });

      // Cursor pointer on clusters
      map.current.on('mouseenter', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'clusters', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    });

    return () => {
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];
      map.current?.remove();
      map.current = null;
    };
  }, [homeCoordinates]);

  // Update map data and create individual markers
  useEffect(() => {
    if (!map.current) return;

    const updateMap = () => {
      if (!map.current?.isStyleLoaded()) {
        map.current?.once('load', updateMap);
        return;
      }

      // Clear existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current = [];

      // Create GeoJSON for clustering
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: mappableShows.map((show, index) => ({
          type: 'Feature',
          id: index,
          properties: {
            id: show.id,
            hasPhoto: !!show.photo_url
          },
          geometry: {
            type: 'Point',
            coordinates: [show.longitude!, show.latitude!]
          }
        }))
      };

      const source = map.current?.getSource('shows') as mapboxgl.GeoJSONSource;
      if (source) {
        source.setData(geojson);
      }

      // Create custom markers for unclustered points
      const createMarkers = () => {
        if (!map.current) return;
        
        // Remove old markers
        markersRef.current.forEach(marker => marker.remove());
        markersRef.current = [];

        // Query unclustered points at current viewport
        const features = map.current.querySourceFeatures('shows', {
          filter: ['!', ['has', 'point_count']]
        });

        // Create unique markers (avoid duplicates from tile boundaries)
        const seenIds = new Set<string>();
        
        features.forEach(feature => {
          const showId = feature.properties?.id;
          if (!showId || seenIds.has(showId)) return;
          seenIds.add(showId);

          const show = mappableShows.find(s => s.id === showId);
          if (!show) return;

          const geometry = feature.geometry as GeoJSON.Point;
          const el = createPhotoMarker(show);
          
          const marker = new mapboxgl.Marker({ element: el })
            .setLngLat(geometry.coordinates as [number, number])
            .addTo(map.current!);
          
          el.addEventListener('click', () => {
            setSelectedShow(show);
          });
          
          markersRef.current.push(marker);
        });
      };

      // Create markers on source data change
      map.current?.on('sourcedata', (e) => {
        if (e.sourceId === 'shows' && e.isSourceLoaded) {
          createMarkers();
        }
      });

      // Update markers on move/zoom
      map.current?.on('moveend', createMarkers);
      map.current?.on('zoomend', createMarkers);
      
      // Initial markers
      createMarkers();

      // Fit bounds to all shows
      if (mappableShows.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        mappableShows.forEach(show => {
          bounds.extend([show.longitude!, show.latitude!]);
        });
        map.current?.fitBounds(bounds, { 
          padding: 60, 
          maxZoom: 12,
          duration: 1000 
        });
      }
    };

    updateMap();
  }, [mappableShows, createPhotoMarker]);

  // Inject CSS for custom markers
  useEffect(() => {
    const styleId = 'map-marker-styles';
    if (document.getElementById(styleId)) return;

    const style = document.createElement('style');
    style.id = styleId;
    style.textContent = `
      .photo-marker-container {
        position: relative;
        width: 48px;
        height: 48px;
        cursor: pointer;
        transition: transform 0.15s ease;
      }
      .photo-marker-container:hover {
        transform: scale(1.15);
      }
      .photo-marker-img {
        width: 100%;
        height: 100%;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid rgba(255, 255, 255, 0.8);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      }
      .photo-marker-glow {
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        background: hsl(189, 94%, 55%);
        opacity: 0.3;
        filter: blur(6px);
        z-index: -1;
      }
      .dot-marker-container {
        position: relative;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: linear-gradient(135deg, hsl(189, 94%, 55%), hsl(280, 70%, 55%));
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.6);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
        transition: transform 0.15s ease;
      }
      .dot-marker-container:hover {
        transform: scale(1.15);
      }
      .dot-marker-initial {
        color: white;
        font-weight: bold;
        font-size: 14px;
        text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
      }
      .dot-marker-glow {
        position: absolute;
        inset: -4px;
        border-radius: 50%;
        background: hsl(280, 70%, 55%);
        opacity: 0.25;
        filter: blur(6px);
        z-index: -1;
      }
      .cluster-marker-container {
        position: relative;
        width: 48px;
        height: 48px;
        border-radius: 50%;
        background: hsl(189, 94%, 55%);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        border: 2px solid rgba(255, 255, 255, 0.5);
      }
      .cluster-marker-count {
        color: white;
        font-weight: bold;
        font-size: 16px;
      }
      .cluster-marker-glow {
        position: absolute;
        inset: -6px;
        border-radius: 50%;
        background: hsl(189, 94%, 55%);
        opacity: 0.3;
        filter: blur(8px);
        z-index: -1;
      }
    `;
    document.head.appendChild(style);

    return () => {
      const existingStyle = document.getElementById(styleId);
      if (existingStyle) {
        existingStyle.remove();
      }
    };
  }, []);

  return (
    <div className="flex flex-col" style={{ height: 'calc(100vh - 220px)' }}>
      {/* Year Toggle + Stats Header */}
      {shows.length > 0 && (
        <div className="flex items-center gap-3 pb-3 shrink-0">
          <MapYearToggle
            years={availableYears}
            selectedYear={selectedYear}
            onYearChange={setSelectedYear}
          />
          <MapStatsCard
            totalShows={mapStats.totalShows}
            totalCountries={mapStats.totalCountries}
            totalCities={mapStats.totalCities}
            totalVenues={mapStats.totalVenues}
          />
        </div>
      )}

      {/* Map Container */}
      <div className="relative flex-1 min-h-0">
        <div 
          ref={mapContainer} 
          className="absolute inset-0 rounded-xl overflow-hidden [&_.mapboxgl-ctrl-logo]:hidden [&_.mapboxgl-ctrl-attrib]:hidden" 
          style={{ backgroundColor: 'hsl(222, 47%, 11%)' }}
        />

        {/* Empty state when no shows */}
        {shows.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-b from-transparent via-black/20 to-black/40 z-20 rounded-xl">
            <div className="text-center px-6 max-w-sm">
              <div className="relative mx-auto mb-6 w-24 h-24">
                <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
                <div className="absolute inset-2 rounded-full bg-primary/10 flex items-center justify-center">
                  <Globe className="h-12 w-12 text-primary/60" />
                </div>
                <div className="absolute top-0 right-2 w-2 h-2 rounded-full bg-primary/40" />
                <div className="absolute bottom-2 left-0 w-1.5 h-1.5 rounded-full bg-cyan-500/40" />
                <div className="absolute top-1/2 -right-1 w-1 h-1 rounded-full bg-amber-500/40" />
              </div>
              
              <h3 className="text-xl font-bold text-white mb-2">
                Your Show Globe is empty
              </h3>
              <p className="text-white/60 text-sm mb-6">
                Start logging shows to see them appear on your personal concert map
              </p>
              
              {onAddFromPhotos && (
                <Button 
                  onClick={onAddFromPhotos}
                  className="mb-3 w-full"
                  size="lg"
                >
                  <Camera className="h-5 w-5 mr-2" />
                  Add from Photos
                </Button>
              )}
              
              {onAddSingleShow && (
                <button
                  onClick={onAddSingleShow}
                  className="text-white/40 text-sm hover:text-white/60 transition-colors"
                >
                  or add manually
                </button>
              )}
            </div>
          </div>
        )}

        {/* Location notification badge */}
        <MapRightPanel
          showsWithoutLocation={showsWithoutLocation.length}
          isLocationCardExpanded={!isLocationCardMinimized}
          onToggleLocationCard={() => setIsLocationCardMinimized(false)}
        />

        {/* Shows without location list */}
        {showsWithoutLocation.length > 0 && !isLocationCardMinimized && (
          <Card className="absolute top-4 left-4 max-w-sm z-10 animate-fade-in">
            <CardContent className="p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Shows without location ({showsWithoutLocation.length})
                </h3>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-6 w-6"
                  onClick={() => setIsLocationCardMinimized(true)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {showsWithoutLocation.map((show) => (
                  <div
                    key={show.id}
                    className="text-sm p-2 bg-muted rounded flex items-center justify-between gap-2"
                  >
                    <div className="flex-1">
                      <div className="font-medium">
                        {show.artists.map(a => a.name).join(", ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {show.venue.name}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEditShow(show)}
                    >
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
              </div>
              
              {showsWithoutLocation.length > 0 && (
                <Button
                  onClick={handleFixMissingLocations}
                  disabled={isBackfilling}
                  className="w-full mt-4"
                  variant="default"
                >
                  {isBackfilling ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Fixing Locations...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Fix All Missing Locations
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* Selected show details - Bottom Sheet */}
      <Drawer
        open={!!selectedShow}
        onOpenChange={(open) => !open && setSelectedShow(null)}
      >
        <DrawerContent className="max-h-[60vh]">
          <DrawerHeader>
            <DrawerTitle>
              {selectedShow?.artists.map(a => a.name).join(", ")}
            </DrawerTitle>
            <DrawerDescription>
              {selectedShow?.venue.name} • {selectedShow?.date && new Date(selectedShow.date).toLocaleDateString()}
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            {selectedShow?.photo_url && (
              <img 
                src={selectedShow.photo_url} 
                alt="" 
                className="w-full h-48 object-cover rounded-lg mb-4"
              />
            )}
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={() => selectedShow && onEditShow(selectedShow)}
              >
                <Edit className="h-4 w-4 mr-2" />
                Edit Show
              </Button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default MapView;
