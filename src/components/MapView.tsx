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
  const [hoveredCity, setHoveredCity] = useState<{ name: string; count: number } | null>(null);
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

      // Aggregate shows by CITY for country-level view
      const cityMap = new Map<string, { shows: Show[], coords: [number, number], venues: Map<string, Show[]> }>();
      
      showsWithCoords.forEach(show => {
        const city = show.venue.location;
        if (!cityMap.has(city)) {
          cityMap.set(city, { 
            shows: [show], 
            coords: [show.longitude!, show.latitude!],
            venues: new Map([[show.venue.name, [show]]])
          });
        } else {
          const cityData = cityMap.get(city)!;
          cityData.shows.push(show);
          
          // Track venues within the city
          if (!cityData.venues.has(show.venue.name)) {
            cityData.venues.set(show.venue.name, [show]);
          } else {
            cityData.venues.get(show.venue.name)!.push(show);
          }
        }
      });

      // Calculate normalized weights for cities
      const cityCounts = Array.from(cityMap.values()).map(c => c.shows.length);
      const minShows = Math.min(...cityCounts, 1);
      const maxShows = Math.max(...cityCounts, 1);

      // Build GeoJSON for city-level heat map
      const cityFeatures = Array.from(cityMap.entries()).map(([city, data]) => {
        const count = data.shows.length;
        const weight = Math.log(count + 1) / Math.log(maxShows + 1);
        
        return {
          type: 'Feature',
          properties: { 
            count,
            weight,
            city,
            type: 'city'
          },
          geometry: {
            type: 'Point',
            coordinates: data.coords
          }
        };
      });

      const geojson = {
        type: 'FeatureCollection',
        features: cityFeatures
      };

      // Store city data for zoom-in
      (window as any).cityShowData = cityMap;

      // Wait for map to load if needed
      if (!map.current?.isStyleLoaded()) {
        map.current?.once('load', () => addCityHeatmapLayer(geojson));
      } else {
        addCityHeatmapLayer(geojson);
      }

      // Fit bounds to show all cities
      if (cityFeatures.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        cityFeatures.forEach(feature => {
          bounds.extend(feature.geometry.coordinates as [number, number]);
        });
        map.current?.fitBounds(bounds, { padding: 80, maxZoom: 5 });
      }
    };

    const addCityHeatmapLayer = (geojson: any) => {
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

      // Add large circle layer for city markers (visible at all zoom levels)
      map.current.addLayer({
        id: 'shows-points',
        type: 'circle',
        source: 'shows',
        paint: {
          // Much larger radius for city-level viewing
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            0, 15,    // Large at world view
            5, 30,    // Bigger at country view
            8, 20,    // Smaller when zooming in
            12, 10    // Small at city level
          ],
          'circle-color': 'hsl(189, 94%, 55%)',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.9
        }
      });

      // Add click handler to zoom into city and show venues
      map.current.on('click', 'shows-points', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const city = feature.properties?.city;
        const coords = (feature.geometry as any).coordinates;
        
        // Zoom into the city
        map.current?.flyTo({
          center: coords,
          zoom: 12,
          duration: 1500
        });

        // Get city data and create venue-level visualization
        const cityData = (window as any).cityShowData?.get(city);
        if (cityData && map.current) {
          setTimeout(() => {
            addVenueLayerForCity(city, cityData);
          }, 1600); // Wait for zoom animation
        }
      });

      // Add hover handler to show city name and count
      map.current.on('mouseenter', 'shows-points', (e) => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          setHoveredCity({
            name: feature.properties?.city,
            count: feature.properties?.count
          });
        }
      });
      map.current.on('mouseleave', 'shows-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
        setHoveredCity(null);
      });
    };

    // Add venue-level markers when zoomed into a city
    const addVenueLayerForCity = (city: string, cityData: any) => {
      if (!map.current) return;

      // Remove city layers
      if (map.current.getLayer('shows-heat')) {
        map.current.removeLayer('shows-heat');
      }
      if (map.current.getLayer('shows-points')) {
        map.current.removeLayer('shows-points');
      }

      // Build venue-level GeoJSON
      const venueFeatures = Array.from(cityData.venues.entries()).map(([venueName, venueShows]: [string, Show[]]) => {
        const firstShow = venueShows[0];
        return {
          type: 'Feature',
          properties: {
            venueName,
            location: city,
            count: venueShows.length,
            type: 'venue'
          },
          geometry: {
            type: 'Point',
            coordinates: [firstShow.longitude!, firstShow.latitude!]
          }
        };
      });

      const venueGeojson = {
        type: 'FeatureCollection',
        features: venueFeatures
      };

      // Update source with venue data
      if (map.current.getSource('shows')) {
        (map.current.getSource('shows') as any).setData(venueGeojson);
      }

      // Add venue circle layer
      map.current.addLayer({
        id: 'venue-points',
        type: 'circle',
        source: 'shows',
        paint: {
          'circle-radius': 12,
          'circle-color': 'hsl(189, 94%, 55%)',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.9
        }
      });

      // Add venue click handler
      map.current.on('click', 'venue-points', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const venueName = feature.properties?.venueName;
        const location = feature.properties?.location;
        const count = feature.properties?.count;
        
        const venueShows = shows.filter(s => s.venue.name === venueName && s.venue.location === location);
        
        setSelectedVenue({
          venueName,
          location,
          count,
          shows: venueShows
        });
      });

      // Add hover
      map.current.on('mouseenter', 'venue-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
      });
      map.current.on('mouseleave', 'venue-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
      });
    };

    processShows();
  }, [shows]);

  return (
    <div className="relative w-full h-[calc(100vh-240px)]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
      
      {/* City hover tooltip */}
      {hoveredCity && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm border border-border rounded-lg px-4 py-2 shadow-lg z-10 pointer-events-none">
          <p className="font-medium">{hoveredCity.name}</p>
          <p className="text-xs text-muted-foreground">
            {hoveredCity.count} show{hoveredCity.count !== 1 ? 's' : ''}
          </p>
        </div>
      )}
      
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
