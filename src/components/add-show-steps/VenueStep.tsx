import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, Home, Globe, Map, Building2, Sparkles, History, PartyPopper } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface EventRegistryMatch {
  eventId: string;
  eventName: string;
  venueName: string;
  venueLocation: string;
  venueId: string | null;
  eventType: string;
}

interface VenueStepProps {
  value: string;
  location: string;
  locationFilter: string;
  showType: 'set' | 'show' | 'festival';
  onSelect: (venue: string, location: string, venueId: string | null, latitude?: number, longitude?: number) => void;
  onLocationFilterChange: (filter: string) => void;
  onShowTypeChange: (type: 'set' | 'show' | 'festival') => void;
  isLoadingDefaultCity?: boolean;
  isEditing?: boolean;
  onSave?: () => void;
  onSkip?: () => void;
  selectedArtistName?: string;
  onSelectAsEvent?: (eventName: string, eventDescription: string) => void;
  onEventRegistrySelect?: (event: EventRegistryMatch) => void;
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

interface AddressSuggestion {
  name: string;
  fullAddress: string;
  type: string;
  coordinates: [number, number];
}

const VenueStep = ({ value, locationFilter, showType, onSelect, onLocationFilterChange, onShowTypeChange, isLoadingDefaultCity, isEditing, onSave, onSkip, selectedArtistName, onSelectAsEvent, onEventRegistrySelect }: VenueStepProps) => {
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
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isSearchingAddresses, setIsSearchingAddresses] = useState(false);
  const [selectedCoordinates, setSelectedCoordinates] = useState<[number, number] | null>(null);
  const [recentVenues, setRecentVenues] = useState<VenueSuggestion[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [showEventDescriptionInput, setShowEventDescriptionInput] = useState(false);
  const [eventDescription, setEventDescription] = useState("");
  const [eventMatches, setEventMatches] = useState<EventRegistryMatch[]>([]);

  // Fetch user's recent venues on mount
  useEffect(() => {
    const fetchRecentVenues = async () => {
      setIsLoadingHistory(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setIsLoadingHistory(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_venues')
          .select(`
            venue_id,
            show_count,
            last_show_date,
            venues (id, name, location, city)
          `)
          .eq('user_id', user.id)
          .order('last_show_date', { ascending: false, nullsFirst: false })
          .limit(5);

        if (!error && data) {
          const venues = data.map(item => {
            const venueData = item.venues as { id: string; name: string; location: string | null; city: string | null } | null;
            return {
              id: venueData?.id,
              name: venueData?.name || '',
              location: venueData?.location || venueData?.city || '',
              scene_users_count: 0,
              user_show_count: item.show_count
            };
          }).filter(v => v.name);
          
          setRecentVenues(venues);
        }
      } catch (error) {
        console.error('Error fetching recent venues:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    fetchRecentVenues();
  }, []);

  // Debounced venue search + events registry
  useEffect(() => {
    const searchVenues = async () => {
      if (searchTerm.trim().length < 2) {
        setVenueSuggestions([]);
        setEventMatches([]);
        return;
      }

      setIsSearching(true);

      try {
        // Search venues and events registry in parallel
        const [venueResult, eventsResult] = await Promise.all([
          supabase.functions.invoke('search-venues', {
            body: { searchTerm: searchTerm.trim(), showType: showType }
          }),
          supabase.from('events')
            .select('id, name, venue_name, venue_location, venue_id, event_type, year')
            .ilike('name', `%${searchTerm.trim()}%`)
            .order('year', { ascending: false })
            .limit(5),
        ]);

        if (venueResult.error) throw venueResult.error;
        setVenueSuggestions(venueResult.data?.suggestions || []);

        // Deduplicate events by name (keep most recent year)
        const seen = new Set<string>();
        const events: EventRegistryMatch[] = [];
        for (const event of (eventsResult.data || [])) {
          const key = event.name.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          events.push({
            eventId: event.id,
            eventName: event.name,
            venueName: event.venue_name || '',
            venueLocation: event.venue_location || '',
            venueId: event.venue_id,
            eventType: event.event_type,
          });
        }
        setEventMatches(events);
      } catch (error) {
        console.error('Error searching venues:', error);
        setVenueSuggestions([]);
        setEventMatches([]);
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
        const { MAPBOX_TOKEN } = await import("@/lib/mapbox");
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

  // Address autocomplete search
  useEffect(() => {
    const searchAddresses = async () => {
      if (venueAddress.trim().length < 2) {
        setAddressSuggestions([]);
        return;
      }

      setIsSearchingAddresses(true);

      try {
        const { MAPBOX_TOKEN } = await import("@/lib/mapbox");
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(venueAddress.trim())}.json?access_token=${MAPBOX_TOKEN}&types=address,poi,place,region,country&limit=8`
        );
        const data = await response.json();

        if (data.features?.length > 0) {
          const suggestions = data.features.map((feature: any) => ({
            name: feature.text,
            fullAddress: feature.place_name,
            type: feature.place_type[0],
            coordinates: feature.center,
          }));
          setAddressSuggestions(suggestions);
        } else {
          setAddressSuggestions([]);
        }
      } catch (error) {
        console.error('Error searching addresses:', error);
        setAddressSuggestions([]);
      } finally {
        setIsSearchingAddresses(false);
      }
    };

    const timer = setTimeout(searchAddresses, 300);
    return () => clearTimeout(timer);
  }, [venueAddress]);

  const handleVenueSelect = (suggestion: VenueSuggestion) => {
    onSelect(suggestion.name, suggestion.location, suggestion.id || null);
    setHasChanges(true);
  };

  const handleManualEntry = () => {
    if (searchTerm.trim()) {
      setPendingVenueName(searchTerm.trim());
      setVenueAddress("");
      setAddressSuggestions([]);
      setSelectedCoordinates(null);
      setShowAddressDialog(true);
    }
  };

  const handleSelectAsEvent = () => {
    if (searchTerm.trim() && onSelectAsEvent) {
      onSelectAsEvent(searchTerm.trim(), eventDescription.trim());
    }
  };

  const handleNewEventClick = () => {
    setShowEventDescriptionInput(true);
    setEventDescription("");
  };

  const handleAddressSelect = (suggestion: AddressSuggestion) => {
    setVenueAddress(suggestion.fullAddress);
    setAddressSuggestions([]);
    setSelectedCoordinates(suggestion.coordinates);
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

    // If coordinates were pre-selected from dropdown, use them directly
    // AND create a proper venue record in the database
    if (selectedCoordinates) {
      await createVenueAndSelect(pendingVenueName, venueAddress, selectedCoordinates);
      setShowAddressDialog(false);
      return;
    }

    // Fallback to geocoding if user typed custom address
    await geocodeAndSelect(venueAddress, pendingVenueName, venueAddress);
    setShowAddressDialog(false);
  };

  // Create a venue record in the database with geocoded coordinates
  const createVenueAndSelect = async (
    venueName: string, 
    venueLocation: string, 
    coordinates: [number, number]
  ) => {
    setIsGeocoding(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        console.error('[VenueStep] No authenticated user found');
        onSelect(venueName, venueLocation, null, coordinates[1], coordinates[0]);
        setHasChanges(true);
        return;
      }

      // Parse city and country from location
      const parts = venueLocation.split(',').map(p => p.trim());
      const country = parts[parts.length - 1] || 'United States';
      const city = parts.length >= 2 ? parts[parts.length - 2].replace(/\s*\d+\s*$/, '').trim() : parts[0];

      console.log(`[VenueStep] Creating venue record for "${venueName}" at coordinates:`, coordinates);

      // Create venue record with geocoded coordinates
      const { data: venue, error } = await supabase
        .from('venues')
        .insert({
          name: venueName,
          location: venueLocation,
          city: city,
          country: country,
          latitude: coordinates[1],
          longitude: coordinates[0],
          metadata: { source: 'user_entry', created_by: user.id }
        })
        .select()
        .single();

      if (error) {
        console.error('[VenueStep] Error creating venue record:', error);
        // Still pass coordinates even if venue creation fails
        onSelect(venueName, venueLocation, null, coordinates[1], coordinates[0]);
      } else if (venue) {
        console.log(`[VenueStep] Successfully created venue record with ID: ${venue.id}`);
        onSelect(venueName, venueLocation, venue.id, coordinates[1], coordinates[0]);
      }
      
      setHasChanges(true);
    } catch (error) {
      console.error('[VenueStep] Unexpected error creating venue:', error);
      onSelect(venueName, venueLocation, null, coordinates[1], coordinates[0]);
      setHasChanges(true);
    } finally {
      setIsGeocoding(false);
    }
  };

  const geocodeAndSelect = async (query: string, venueName: string, locationName: string) => {
    setIsGeocoding(true);
    try {
      const { MAPBOX_TOKEN } = await import("@/lib/mapbox");
      console.log(`[VenueStep] Geocoding address: "${query}"`);
      
      const response = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query.trim())}.json?access_token=${MAPBOX_TOKEN}&limit=1`
      );
      const data = await response.json();

      if (data.features && data.features.length > 0) {
        const [longitude, latitude] = data.features[0].center;
        console.log(`[VenueStep] Successfully geocoded to coordinates:`, [longitude, latitude]);
        
        // Create venue record with coordinates
        await createVenueAndSelect(venueName, locationName, [longitude, latitude]);
      } else {
        console.warn(`[VenueStep] No geocoding results found for: "${query}"`);
        onSelect(venueName, locationName, null);
        setHasChanges(true);
      }
    } catch (error) {
      console.error(`[VenueStep] Error geocoding address "${query}":`, error);
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

  // Don't filter on frontend - the edge function already handles location biasing
  // Filtering here causes issues (e.g., "Brooklyn, NY" doesn't contain "New York")
  const filteredSuggestions = venueSuggestions;

  const getPlaceholder = () => {
    switch (showType) {
      case 'set':
        return 'Search for venue...';
      case 'show':
        return 'Search for venue...';
      case 'festival':
        return 'Search for venue or grounds...';
      default:
        return 'Search for venue...';
    }
  };

  const getManualEntryLabel = () => {
    switch (showType) {
      case 'set':
        return 'New venue';
      case 'show':
        return 'New venue';
      case 'festival':
        return 'New venue / grounds';
      default:
        return 'New venue';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'address':
        return <Home className="h-4 w-4 text-blue-500" />;
      case 'poi':
        return <MapPin className="h-4 w-4 text-orange-500" />;
      case 'place':
        return <Building2 className="h-4 w-4 text-green-500" />;
      case 'region':
        return <Map className="h-4 w-4 text-purple-500" />;
      case 'country':
        return <Globe className="h-4 w-4 text-red-500" />;
      default:
        return <MapPin className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <div className="space-y-4">
      {/* Dynamic header based on selected artist */}
      {selectedArtistName && (
        <div className="text-center mb-2">
          <h3 className="text-lg font-semibold text-foreground">
            Where'd you see <span className="text-primary">{selectedArtistName}</span>?
          </h3>
        </div>
      )}

      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search for venue, festival, or other..."
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

      {/* Recent Venues - shown when not searching */}
      {!searchTerm.trim() && isLoadingHistory && (
        <div className="space-y-2">
          <Skeleton className="h-16 w-full rounded-lg" />
          <Skeleton className="h-16 w-full rounded-lg" />
        </div>
      )}

      {!searchTerm.trim() && !isLoadingHistory && recentVenues.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <History className="h-4 w-4" />
            <span>Recent venues</span>
          </div>
          {recentVenues.map((venue, index) => (
            <button
              key={venue.id || index}
              onClick={() => handleVenueSelect(venue)}
              className="w-full text-left p-4 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_12px_hsl(189_94%_55%/0.15)] transition-all duration-200"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div>
                  <div className="flex items-baseline gap-2 flex-wrap">
                    <span className="font-semibold">{venue.name}</span>
                    {venue.location && (
                      <span className="text-xs text-muted-foreground">
                        {venue.location}
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-primary">
                    {venue.user_show_count} show{venue.user_show_count !== 1 ? 's' : ''}
                  </div>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Venue suggestions */}
      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {/* Option to enter exactly what they typed - shown first */}
        {searchTerm.trim() && !isSearching && (
          <div className="rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/[0.1] p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary flex-shrink-0" />
              <div className="font-semibold text-primary">"{searchTerm.trim()}"</div>
            </div>
            {showType === 'show' && onSelectAsEvent ? (
              showEventDescriptionInput ? (
                <div className="space-y-2">
                  <Input
                    placeholder='e.g. "Traveling immersive parties" (optional)'
                    value={eventDescription}
                    onChange={(e) => setEventDescription(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSelectAsEvent()}
                    className="h-9 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={handleSelectAsEvent}
                    className="w-full text-center py-2 px-3 rounded-md bg-primary/20 border border-primary/40 hover:bg-primary/30 transition-all duration-200 text-sm font-medium text-primary"
                  >
                    Add as event →
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleManualEntry}
                    className="text-center py-2 px-3 rounded-md bg-white/[0.05] border border-white/[0.1] hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-sm font-medium text-foreground"
                  >
                    New venue
                  </button>
                  <button
                    onClick={handleNewEventClick}
                    className="text-center py-2 px-3 rounded-md bg-white/[0.05] border border-white/[0.1] hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-sm font-medium text-foreground"
                  >
                    New event
                  </button>
                </div>
              )
            ) : (
              <button
                onClick={handleManualEntry}
                className="w-full text-left"
              >
                <div className="text-sm text-muted-foreground">{getManualEntryLabel()}</div>
              </button>
            )}
          </div>
        )}

        {/* Event registry matches — shown before regular venues */}
        {eventMatches.length > 0 && onEventRegistrySelect && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-muted-foreground px-1">
              <PartyPopper className="h-3.5 w-3.5" />
              <span>Known events</span>
            </div>
            {eventMatches.map((event) => (
              <button
                key={event.eventId}
                onClick={() => onEventRegistrySelect(event)}
                className="w-full text-left p-4 rounded-lg bg-primary/[0.06] backdrop-blur-sm border border-primary/20 hover:border-primary/50 hover:bg-primary/10 hover:shadow-[0_0_12px_hsl(189_94%_55%/0.15)] transition-all duration-200"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <PartyPopper className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base">{event.eventName}</div>
                    {event.venueName && (
                      <div className="text-sm text-muted-foreground truncate">{event.venueName}</div>
                    )}
                    {event.venueLocation && (
                      <div className="text-xs text-muted-foreground truncate">{event.venueLocation}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Search results */}
        {filteredSuggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.name}-${suggestion.location}-${index}`}
            onClick={() => handleVenueSelect(suggestion)}
            className="w-full text-left p-4 rounded-lg bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] hover:border-primary/50 hover:bg-primary/5 hover:shadow-[0_0_12px_hsl(189_94%_55%/0.15)] transition-all duration-200"
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
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Enter venue address..."
                  value={venueAddress}
                  onChange={(e) => setVenueAddress(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && venueAddress.trim() && addressSuggestions.length === 0) {
                      handleAddressSubmit(false);
                    }
                  }}
                  autoFocus
                />
                {isSearchingAddresses && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {/* Address Suggestions Dropdown */}
              {addressSuggestions.length > 0 && (
                <div className="max-h-[250px] overflow-y-auto border rounded-lg mt-2 bg-background z-50">
                  {addressSuggestions.map((suggestion, index) => (
                    <button
                      key={index}
                      onClick={() => handleAddressSelect(suggestion)}
                      className="w-full text-left p-3 hover:bg-accent border-b last:border-b-0 transition-colors"
                    >
                      <div className="flex items-start gap-2">
                        {getTypeIcon(suggestion.type)}
                        <div className="flex-1">
                          <div className="font-medium">{suggestion.name}</div>
                          <div className="text-sm text-muted-foreground">{suggestion.fullAddress}</div>
                          <span className="text-xs text-primary capitalize mt-1 inline-block">
                            {suggestion.type === 'poi' ? 'Point of Interest' : suggestion.type}
                          </span>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
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
