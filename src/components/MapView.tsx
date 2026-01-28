import { useEffect, useRef, useState, useMemo } from "react";
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
import { Edit, MapPin, Minus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import MapNavButton from "./map/MapNavButton";
import MapRightPanel from "./map/MapRightPanel";
import MapHoverCard from "./map/MapHoverCard";

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

const MAPBOX_TOKEN = "pk.eyJ1Ijoic2FtdWVsd2hpdGUxMjMxIiwiYSI6ImNtaDRjdndoNTExOGoyanBxbXBvZW85ZnoifQ.Dday-uhaPP_gF_s0E3xy2Q";

interface CountryData {
  name: string;
  showCount: number;
  coordinates: [number, number];
}

interface CityData {
  name: string;
  showCount: number;
  coordinates: [number, number];
  shows: Show[];
}

interface VenueData {
  name: string;
  location: string;
  coordinates: [number, number];
  shows: Show[];
}

const MapView = ({ shows, onEditShow }: MapViewProps) => {
  const { toast } = useToast();
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [selectedVenue, setSelectedVenue] = useState<{ venueName: string; location: string; count: number; shows: Show[] } | null>(null);
  const [showsWithoutLocation, setShowsWithoutLocation] = useState<Show[]>([]);
  const [homeCoordinates, setHomeCoordinates] = useState<[number, number] | null>(null);
  const [isBackfilling, setIsBackfilling] = useState(false);
  const [countryData, setCountryData] = useState<CountryData[]>([]);
  const [hoveredCountry, setHoveredCountry] = useState<string | null>(null);
  const [isLocationCardMinimized, setIsLocationCardMinimized] = useState(false);
  const [viewLevel, setViewLevel] = useState<'country' | 'city' | 'venue'>('country');
  const [selectedCountry, setSelectedCountry] = useState<string | null>(null);
  const [cityData, setCityData] = useState<CityData[]>([]);
  const [hoveredCity, setHoveredCity] = useState<string | null>(null);
  const [venueData, setVenueData] = useState<VenueData[]>([]);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [hoveredVenue, setHoveredVenue] = useState<string | null>(null);
  
  // Navigation history for "drill back down" functionality
  const [lastCountry, setLastCountry] = useState<string | null>(null);

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

  // Extract country from location string
  const getCountryFromLocation = (location: string): string => {
    const parts = location.split(',').map(p => p.trim());
    
    // Check for USA, US, United States explicitly
    const lastPart = parts[parts.length - 1];
    if (['USA', 'US', 'United States', 'U.S.', 'U.S.A.'].includes(lastPart)) {
      return 'United States';
    }
    
    // Common US state abbreviations
    const usStates = ['AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
      'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
      'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'];
    
    // Check if any part is a US state (strip zip codes first)
    for (const part of parts) {
      // Remove zip codes and numbers from state abbreviations (e.g., "CA 90028" -> "CA")
      const cleanedPart = part.replace(/\s*\d+\s*$/, '').trim();
      if (usStates.includes(cleanedPart)) {
        return 'United States';
      }
    }
    
    // If location has multiple parts, assume last is country
    if (parts.length >= 2) {
      return lastPart;
    }
    
    return 'United States';
  };

  // Extract city from location string - include state for better geocoding accuracy
  const getCityFromLocation = (location: string): string => {
    const parts = location.split(',').map(p => p.trim());
    
    // For addresses with numbers at the start (street addresses)
    // e.g., "8509 Burleson Rd, Austin, TX 78719" -> "Austin, TX"
    if (parts.length >= 3 && /^\d/.test(parts[0])) {
      return `${parts[1]}, ${parts[2].replace(/\s*\d+\s*$/, '').trim()}`;
    }
    
    // For city, state, country format
    // e.g., "Brooklyn, New York, USA" -> "Brooklyn, New York"
    // e.g., "Los Angeles, CA 90028" -> "Los Angeles, CA"
    if (parts.length >= 2) {
      const state = parts[1].replace(/\s*\d+\s*$/, '').trim();
      return `${parts[0]}, ${state}`;
    }
    
    return parts[0];
  };

  // Geocode country name to get center coordinates
  const geocodeCountry = async (countryName: string): Promise<[number, number] | null> => {
    try {
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(countryName)}.json?types=country&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return [lng, lat];
      }
    } catch (error) {
      console.error('Error geocoding country:', error);
    }
    return null;
  };

  // Geocode city name to get coordinates
  const geocodeCity = async (cityStateString: string, countryName: string): Promise<[number, number] | null> => {
    try {
      // Get country code for more accurate results
      let countryCode = '';
      if (countryName === 'United States') countryCode = 'us';
      else if (countryName === 'Canada') countryCode = 'ca';
      else if (countryName === 'United Kingdom') countryCode = 'gb';
      
      // Use the full city, state string for more accurate geocoding
      // e.g., "Brooklyn, New York" or "Los Angeles, CA"
      const query = countryCode 
        ? `${encodeURIComponent(cityStateString)}.json?types=place&country=${countryCode}`
        : `${encodeURIComponent(cityStateString)}.json?types=place`;
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      if (data.features && data.features.length > 0) {
        const [lng, lat] = data.features[0].center;
        return [lng, lat];
      }
    } catch (error) {
      console.error('Error geocoding city:', error);
    }
    return null;
  };

  // Geocode venue address to get coordinates
  const geocodeVenue = async (address: string): Promise<[number, number] | null> => {
    try {
      console.log(`[MapView] Attempting to geocode venue address: "${address}"`);
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?types=address,poi&access_token=${MAPBOX_TOKEN}`
      );
      const data = await response.json();
      
      if (data.features?.length > 0) {
        const coords = data.features[0].center;
        console.log(`[MapView] Successfully geocoded "${address}" to coordinates:`, coords);
        return coords;
      } else {
        console.warn(`[MapView] No geocoding results found for venue address: "${address}"`);
      }
    } catch (error) {
      console.error(`[MapView] Error geocoding venue address "${address}":`, error);
    }
    return null;
  };

  const handleFixMissingLocations = async () => {
    try {
      setIsBackfilling(true);
      console.log('Starting backfill process...');

      const { data, error } = await supabase.functions.invoke('backfill-venue-coordinates', {
        body: {}
      });

      if (error) {
        console.error('Backfill error:', error);
        toast({
          title: "Error",
          description: "Failed to fix missing locations. Please try again.",
          variant: "destructive"
        });
        return;
      }

      console.log('Backfill results:', data);
      
      if (data.results.success > 0) {
        toast({
          title: "Success!",
          description: `Fixed ${data.results.success} show${data.results.success > 1 ? 's' : ''}. Refreshing map...`
        });
        
        // Reload the page to refresh the map with new data
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
      console.error('Backfill error:', error);
      toast({
        title: "Error",
        description: "Failed to fix missing locations. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsBackfilling(false);
    }
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

  // Filter shows without location - only flag if we can't determine country from location text
  useEffect(() => {
    const showsWithout = shows.filter(show => {
      // If we have coordinates, it has a location
      if (show.latitude && show.longitude) return false;
      
      // If we have no location text, it definitely needs location
      if (!show.venue.location) return true;
      
      // Try to determine country from location text
      const country = getCountryFromLocation(show.venue.location);
      
      // If we can determine a country, we have enough location info
      // Only flag as "without location" if country is indeterminate
      return !country || country === 'Unknown';
    });
    setShowsWithoutLocation(showsWithout);
  }, [shows]);

  // Process shows and create country heat map data
  useEffect(() => {
    const processCountryData = async () => {
      if (!shows.length) return;

      // Group shows by country
      const countryMap = new Map<string, number>();
      
      shows.forEach(show => {
        if (show.venue.location) {
          const country = getCountryFromLocation(show.venue.location);
          countryMap.set(country, (countryMap.get(country) || 0) + 1);
        }
      });

      // Geocode each country and create country data
      const data: CountryData[] = [];
      for (const [countryName, showCount] of countryMap.entries()) {
        const coords = await geocodeCountry(countryName);
        if (coords) {
          data.push({
            name: countryName,
            showCount,
            coordinates: coords
          });
        }
      }

      setCountryData(data);
    };

    processCountryData();
  }, [shows]);

  // Handle country click - drill down to cities
  const handleCountryClick = async (countryName: string) => {
    // Filter shows for this country
    const countryShows = shows.filter(show => {
      if (show.venue.location) {
        const country = getCountryFromLocation(show.venue.location);
        return country === countryName;
      }
      return false;
    });

    // Group shows by city (using city, state format for uniqueness and accuracy)
    const cityMap = new Map<string, Show[]>();
    countryShows.forEach(show => {
      const cityStateString = getCityFromLocation(show.venue.location);
      if (cityStateString) {
        if (!cityMap.has(cityStateString)) {
          cityMap.set(cityStateString, []);
        }
        cityMap.get(cityStateString)!.push(show);
      }
    });

    // Geocode each city and create city data
    const data: CityData[] = [];
    for (const [cityStateString, cityShows] of cityMap.entries()) {
      const coords = await geocodeCity(cityStateString, countryName);
      if (coords) {
        // Extract just city name for display (first part before comma)
        const displayName = cityStateString.split(',')[0].trim();
        data.push({
          name: displayName,
          showCount: cityShows.length,
          coordinates: coords,
          shows: cityShows
        });
      }
    }

    setCityData(data);
    setSelectedCountry(countryName);
    setViewLevel('city');
  };

  // Handle city click - drill down to venues
  const handleCityClick = async (cityName: string) => {
    const cityInfo = cityData.find(c => c.name === cityName);
    if (!cityInfo) return;

    console.log(`[MapView] Drilling down to city: "${cityName}" with ${cityInfo.shows.length} shows`);

    // Group shows by venue
    const venueMap = new Map<string, Show[]>();
    cityInfo.shows.forEach(show => {
      const venueName = show.venue.name;
      if (!venueMap.has(venueName)) {
        venueMap.set(venueName, []);
      }
      venueMap.get(venueName)!.push(show);
    });

    console.log(`[MapView] Found ${venueMap.size} unique venues in ${cityName}`);

    // Create venue data with coordinates
    const venues: VenueData[] = [];
    for (const [venueName, venueShows] of venueMap.entries()) {
      // Use show coordinates if available, otherwise geocode the venue address
      const showWithCoords = venueShows.find(s => s.latitude && s.longitude);
      let coords: [number, number] | null;
      
      if (showWithCoords) {
        coords = [showWithCoords.longitude!, showWithCoords.latitude!];
        console.log(`[MapView] Venue "${venueName}" has stored coordinates:`, coords);
      } else {
        console.log(`[MapView] Geocoding venue "${venueName}" with address: "${venueShows[0].venue.location}"`);
        coords = await geocodeVenue(venueShows[0].venue.location);
        
        if (!coords) {
          console.warn(`[MapView] Failed to geocode venue "${venueName}", attempting city fallback`);
          // Fallback: try to geocode just the city if full address fails
          coords = await geocodeCity(cityName, selectedCountry || 'United States');
        }
      }
      
      if (coords) {
        venues.push({
          name: venueName,
          location: venueShows[0].venue.location,
          coordinates: coords,
          shows: venueShows
        });
      } else {
        console.error(`[MapView] Could not determine coordinates for venue "${venueName}", skipping map display`);
      }
    }

    console.log(`[MapView] Successfully mapped ${venues.length} of ${venueMap.size} venues`);

    setVenueData(venues);
    setSelectedCity(cityName);
    setViewLevel('venue');
  };

  // Handle navigation button click - context-aware up/down navigation
  const handleNavButtonClick = () => {
    if (viewLevel === 'venue') {
      // At venue level: go back to city level
      setViewLevel('city');
      setVenueData([]);
      setSelectedCity(null);
      setHoveredVenue(null);
    } else if (viewLevel === 'city') {
      // At city level: save current country, go to world
      setLastCountry(selectedCountry);
      setViewLevel('country');
      setSelectedCountry(null);
      setCityData([]);
      setHoveredCity(null);
    } else if (viewLevel === 'country' && lastCountry) {
      // At world level with history: drill back to last country
      handleCountryClick(lastCountry);
    }
    // At world level without history: do nothing (button is disabled)
  };

  // Calculate stats
  const mapStats = useMemo(() => {
    const countries = new Set<string>();
    const cities = new Set<string>();
    const venues = new Set<string>();

    shows.forEach(show => {
      if (show.venue.location) {
        countries.add(getCountryFromLocation(show.venue.location));
        cities.add(getCityFromLocation(show.venue.location));
      }
      venues.add(show.venue.name);
    });

    return {
      totalShows: shows.length,
      totalCountries: countries.size,
      totalCities: cities.size,
      totalVenues: venues.size,
    };
  }, [shows]);

  // Add country markers to map
  useEffect(() => {
    if (!map.current || !countryData.length || viewLevel !== 'country') return;

    // Wait for map to load
    if (!map.current.isStyleLoaded()) {
      map.current.on('load', () => addCountryMarkers());
      return;
    }

    addCountryMarkers();

    function addCountryMarkers() {
      if (!map.current) return;

      // Remove existing layers and sources
      if (map.current.getLayer('country-dots')) {
        map.current.removeLayer('country-dots');
      }
      if (map.current.getSource('countries')) {
        map.current.removeSource('countries');
      }

      // Create GeoJSON for countries
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: countryData.map(country => ({
          type: 'Feature',
          properties: {
            name: country.name,
            showCount: country.showCount
          },
          geometry: {
            type: 'Point',
            coordinates: country.coordinates
          }
        }))
      };

      // Add source
      map.current.addSource('countries', {
        type: 'geojson',
        data: geojson
      });

      // Add layer with size based on show count (increased for better mobile tap targets)
      map.current.addLayer({
        id: 'country-dots',
        type: 'circle',
        source: 'countries',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'showCount'],
            1, 22,
            5, 28,
            10, 34,
            50, 44
          ],
          'circle-color': 'hsl(280, 70%, 55%)',
          'circle-opacity': 0.85,
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255, 255, 255, 0.5)',
          'circle-blur': 0.1
        }
      });

      // Add glow layer behind main dots
      map.current.addLayer({
        id: 'country-dots-glow',
        type: 'circle',
        source: 'countries',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'showCount'],
            1, 28,
            5, 38,
            10, 48,
            50, 60
          ],
          'circle-color': 'hsl(280, 70%, 55%)',
          'circle-opacity': 0.3,
          'circle-blur': 1
        }
      }, 'country-dots');

      // Add count labels
      map.current.addLayer({
        id: 'country-labels',
        type: 'symbol',
        source: 'countries',
        layout: {
          'text-field': ['to-string', ['get', 'showCount']],
          'text-size': 14,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0, 0, 0, 0.3)',
          'text-halo-width': 1
        }
      });

      // Add click handler
      map.current.on('click', 'country-dots', (e) => {
        if (e.features && e.features.length > 0) {
          const countryName = e.features[0].properties?.name;
          if (countryName) {
            handleCountryClick(countryName);
          }
        }
      });

      // Add hover effect
      map.current.on('mouseenter', 'country-dots', (e) => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          setHoveredCountry(e.features[0].properties?.name);
        }
      });

      map.current.on('mouseleave', 'country-dots', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
        setHoveredCountry(null);
      });
    }
  }, [countryData, viewLevel]);

  // Add city markers to map
  useEffect(() => {
    if (!map.current || !cityData.length || viewLevel !== 'city') return;

    // Wait for map to load
    if (!map.current.isStyleLoaded()) {
      map.current.on('load', () => addCityMarkers());
      return;
    }

    addCityMarkers();

    function addCityMarkers() {
      if (!map.current) return;

      // Remove country layers when showing cities
      if (map.current.getLayer('country-labels')) {
        map.current.removeLayer('country-labels');
      }
      if (map.current.getLayer('country-dots')) {
        map.current.removeLayer('country-dots');
      }
      if (map.current.getLayer('country-dots-glow')) {
        map.current.removeLayer('country-dots-glow');
      }
      if (map.current.getSource('countries')) {
        map.current.removeSource('countries');
      }

      // Remove existing city layers and sources
      if (map.current.getLayer('city-labels')) {
        map.current.removeLayer('city-labels');
      }
      if (map.current.getLayer('city-dots')) {
        map.current.removeLayer('city-dots');
      }
      if (map.current.getLayer('city-dots-glow')) {
        map.current.removeLayer('city-dots-glow');
      }
      if (map.current.getSource('cities')) {
        map.current.removeSource('cities');
      }

      // Create GeoJSON for cities
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: cityData.map(city => ({
          type: 'Feature',
          properties: {
            name: city.name,
            showCount: city.showCount
          },
          geometry: {
            type: 'Point',
            coordinates: city.coordinates
          }
        }))
      };

      // Add source
      map.current.addSource('cities', {
        type: 'geojson',
        data: geojson
      });

      // Add layer with size based on show count (increased for better mobile tap targets)
      map.current.addLayer({
        id: 'city-dots',
        type: 'circle',
        source: 'cities',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'showCount'],
            1, 18,
            5, 24,
            10, 30,
            25, 36
          ],
          'circle-color': 'hsl(189, 94%, 55%)',
          'circle-opacity': 0.85,
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255, 255, 255, 0.5)',
          'circle-blur': 0.1
        }
      });

      // Add glow layer behind main dots
      map.current.addLayer({
        id: 'city-dots-glow',
        type: 'circle',
        source: 'cities',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'showCount'],
            1, 24,
            5, 34,
            10, 44,
            25, 52
          ],
          'circle-color': 'hsl(189, 94%, 55%)',
          'circle-opacity': 0.3,
          'circle-blur': 1
        }
      }, 'city-dots');

      // Add count labels
      map.current.addLayer({
        id: 'city-labels',
        type: 'symbol',
        source: 'cities',
        layout: {
          'text-field': ['to-string', ['get', 'showCount']],
          'text-size': 12,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0, 0, 0, 0.3)',
          'text-halo-width': 1
        }
      });

      // Add click handler
      map.current.on('click', 'city-dots', (e) => {
        if (e.features && e.features.length > 0) {
          const cityName = e.features[0].properties?.name;
          if (cityName) {
            handleCityClick(cityName);
          }
        }
      });

      // Add hover effect
      map.current.on('mouseenter', 'city-dots', (e) => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          setHoveredCity(e.features[0].properties?.name);
        }
      });

      map.current.on('mouseleave', 'city-dots', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
        setHoveredCity(null);
      });

      // Fit map to show all cities
      if (cityData.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        cityData.forEach(city => {
          bounds.extend(city.coordinates);
        });
        map.current.fitBounds(bounds, { padding: 100, maxZoom: 6 });
      }
    }
  }, [cityData, viewLevel]);

  // Add venue markers to map
  useEffect(() => {
    if (!map.current || !venueData.length || viewLevel !== 'venue') return;

    // Wait for map to load
    if (!map.current.isStyleLoaded()) {
      map.current.on('load', () => addVenueMarkers());
      return;
    }

    addVenueMarkers();

    function addVenueMarkers() {
      if (!map.current) return;

      // Remove city layers when showing venues
      if (map.current.getLayer('city-labels')) {
        map.current.removeLayer('city-labels');
      }
      if (map.current.getLayer('city-dots')) {
        map.current.removeLayer('city-dots');
      }
      if (map.current.getLayer('city-dots-glow')) {
        map.current.removeLayer('city-dots-glow');
      }
      if (map.current.getSource('cities')) {
        map.current.removeSource('cities');
      }

      // Remove existing venue layers and sources
      if (map.current.getLayer('venue-labels')) {
        map.current.removeLayer('venue-labels');
      }
      if (map.current.getLayer('venue-dots')) {
        map.current.removeLayer('venue-dots');
      }
      if (map.current.getLayer('venue-dots-glow')) {
        map.current.removeLayer('venue-dots-glow');
      }
      if (map.current.getSource('venues')) {
        map.current.removeSource('venues');
      }

      // Create GeoJSON for venues
      const geojson: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: venueData.map(venue => ({
          type: 'Feature',
          properties: {
            name: venue.name,
            location: venue.location,
            showCount: venue.shows.length
          },
          geometry: {
            type: 'Point',
            coordinates: venue.coordinates
          }
        }))
      };

      // Add source
      map.current.addSource('venues', {
        type: 'geojson',
        data: geojson
      });

      // Add layer with size based on show count (increased for better mobile tap targets)
      map.current.addLayer({
        id: 'venue-dots',
        type: 'circle',
        source: 'venues',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'showCount'],
            1, 16,
            3, 20,
            5, 24,
            10, 30
          ],
          'circle-color': 'hsl(35, 90%, 55%)',
          'circle-opacity': 0.9,
          'circle-stroke-width': 3,
          'circle-stroke-color': 'rgba(255, 255, 255, 0.5)',
          'circle-blur': 0.05
        }
      });

      // Add glow layer behind main dots
      map.current.addLayer({
        id: 'venue-dots-glow',
        type: 'circle',
        source: 'venues',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'showCount'],
            1, 20,
            3, 28,
            5, 36,
            10, 44
          ],
          'circle-color': 'hsl(35, 90%, 55%)',
          'circle-opacity': 0.3,
          'circle-blur': 1
        }
      }, 'venue-dots');

      // Add count labels
      map.current.addLayer({
        id: 'venue-labels',
        type: 'symbol',
        source: 'venues',
        layout: {
          'text-field': ['to-string', ['get', 'showCount']],
          'text-size': 11,
          'text-font': ['DIN Pro Bold', 'Arial Unicode MS Bold'],
          'text-allow-overlap': true
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': 'rgba(0, 0, 0, 0.3)',
          'text-halo-width': 1
        }
      });

      // Add click handler
      map.current.on('click', 'venue-dots', (e) => {
        if (e.features && e.features.length > 0) {
          const venueName = e.features[0].properties?.name;
          const venue = venueData.find(v => v.name === venueName);
          if (venue) {
            setSelectedVenue({
              venueName: venue.name,
              location: venue.location,
              count: venue.shows.length,
              shows: venue.shows
            });
          }
        }
      });

      // Add hover effect
      map.current.on('mouseenter', 'venue-dots', (e) => {
        if (map.current) map.current.getCanvas().style.cursor = 'pointer';
        if (e.features && e.features.length > 0) {
          setHoveredVenue(e.features[0].properties?.name);
        }
      });

      map.current.on('mouseleave', 'venue-dots', () => {
        if (map.current) map.current.getCanvas().style.cursor = '';
        setHoveredVenue(null);
      });

      // Fit map to show all venues with tighter zoom
      if (venueData.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        venueData.forEach(venue => {
          bounds.extend(venue.coordinates);
        });
        map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
      }
    }
  }, [venueData, viewLevel]);

  return (
    <div className="relative w-full h-[calc(100vh-180px)] min-h-[400px]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />

      {/* Context-aware navigation button */}
      <div className="absolute top-4 left-4 z-10">
        <MapNavButton
          viewLevel={viewLevel}
          selectedCountry={selectedCountry}
          selectedCity={selectedCity}
          hasHistory={!!lastCountry}
          onClick={handleNavButtonClick}
        />
      </div>

      {/* Location notification badge - only shows when there are shows without location */}
      <MapRightPanel
        showsWithoutLocation={showsWithoutLocation.length}
        isLocationCardExpanded={!isLocationCardMinimized}
        onToggleLocationCard={() => setIsLocationCardMinimized(false)}
      />

      {/* Hover info for country */}
      {hoveredCountry && viewLevel === 'country' && (
        <MapHoverCard
          title={hoveredCountry}
          subtitle={`${countryData.find(c => c.name === hoveredCountry)?.showCount} shows`}
          className="absolute top-20 left-4 z-10"
        />
      )}

      {/* Hover info for city */}
      {hoveredCity && viewLevel === 'city' && (
        <MapHoverCard
          title={hoveredCity}
          subtitle={`${cityData.find(c => c.name === hoveredCity)?.showCount} shows`}
          className="absolute top-20 left-4 z-10"
        />
      )}

      {/* Hover info for venue */}
      {hoveredVenue && viewLevel === 'venue' && (
        <MapHoverCard
          title={hoveredVenue}
          subtitle={`${venueData.find(v => v.name === hoveredVenue)?.shows.length} shows`}
          className="absolute top-20 left-4 z-10"
        />
      )}

      {/* Shows without location list - only when expanded */}
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

      {/* Selected venue details - Bottom Sheet */}
      <Drawer
        open={!!selectedVenue}
        onOpenChange={(open) => !open && setSelectedVenue(null)}
      >
        <DrawerContent className="max-h-[60vh]">
          <DrawerHeader>
            <DrawerTitle>{selectedVenue?.venueName}</DrawerTitle>
            <DrawerDescription>{selectedVenue?.location}</DrawerDescription>
          </DrawerHeader>
          <div className="px-4 pb-6">
            <p className="text-sm mb-3 text-muted-foreground">
              {selectedVenue?.count} {selectedVenue?.count === 1 ? "show" : "shows"}
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedVenue?.shows.map((show) => (
                <div
                  key={show.id}
                  className="text-sm p-3 bg-muted rounded-lg flex items-center justify-between gap-2"
                >
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {show.artists.map(a => a.name).join(", ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(show.date).toLocaleDateString()}
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEditShow(show)}
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </div>
  );
};

export default MapView;
