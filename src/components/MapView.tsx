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

type ViewLevel = 'world' | 'country' | 'city';

interface HoverInfo {
  name: string;
  cities?: number;
  venues?: number;
  shows: number;
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
  const [hoverInfo, setHoverInfo] = useState<HoverInfo | null>(null);
  const [homeCoordinates, setHomeCoordinates] = useState<[number, number] | null>(null);
  const [currentView, setCurrentView] = useState<ViewLevel>('world');
  const [currentCountry, setCurrentCountry] = useState<string | null>(null);
  const [currentCity, setCurrentCity] = useState<string | null>(null);

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

  // Extract country from location string with better US state handling
  const getCountryFromLocation = (location: string): string => {
    const parts = location.split(',').map(p => p.trim());
    
    // Common US state abbreviations and names
    const usStates = [
      'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
      'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware', 'Florida', 'Georgia',
      'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky', 'Louisiana', 'Maine', 'Maryland', 'Massachusetts',
      'Michigan', 'Minnesota', 'Mississippi', 'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey',
      'New Mexico', 'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania', 'Rhode Island',
      'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont', 'Virginia', 'Washington', 'West Virginia',
      'Wisconsin', 'Wyoming'
    ];
    
    // Check if any part is a US state
    for (const part of parts) {
      if (usStates.includes(part)) {
        return 'United States';
      }
    }
    
    // Check for USA, US, United States explicitly
    const lastPart = parts[parts.length - 1];
    if (['USA', 'US', 'United States', 'U.S.', 'U.S.A.'].includes(lastPart)) {
      return 'United States';
    }
    
    // If location has multiple parts, assume last is country
    if (parts.length >= 2) {
      return lastPart;
    }
    
    // Default to United States if only one part (assuming most users are US-based)
    return 'United States';
  };

  // Expand US state abbreviations to full names
  const expandStateName = (location: string): string => {
    const stateMap: { [key: string]: string } = {
      'AL': 'Alabama', 'AK': 'Alaska', 'AZ': 'Arizona', 'AR': 'Arkansas', 'CA': 'California',
      'CO': 'Colorado', 'CT': 'Connecticut', 'DE': 'Delaware', 'FL': 'Florida', 'GA': 'Georgia',
      'HI': 'Hawaii', 'ID': 'Idaho', 'IL': 'Illinois', 'IN': 'Indiana', 'IA': 'Iowa',
      'KS': 'Kansas', 'KY': 'Kentucky', 'LA': 'Louisiana', 'ME': 'Maine', 'MD': 'Maryland',
      'MA': 'Massachusetts', 'MI': 'Michigan', 'MN': 'Minnesota', 'MS': 'Mississippi', 'MO': 'Missouri',
      'MT': 'Montana', 'NE': 'Nebraska', 'NV': 'Nevada', 'NH': 'New Hampshire', 'NJ': 'New Jersey',
      'NM': 'New Mexico', 'NY': 'New York', 'NC': 'North Carolina', 'ND': 'North Dakota', 'OH': 'Ohio',
      'OK': 'Oklahoma', 'OR': 'Oregon', 'PA': 'Pennsylvania', 'RI': 'Rhode Island', 'SC': 'South Carolina',
      'SD': 'South Dakota', 'TN': 'Tennessee', 'TX': 'Texas', 'UT': 'Utah', 'VT': 'Vermont',
      'VA': 'Virginia', 'WA': 'Washington', 'WV': 'West Virginia', 'WI': 'Wisconsin', 'WY': 'Wyoming'
    };

    const parts = location.split(',').map(p => p.trim());
    
    // Replace state abbreviations with full names
    const expandedParts = parts.map(part => {
      // Check if this part is a state abbreviation
      if (stateMap[part]) {
        return stateMap[part];
      }
      return part;
    });

    // Remove zip codes (5-digit numbers at the end)
    const filteredParts = expandedParts.filter(part => !/^\d{5}(-\d{4})?$/.test(part));
    
    return filteredParts.join(', ');
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

    // Add zoom event listener to track view level
    map.current.on('zoom', () => {
      if (!map.current) return;
      const zoom = map.current.getZoom();
      
      if (zoom < 3) {
        setCurrentView('world');
      } else if (zoom < 8) {
        setCurrentView('country');
      } else {
        setCurrentView('city');
      }
    });
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

      // Aggregate shows by COUNTRY -> CITY -> VENUE
      const countryMap = new Map<string, { 
        shows: Show[], 
        coords: [number, number], 
        cities: Map<string, { shows: Show[], coords: [number, number], venues: Map<string, Show[]> }> 
      }>();
      
      showsWithCoords.forEach(show => {
        const country = getCountryFromLocation(show.venue.location);
        const city = show.venue.location;

        // Initialize country
        if (!countryMap.has(country)) {
          countryMap.set(country, { 
            shows: [show], 
            coords: [show.longitude!, show.latitude!],
            cities: new Map([[city, { shows: [show], coords: [show.longitude!, show.latitude!], venues: new Map([[show.venue.name, [show]]]) }]])
          });
        } else {
          const countryData = countryMap.get(country)!;
          countryData.shows.push(show);
          
          // Use geographic center of the country's cities (median point)
          const allCityCoords = Array.from(countryData.cities.values()).map(c => c.coords);
          allCityCoords.push([show.longitude!, show.latitude!]);
          
          // Calculate median to avoid ocean placement
          const sortedLngs = allCityCoords.map(c => c[0]).sort((a, b) => a - b);
          const sortedLats = allCityCoords.map(c => c[1]).sort((a, b) => a - b);
          const medianLng = sortedLngs[Math.floor(sortedLngs.length / 2)];
          const medianLat = sortedLats[Math.floor(sortedLats.length / 2)];
          countryData.coords = [medianLng, medianLat];
          
          // Initialize city within country
          if (!countryData.cities.has(city)) {
            countryData.cities.set(city, { 
              shows: [show], 
              coords: [show.longitude!, show.latitude!],
              venues: new Map([[show.venue.name, [show]]])
            });
          } else {
            const cityData = countryData.cities.get(city)!;
            cityData.shows.push(show);
            
            // Initialize venue within city
            if (!cityData.venues.has(show.venue.name)) {
              cityData.venues.set(show.venue.name, [show]);
            } else {
              cityData.venues.get(show.venue.name)!.push(show);
            }
          }
        }
      });

      // Store all data for progressive zoom
      (window as any).showsData = {
        countryMap,
        showsWithCoords
      };

      // Build GeoJSON for country-level view (world zoom)
      const countryFeatures = Array.from(countryMap.entries()).map(([country, data]) => {
        return {
          type: 'Feature',
          properties: { 
            name: country,
            cities: data.cities.size,
            shows: data.shows.length,
            type: 'country'
          },
          geometry: {
            type: 'Point',
            coordinates: data.coords
          }
        };
      });

      const countryGeojson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
        type: 'FeatureCollection',
        features: countryFeatures as GeoJSON.Feature<GeoJSON.Geometry>[]
      };

