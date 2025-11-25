import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Edit, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Show {
  id: string;
  artists: Array<{ name: string; isHeadliner: boolean }>;
  venue: { name: string; location: string };
  date: string;
  rating: number;
  latitude?: number;
  longitude?: number;
}

interface MapViewProps {
  shows: Show[];
  onEditShow: (show: Show) => void;
}

// TODO: Replace with your actual Mapbox public token from https://mapbox.com
const MAPBOX_TOKEN = "pk.eyJ1Ijoic2FtdWVsd2hpdGUxMjMxIiwiYSI6ImNtaDRjdndoNTExOGoyanBxbXBvZW85ZnoifQ.Dday-uhaPP_gF_s0E3xy2Q";

const getRatingEmoji = (rating: number) => {
  const emojiMap: { [key: number]: string } = {
    1: "😴",
    2: "😐",
    3: "🙂",
    4: "😃",
    5: "🤩",
  };
  return emojiMap[rating] || "🎵";
};

const MapView = ({ shows, onEditShow }: MapViewProps) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<{ venueName: string; location: string; count: number; shows: Show[] } | null>(null);
  const [showsWithoutLocation, setShowsWithoutLocation] = useState<Show[]>([]);
  const [homeCoordinates, setHomeCoordinates] = useState<[number, number] | null>(null);

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
        } else if (profile?.home_city) {
          // Geocode the home city
          const coords = await geocodeLocation(profile.home_city);
          if (coords) {
            setHomeCoordinates(coords);
            // Save coordinates to profile
            await supabase
              .from('profiles')
              .update({
                home_latitude: coords[1],
                home_longitude: coords[0],
              })
              .eq('id', user.id);
          }
        }
      } catch (error) {
        console.error('Error fetching home coordinates:', error);
      }
    };

    fetchHomeCoordinates();
  }, []);

  // Geocode location using Mapbox Geocoding API
  const geocodeLocation = async (location: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(location)}.json?access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return [lng, lat];
      }
    } catch (error) {
      console.error('Error geocoding location:', error);
    }
    return null;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    const defaultCenter: [number, number] = homeCoordinates || [-98.5795, 39.8283]; // US center as fallback
    const defaultZoom = homeCoordinates ? 10 : 3;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: defaultCenter,
      zoom: defaultZoom,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
  }, [homeCoordinates]);

  // Update heat map when shows change
  useEffect(() => {
    if (!map.current) return;

    const processShows = async () => {
      const showsWithCoords: Show[] = [];
      const showsWithout: Show[] = [];
      const showsToGeocode: Show[] = [];

      shows.forEach(show => {
        if (show.latitude && show.longitude) {
          showsWithCoords.push(show);
        } else if (show.venue.location) {
          showsToGeocode.push(show);
        } else {
          showsWithout.push(show);
        }
      });

      // Geocode shows with venue location but no coordinates
      for (const show of showsToGeocode) {
        const coords = await geocodeLocation(show.venue.location);
        if (coords) {
          show.latitude = coords[1];
          show.longitude = coords[0];
          showsWithCoords.push(show);

          // Update the venue in database with coordinates
          const { data: { user } } = await supabase.auth.getUser();
          if (user) {
            const { data: venueData } = await supabase
              .from('shows')
              .select('venue_id')
              .eq('id', show.id)
              .single();

            if (venueData?.venue_id) {
              await supabase
                .from('venues')
                .update({
                  latitude: coords[1],
                  longitude: coords[0],
                })
                .eq('id', venueData.venue_id);
            }
          }
        } else {
          showsWithout.push(show);
        }
      }

      setShowsWithoutLocation(showsWithout);

      // Aggregate shows by venue (using venue name + location as unique identifier)
      const venueMap = new Map<string, { shows: Show[], coords: [number, number], venueName: string, location: string }>();
      
      showsWithCoords.forEach(show => {
        const venueKey = `${show.venue.name}|${show.venue.location}`;
        if (!venueMap.has(venueKey)) {
          venueMap.set(venueKey, { 
            shows: [show], 
            coords: [show.longitude!, show.latitude!],
            venueName: show.venue.name,
            location: show.venue.location
          });
        } else {
          venueMap.get(venueKey)!.shows.push(show);
        }
      });

      // Calculate normalized weights
      const venueCounts = Array.from(venueMap.values()).map(v => v.shows.length);
      const minShows = Math.min(...venueCounts, 1);
      const maxShows = Math.max(...venueCounts, 1);

      // Build GeoJSON for heat map with normalized weights
      const features = Array.from(venueMap.entries()).map(([venueKey, data]) => {
        const count = data.shows.length;
        // Logarithmic normalization for better visual distribution
        const weight = Math.log(count + 1) / Math.log(maxShows + 1);
        
        return {
          type: 'Feature',
          properties: { 
            count,
            weight,
            venueName: data.venueName,
            location: data.location
          },
          geometry: {
            type: 'Point',
            coordinates: data.coords
          }
        };
      });

      const geojson = {
        type: 'FeatureCollection',
        features
      };

      // Wait for map to load if needed
      if (!map.current?.isStyleLoaded()) {
        map.current?.once('load', () => addHeatmapLayer(geojson));
      } else {
        addHeatmapLayer(geojson);
      }

      // Fit bounds to show all cities
      if (features.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        features.forEach(feature => {
          bounds.extend(feature.geometry.coordinates as [number, number]);
        });
        map.current?.fitBounds(bounds, { padding: 80, maxZoom: 10 });
      }
    };

    const addHeatmapLayer = (geojson: any) => {
      if (!map.current) return;

      // Remove existing layers and sources
      if (map.current.getLayer('shows-heat')) {
        map.current.removeLayer('shows-heat');
      }
      if (map.current.getLayer('shows-points')) {
        map.current.removeLayer('shows-points');
      }
      if (map.current.getSource('shows')) {
        map.current.removeSource('shows');
      }

      // Add source
      map.current.addSource('shows', {
        type: 'geojson',
        data: geojson
      });

      // Add heatmap layer with app colors
      map.current.addLayer({
        id: 'shows-heat',
        type: 'heatmap',
        source: 'shows',
        paint: {
          // Use weight property for intensity
          'heatmap-weight': ['get', 'weight'],
          
          // Increase intensity as zoom level increases
          'heatmap-intensity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 1,
            9, 3
          ],
          
          // Color ramp using app's primary and secondary colors
          'heatmap-color': [
            'interpolate',
            ['linear'],
            ['heatmap-density'],
            0, 'rgba(0, 0, 0, 0)',
            0.2, 'hsl(189, 94%, 55%)', // primary (cyan)
            0.4, 'hsl(189, 94%, 65%)',
            0.6, 'hsl(17, 88%, 60%)',  // secondary (coral)
            0.8, 'hsl(45, 93%, 58%)',  // accent (gold)
            1, 'hsl(45, 93%, 68%)'
          ],
          
          // Adjust radius by zoom level
          'heatmap-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 2,
            9, 20
          ],
          
          // Transition from heatmap to circle layer
          'heatmap-opacity': [
            'interpolate',
            ['linear'],
            ['zoom'],
            7, 1,
            12, 0.5
          ]
        }
      });

      // Add circle layer for city labels on top
      map.current.addLayer({
        id: 'shows-points',
        type: 'circle',
        source: 'shows',
        minzoom: 8,
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['get', 'count'],
            1, 8,
            10, 16,
            50, 24
          ],
          'circle-color': 'hsl(189, 94%, 55%)',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.8
        }
      });

      // Add click handler for venues
      map.current.on('click', 'shows-points', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const venueName = feature.properties?.venueName;
        const location = feature.properties?.location;
        const count = feature.properties?.count;
        
        // Find all shows for this venue
        const venueShows = shows.filter(s => s.venue.name === venueName && s.venue.location === location);
        
        setSelectedVenue({
          venueName,
          location,
          count,
          shows: venueShows
        });
      });

      // Change cursor on hover
      map.current.on('mouseenter', 'shows-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'shows-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    };

    processShows();
  }, [shows]);

  return (
    <div className="relative w-full h-[calc(100vh-240px)]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
      
      {/* Selected venue popup */}
      {selectedVenue && (
        <Card className="absolute top-4 left-4 w-80 max-h-96 overflow-y-auto z-10 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 mb-3">
              <div className="flex-1">
                <h3 className="font-bold text-xl">{selectedVenue.venueName}</h3>
                <p className="text-sm text-muted-foreground">{selectedVenue.location}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedVenue.count} show{selectedVenue.count !== 1 ? 's' : ''}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedVenue(null)}
                className="h-6 w-6"
              >
                ✕
              </Button>
            </div>
            <div className="space-y-2">
              {selectedVenue.shows.map(show => (
                <div
                  key={show.id}
                  className="p-3 bg-muted/50 rounded cursor-pointer hover:bg-muted hover:border-primary/50 transition-colors border border-border/50"
                  onClick={() => onEditShow(show)}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getRatingEmoji(show.rating)}</span>
                    <span className="font-medium text-sm">
                      {show.artists.filter(a => a.isHeadliner).map(a => a.name).join(", ")}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {new Date(show.date).toLocaleDateString()}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Shows without location sidebar */}
      {showsWithoutLocation.length > 0 && (
        <Card className="absolute bottom-4 right-4 w-80 max-h-60 overflow-y-auto z-10 shadow-lg">
          <CardContent className="p-4">
            <h3 className="font-bold mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shows without locations
            </h3>
            <p className="text-xs text-muted-foreground mb-3">
              Click to add location and pin to map
            </p>
            <div className="space-y-2">
              {showsWithoutLocation.map(show => (
                <div
                  key={show.id}
                  className="text-sm p-3 bg-muted/50 rounded cursor-pointer hover:bg-muted transition-colors border border-border/50 hover:border-primary/50"
                  onClick={() => onEditShow(show)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="font-medium mb-1">
                        {show.artists.filter(a => a.isHeadliner).map(a => a.name).join(", ")}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {show.venue.name} • {new Date(show.date).toLocaleDateString()}
                      </div>
                    </div>
                    <Edit className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MapView;
