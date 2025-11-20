import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X, Building2, Music2, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

interface VenueStepProps {
  value: string;
  location: string;
  locationFilter: string;
  showType: 'venue' | 'festival' | 'other';
  onSelect: (venue: string, location: string, venueId: string | null) => void;
  onLocationFilterChange: (filter: string) => void;
  onShowTypeChange: (type: 'venue' | 'festival' | 'other') => void;
  isLoadingDefaultCity?: boolean;
}

interface VenueSuggestion {
  id?: string;
  name: string;
  location: string;
  scene_users_count: number;
  user_show_count: number;
}

const VenueStep = ({ value, locationFilter, showType, onSelect, onLocationFilterChange, onShowTypeChange, isLoadingDefaultCity }: VenueStepProps) => {
  const [searchTerm, setSearchTerm] = useState(value);
  const [venueSuggestions, setVenueSuggestions] = useState<VenueSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

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

  const handleVenueSelect = (suggestion: VenueSuggestion) => {
    onSelect(suggestion.name, suggestion.location, suggestion.id || null);
  };

  const handleManualEntry = () => {
    if (searchTerm.trim()) {
      onSelect(searchTerm.trim(), "", null);
    }
  };

  // Filter suggestions by location if filter is set
  const filteredSuggestions = locationFilter
    ? venueSuggestions.filter(s => 
        s.location.toLowerCase().includes(locationFilter.toLowerCase())
      )
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
          onValueChange={(value) => value && onShowTypeChange(value as 'venue' | 'festival' | 'other')}
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
            onClick={() => onLocationFilterChange("")}
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
        {filteredSuggestions.map((suggestion, index) => (
          <button
            key={`${suggestion.name}-${suggestion.location}-${index}`}
            onClick={() => handleVenueSelect(suggestion)}
            className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all"
          >
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="font-semibold text-base">{suggestion.name}</span>
              </div>
              {suggestion.location && (
                <div className="text-sm text-muted-foreground ml-6">
                  {suggestion.location}
                </div>
              )}
              <div className="flex items-center gap-3 text-xs text-muted-foreground ml-6 mt-1">
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
          </button>
        ))}

        {/* Manual entry option */}
        {searchTerm.trim() && filteredSuggestions.length === 0 && !isSearching && (
          <button
            onClick={handleManualEntry}
            className="w-full text-left p-4 rounded-lg border border-dashed border-border hover:border-primary hover:bg-accent transition-all"
          >
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-semibold">Add "{searchTerm}"</div>
                <div className="text-sm text-muted-foreground">{getManualEntryLabel()}</div>
              </div>
            </div>
          </button>
        )}

        {!isSearching && searchTerm.trim().length >= 2 && filteredSuggestions.length === 0 && !searchTerm.trim() && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            No venues found. Press Enter to add manually.
          </div>
        )}
      </div>
    </div>
  );
};

export default VenueStep;
