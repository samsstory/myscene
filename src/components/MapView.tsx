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
        }
      } catch (error) {
        console.error('Error fetching home coordinates:', error);
      }
    };

    fetchHomeCoordinates();
  }, []);

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

  // Filter shows without location
  useEffect(() => {
    const showsWithout = shows.filter(show => !show.latitude || !show.longitude);
    setShowsWithoutLocation(showsWithout);
  }, [shows]);

  return (
    <div className="relative w-full h-[600px]">
      <div ref={mapContainer} className="absolute inset-0 rounded-lg" />

      {/* Shows without location list */}
      {showsWithoutLocation.length > 0 && (
        <Card className="absolute top-4 left-4 max-w-sm z-10">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Shows without location ({showsWithoutLocation.length})
            </h3>
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
          </CardContent>
        </Card>
      )}

      {/* Selected venue details */}
      {selectedVenue && (
        <Card className="absolute bottom-4 left-4 max-w-sm z-10">
          <CardContent className="p-4">
            <h3 className="font-semibold mb-2">{selectedVenue.venueName}</h3>
            <p className="text-sm text-muted-foreground mb-3">
              {selectedVenue.location}
            </p>
            <p className="text-sm mb-3">
              {selectedVenue.count} {selectedVenue.count === 1 ? "show" : "shows"}
            </p>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {selectedVenue.shows.map((show) => (
                <div
                  key={show.id}
                  className="text-sm p-2 bg-muted rounded flex items-center justify-between gap-2"
                >
                  <div className="flex-1">
                    <div className="font-medium">
                      {show.artists.map(a => a.name).join(", ")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(show.date).toLocaleDateString()}
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
            <Button
              size="sm"
              variant="outline"
              className="w-full mt-3"
              onClick={() => setSelectedVenue(null)}
            >
              Close
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MapView;
