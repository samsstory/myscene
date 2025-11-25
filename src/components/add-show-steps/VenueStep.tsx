import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X, Building2, Music2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface VenueStepProps {
  value: string;
  location: string;
  locationFilter: string;
  showType: 'venue' | 'festival' | 'other';
  onSelect: (venue: string, location: string, venueId: string | null, latitude?: number, longitude?: number) => void;
  onLocationFilterChange: (filter: string) => void;
  onShowTypeChange: (type: 'venue' | 'festival' | 'other') => void;
  isLoadingDefaultCity?: boolean;
  isEditing?: boolean;
  onSave?: () => void;
}

interface VenueSuggestion {
  id?: string;
  name: string;
  location: string;
  scene_users_count: number;
  user_show_count: number;
}

interface CitySuggestion {
  name: string;
  fullLocation: string;
}

const VenueStep = ({ value, locationFilter, showType, onSelect, onLocationFilterChange, onShowTypeChange, isLoadingDefaultCity, isEditing, onSave }: VenueStepProps) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [venueSuggestions, setVenueSuggestions] = useState<VenueSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showCityDialog, setShowCityDialog] = useState(false);
  const [citySearchTerm, setCitySearchTerm] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [isSearchingCities, setIsSearchingCities] = useState(false);
  const [showAddressDialog, setShowAddressDialog] = useState(false);
  const [pendingVenueName, setPendingVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Debounced venue search
  useEffect(() => {
    const searchVenues = async () => {
      if (searchTerm.trim().length < 2) {
        setVenueSuggestions([]);
        return;
      }

      setIsSearching(true);

      try {
        const { data, error } = await supabase.functions.invoke('search-venues', {
          body: { searchTerm: searchTerm.trim() }
        });

        if (error) throw error;

        setVenueSuggestions(data?.suggestions || []);
      } catch (error) {
        console.error('Error searching venues:', error);
        setVenueSuggestions([]);
      } finally {
        setIsSearching(false);
      }
  };

    const timer = setTimeout(searchVenues, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // City search
  useEffect(() => {
    const searchCities = async () => {
      if (citySearchTerm.trim().length < 2) {
        setCitySuggestions([]);
        return;
      }

      setIsSearchingCities(true);

      try {
        const MAPBOX_TOKEN = "pk.eyJ1Ijoic2FtdWVsd2hpdGUxMjMxIiwiYSI6ImNtaDRjdndoNTExOGoyanBxbXBvZW85ZnoifQ.Dday-uhaPP_gF_s0E3xy2Q";
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(citySearchTerm.trim())}.json?access_token=${MAPBOX_TOKEN}&types=place,region&limit=10`
        );
        const data = await response.json();

        if (data.features && data.features.length > 0) {
          const cities = data.features.map((feature: any) => ({
            name: feature.text,
            fullLocation: feature.place_name,
          }));
          setCitySuggestions(cities);
        } else {
          setCitySuggestions([]);
        }
      } catch (error) {
        console.error('Error searching cities:', error);
        setCitySuggestions([]);
      } finally {
        setIsSearchingCities(false);
      }
    };

    const timer = setTimeout(searchCities, 300);
    return () => clearTimeout(timer);
  }, [citySearchTerm]);

  const handleVenueSelect = (suggestion: VenueSuggestion) => {
    onSelect(suggestion.name, suggestion.location, suggestion.id || null);
    setHasChanges(true);
  };

  const handleManualEntry = () => {
    if (searchTerm.trim()) {
      setPendingVenueName(searchTerm.trim());
      setVenueAddress("");
      setShowAddressDialog(true);
    }
  };

  const handleAddressSubmit = async (skipAddress: boolean = false) => {
    if (!pendingVenueName) return;

    if (skipAddress || !venueAddress.trim()) {
      // No address provided - geocode the city filter or use default
      if (locationFilter) {
        await geocodeAndSelect(locationFilter, pendingVenueName, locationFilter);
      } else {
        onSelect(pendingVenueName, "", null);
        setHasChanges(true);
      }
      setShowAddressDialog(false);
      return;
    }

    // Geocode the provided address
    await geocodeAndSelect(venueAddress, pendingVenueName, venueAddress);
    setShowAddressDialog(false);
  };

  const geocodeAndSelect = async (query: string, venueName: string, locationName: string) => {
    setIsGeocoding(true);
    try {
      const MAPBOX_TOKEN = "pk.eyJ1Ijoic2FtdWVsd2hpdGUxMjMxIiwiYSI6ImNtaDRjdndoNTExOGoyanBxbXBvZW85ZnoifQ.Dday-uhaPP_gF_s0E3xy2Q";
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center;
        onSelect(venueName, locationName, null, latitude, longitude);
      } else {
        onSelect(venueName, locationName, null);
      }
      setHasChanges(true);
    } catch (error) {
      console.error('Error geocoding address:', error);
      onSelect(venueName, locationName, null);
      setHasChanges(true);
    } finally {
      setIsGeocoding(false);
    }
  };

  const handleCitySelect = (city: CitySuggestion) => {
    onLocationFilterChange(city.fullLocation);
    setShowCityDialog(false);
    setCitySearchTerm("");
  };

  // Filter suggestions by location if filter is set - use smarter matching
  const filteredSuggestions = locationFilter
    ? venueSuggestions.filter(s => {
        const location = s.location.toLowerCase();
        const filter = locationFilter.toLowerCase();
        // Check if location contains any part of the filter (city, state, etc.)
        const filterParts = filter.split(',').map(p => p.trim());
        return filterParts.some(part => location.includes(part));
      })
    : venueSuggestions;

  const getPlaceholder = () => {
    switch (showType) {
      case 'venue':
        return 'Search for venue...';
      case 'festival':
        return 'Search for festival...';
      case 'other':
        return 'Search for show...';
      default:
        return 'Search for venue or festival...';
    }
  };

  const getManualEntryLabel = () => {
    switch (showType) {
      case 'venue':
        return 'New venue';
      case 'festival':
        return 'New festival';
      case 'other':
        return 'New show';
      default:
        return 'New venue';
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        <ToggleGroup 
          type="single" 
          value={showType} 
          onValueChange={(value) => {
            if (value) {
              onShowTypeChange(value as 'venue' | 'festival' | 'other');
              setHasChanges(true);
            }
          }}
          className="justify-start w-full"
        >
          <ToggleGroupItem value="venue" className="flex items-center gap-2 flex-1">
            <Building2 className="h-4 w-4" />
            Venue
          </ToggleGroupItem>
          <ToggleGroupItem value="festival" className="flex items-center gap-2 flex-1">
            <Music2 className="h-4 w-4" />
            Festival
          </ToggleGroupItem>
          <ToggleGroupItem value="other" className="flex items-center gap-2 flex-1">
            <Sparkles className="h-4 w-4" />
            Other
          </ToggleGroupItem>
        </ToggleGroup>

        <div className="relative">
          <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder={getPlaceholder()}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && searchTerm.trim() && filteredSuggestions.length === 0) {
                handleManualEntry();
              }
            }}
            className="pl-10 pr-10 h-12 text-base"
            autoFocus
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-muted-foreground" />
          )}
        </div>


        {locationFilter && !isLoadingDefaultCity && (
          <button
            type="button"
            onClick={() => setShowCityDialog(true)}
            className="flex items-center gap-2 text-sm text-muted-foreground px-1 hover:text-foreground transition-colors"
          >
            <MapPin className="h-3 w-3 text-primary" />
            <span>
              Searching near <span className="text-primary font-medium">{locationFilter}</span>
            </span>
            <span className="text-xs ml-auto">Click to change</span>
          </button>
        )}
      </div>

      {/* Venue suggestions */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {/* Option to enter exactly what they typed - shown first */}
        {searchTerm.trim() && !isSearching && (
          <button
            onClick={handleManualEntry}
            className="w-full text-left p-4 rounded-lg border-2 border-primary/50 bg-primary/5 hover:bg-primary/10 transition-all"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <div>
                <div className="font-semibold text-primary">"{searchTerm.trim()}"</div>
                <div className="text-sm text-muted-foreground">{getManualEntryLabel()}</div>
              </div>
            </div>
          </button>
        )}

        {/* Search results */}
        {filteredSuggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.name}-${suggestion.location}-${index}`}
            onClick={() => handleVenueSelect(suggestion)}
            className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold text-base">{suggestion.name}</span>
                    {suggestion.location && (
                      <span className="text-xs text-muted-foreground">
                        {suggestion.location}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                    {suggestion.user_show_count > 0 && (
                      <span className="text-primary font-medium">
                        You've been {suggestion.user_show_count} time{suggestion.user_show_count !== 1 ? 's' : ''}
                      </span>
                    )}
                    {suggestion.scene_users_count > 0 && (
                      <span>
                        {suggestion.scene_users_count} Scene user{suggestion.scene_users_count !== 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </button>
        ))}

        {!isSearching && searchTerm.trim().length >= 2 && filteredSuggestions.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No matching venues found
          </div>
        )}
      </div>

      {/* City Search Dialog */}
      <Dialog open={showCityDialog} onOpenChange={setShowCityDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search City or Region</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="relative">
              <Input
                type="text"
                placeholder="Search for a city..."
                value={citySearchTerm}
                onChange={(e) => setCitySearchTerm(e.target.value)}
                className="pr-10"
              />
              {isSearchingCities && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
              )}
            </div>

            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {citySuggestions.map((city, index) => (
                <button
                  key={index}
                  onClick={() => handleCitySelect(city)}
                  className="w-full text-left p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all"
                >
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div>
                      <div className="font-medium">{city.name}</div>
                      <div className="text-sm text-muted-foreground">{city.fullLocation}</div>
                    </div>
                  </div>
                </button>
              ))}

              {!isSearchingCities && citySearchTerm.trim().length >= 2 && citySuggestions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  No cities found
                </div>
              )}

              {!citySearchTerm.trim() && (
                <div className="text-center py-8 text-muted-foreground text-sm">
                  Start typing to search for cities
                </div>
              )}
            </div>

            {locationFilter && (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  onLocationFilterChange("");
                  setShowCityDialog(false);
                }}
              >
                Clear Location Filter
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Address Input Dialog */}
      <Dialog open={showAddressDialog} onOpenChange={setShowAddressDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add Address (Optional)</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground mb-3">
                Adding an address helps place "{pendingVenueName}" accurately on the map.
              </p>
              <Input
                type="text"
                placeholder="Enter venue address..."
                value={venueAddress}
                onChange={(e) => setVenueAddress(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && venueAddress.trim()) {
                    handleAddressSubmit(false);
                  }
                }}
                autoFocus
              />
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleAddressSubmit(true)}
                disabled={isGeocoding}
              >
                Skip
              </Button>
              <Button
                className="flex-1"
                onClick={() => handleAddressSubmit(false)}
                disabled={isGeocoding || !venueAddress.trim()}
              >
                {isGeocoding ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Adding...
                  </>
                ) : (
                  'Add Venue'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Save button for editing mode */}
      {isEditing && onSave && (
        <div className="sticky bottom-0 pt-4 pb-2 bg-background">
          <Button onClick={onSave} className="w-full" disabled={!hasChanges}>
            Save Changes
          </Button>
        </div>
      )}
    </div>
  );
};

export default VenueStep;
