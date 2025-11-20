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
  const markers = useRef<mapboxgl.Marker[]>([]);
  const [selectedShow, setSelectedShow] = useState<Show | null>(null);
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

  // Update markers when shows change - geocode shows without coordinates
  useEffect(() => {
    if (!map.current) return;

    const processShows = async () => {
      // Clear existing markers
      markers.current.forEach(marker => marker.remove());
      markers.current = [];

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

      // Add markers for shows with coordinates
      showsWithCoords.forEach(show => {
        const el = document.createElement('div');
        el.className = 'map-marker';
        el.innerHTML = `
          <div style="
            background: linear-gradient(135deg, hsl(var(--primary)), hsl(var(--primary-glow)));
            width: 32px;
            height: 32px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            box-shadow: 0 2px 8px rgba(0,0,0,0.3);
            font-size: 16px;
            transition: transform 0.2s;
          " onmouseover="this.style.transform='scale(1.2)'" onmouseout="this.style.transform='scale(1)'">
            ${getRatingEmoji(show.rating)}
          </div>
        `;

        el.addEventListener('click', () => {
          setSelectedShow(show);
        });

        const marker = new mapboxgl.Marker(el)
          .setLngLat([show.longitude!, show.latitude!])
          .addTo(map.current!);

        markers.current.push(marker);
      });

      // Fit bounds to show all markers if there are any
      if (showsWithCoords.length > 0) {
        const bounds = new mapboxgl.LngLatBounds();
        showsWithCoords.forEach(show => {
          bounds.extend([show.longitude!, show.latitude!]);
        });
        map.current?.fitBounds(bounds, { padding: 50, maxZoom: 12 });
      }
    };

    processShows();
  }, [shows]);

  return (
    <div className="relative w-full h-[calc(100vh-240px)]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg overflow-hidden" />
      
      {/* Selected show popup */}
      {selectedShow && (
        <Card className="absolute top-4 left-4 w-80 z-10 shadow-lg">
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex-1">
                <div className="text-2xl mb-1">{getRatingEmoji(selectedShow.rating)}</div>
                <h3 className="font-bold text-lg">
                  {selectedShow.artists
                    .filter(a => a.isHeadliner)
                    .map(a => a.name)
                    .join(", ")}
                </h3>
                {selectedShow.artists.filter(a => !a.isHeadliner).length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    with {selectedShow.artists.filter(a => !a.isHeadliner).map(a => a.name).join(", ")}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedShow(null)}
                className="h-6 w-6"
              >
                ✕
              </Button>
            </div>
            <div className="space-y-1 text-sm mb-3">
              <p className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                {selectedShow.venue.name}
              </p>
              <p className="text-muted-foreground">{selectedShow.venue.location}</p>
              <p className="text-muted-foreground">
                {new Date(selectedShow.date).toLocaleDateString()}
              </p>
            </div>
            <Button
              onClick={() => onEditShow(selectedShow)}
              className="w-full"
              size="sm"
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit Show
            </Button>
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