      // Wait for map to load if needed
      if (!map.current?.isStyleLoaded()) {
        map.current?.once('load', () => addWorldLayer(countryGeojson));
      } else {
        addWorldLayer(countryGeojson);
      }

      // Fit bounds to show all countries
      if (countryFeatures.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        countryFeatures.forEach(feature => {
          bounds.extend(feature.geometry.coordinates as [number, number]);
        });
        map.current?.fitBounds(bounds, { padding: 80, maxZoom: 2.5 });
      }
    };

    // World view: Show country-level dots ONLY
    const addWorldLayer = (geojson: any) => {
      if (!map.current) return;

      // Remove all existing layers first
      removeLayers();

      map.current.addSource('shows', {
        type: 'geojson',
        data: geojson
      });

      // Only add country-level circles - no city data
      map.current.addLayer({
        id: 'shows-points',
        type: 'circle',
        source: 'shows',
        filter: ['==', ['get', 'type'], 'country'],  // Only show country markers
        paint: {
          'circle-radius': 25,
          'circle-color': 'hsl(189, 94%, 55%)',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.9
        }
      });

      map.current.on('click', 'shows-points', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const country = feature.properties?.name;
        const coords = (feature.geometry as any).coordinates;
        
        setCurrentCountry(country);
        map.current?.flyTo({
          center: coords,
          zoom: 4.5,
          duration: 1500
        });

        setTimeout(() => {
          const countryData = (window as any).showsData?.countryMap.get(country);
          if (countryData) addCountryLayer(country, countryData);
        }, 1600);
      });

      map.current.on('mouseenter', 'shows-points', (e) => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          // Only show hover info for country-level features at world view
          if (feature.properties?.type === 'country') {
            setHoverInfo({
              name: feature.properties?.name,
              cities: feature.properties?.cities,
              shows: feature.properties?.shows
            });
          }
        }
      });

      map.current.on('mouseleave', 'shows-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
        setHoverInfo(null);
      });
    };

    // Country view: Show city-level dots ONLY
    const addCountryLayer = (country: string, countryData: any) => {
      if (!map.current) return;

      // Remove all existing layers
      removeLayers();

      const cityFeatures = Array.from(countryData.cities.entries()).map(([city, data]: [string, any]) => {
        return {
          type: 'Feature',
          properties: {
            name: city,
            venues: data.venues.size,
            shows: data.shows.length,
            type: 'city'
          },
          geometry: {
            type: 'Point',
            coordinates: data.coords
          }
        };
      });

      const cityGeojson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
        type: 'FeatureCollection',
        features: cityFeatures as GeoJSON.Feature<GeoJSON.Geometry>[]
      };

      map.current.addSource('shows', {
        type: 'geojson',
        data: cityGeojson
      });

      // Only show city-level circles
      map.current.addLayer({
        id: 'shows-points',
        type: 'circle',
        source: 'shows',
        filter: ['==', ['get', 'type'], 'city'],  // Only show city markers
        paint: {
          'circle-radius': [
            'interpolate',
            ['linear'],
            ['zoom'],
            3, 20,
            6, 35,
            8, 25
          ],
          'circle-color': 'hsl(189, 94%, 55%)',
          'circle-stroke-width': 3,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.9
        }
      });

      map.current.on('click', 'shows-points', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const city = feature.properties?.name;
        const coords = (feature.geometry as any).coordinates;
        
        setCurrentCity(city);
        map.current?.flyTo({
          center: coords,
          zoom: 12,
          duration: 1500
        });

        setTimeout(() => {
          const cityData = countryData.cities.get(city);
          if (cityData) addCityLayer(city, cityData);
        }, 1600);
      });

      map.current.on('mouseenter', 'shows-points', (e) => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          // Only show hover info for city-level features at country view
          if (feature.properties?.type === 'city') {
            setHoverInfo({
              name: expandStateName(feature.properties?.name),
              venues: feature.properties?.venues,
              shows: feature.properties?.shows
            });
          }
        }
      });

      map.current.on('mouseleave', 'shows-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
        setHoverInfo(null);
      });
    };

    // City view: Show venue-level dots ONLY
    const addCityLayer = (city: string, cityData: any) => {
      if (!map.current) return;

      // Remove all existing layers
      removeLayers();

      const venueFeatures = Array.from(cityData.venues.entries()).map(([venueName, venueShows]: [string, Show[]]) => {
        const firstShow = venueShows[0];
        return {
          type: 'Feature',
          properties: {
            venueName,
            location: city,
            shows: venueShows.length,
            type: 'venue'
          },
          geometry: {
            type: 'Point',
            coordinates: [firstShow.longitude!, firstShow.latitude!]
          }
        };
      });

      const venueGeojson: GeoJSON.FeatureCollection<GeoJSON.Geometry> = {
        type: 'FeatureCollection',
        features: venueFeatures as GeoJSON.Feature<GeoJSON.Geometry>[]
      };

      map.current.addSource('shows', {
        type: 'geojson',
        data: venueGeojson
      });

      // Only show venue-level circles
      map.current.addLayer({
        id: 'shows-points',
        type: 'circle',
        source: 'shows',
        filter: ['==', ['get', 'type'], 'venue'],  // Only show venue markers
        paint: {
          'circle-radius': 15,
          'circle-color': 'hsl(189, 94%, 55%)',
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
          'circle-opacity': 0.9
        }
      });

      map.current.on('click', 'shows-points', (e) => {
        if (!e.features || e.features.length === 0) return;
        const feature = e.features[0];
        const venueName = feature.properties?.venueName;
        const location = feature.properties?.location;
        const count = feature.properties?.shows;
        
        const venueShows = shows.filter(s => s.venue.name === venueName && s.venue.location === location);
        
        setSelectedVenue({
          venueName,
          location,
          count,
          shows: venueShows
        });
      });

      map.current.on('mouseenter', 'shows-points', (e) => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          const feature = e.features[0];
          // Only show hover info for venue-level features at city view
          if (feature.properties?.type === 'venue') {
            setHoverInfo({
              name: feature.properties?.venueName,
              shows: feature.properties?.shows
            });
          }
        }
      });

      map.current.on('mouseleave', 'shows-points', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
        setHoverInfo(null);
      });
    };

    const removeLayers = () => {
      if (!map.current) return;
      
      const layersToRemove = ['shows-points', 'shows-heat', 'venue-points'];
      layersToRemove.forEach(layer => {
        if (map.current?.getLayer(layer)) {
          map.current.removeLayer(layer);
        }
      });

      if (map.current.getSource('shows')) {
        map.current.removeSource('shows');
      }
    };


    processShows();
  }, [shows]);

  return (
    <div className="relative w-full h-[calc(100vh-240px)]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
      
      {/* Hover tooltip */}
      {hoverInfo && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-card/95 backdrop-blur-sm border border-border rounded-lg px-4 py-2 shadow-lg z-10 pointer-events-none">
          <p className="font-medium">{hoverInfo.name}</p>
          <div className="text-xs text-muted-foreground space-y-0.5">
            {hoverInfo.cities !== undefined && (
              <p>{hoverInfo.cities} {hoverInfo.cities === 1 ? 'city' : 'cities'}</p>
            )}
            {hoverInfo.venues !== undefined && (
              <p>{hoverInfo.venues} {hoverInfo.venues === 1 ? 'venue' : 'venues'}</p>
            )}
            <p>{hoverInfo.shows} show{hoverInfo.shows !== 1 ? 's' : ''}</p>
          </div>
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
