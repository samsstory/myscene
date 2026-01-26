import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search, Loader2, Music, MapPin, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export type SearchResultType = 'artist' | 'venue';

interface UnifiedSearchResult {
  type: SearchResultType;
  id: string;
  name: string;
  subtitle?: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  userShowCount?: number;
  sceneUsersCount?: number;
}

interface UnifiedSearchStepProps {
  onSelect: (result: UnifiedSearchResult) => void;
}

const UnifiedSearchStep = ({ onSelect }: UnifiedSearchStepProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState<UnifiedSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced unified search
  useEffect(() => {
    const search = async () => {
      if (searchTerm.trim().length < 2) {
        setResults([]);
        return;
      }

      setIsSearching(true);

      try {
        const { data, error } = await supabase.functions.invoke('unified-search', {
          body: { searchTerm: searchTerm.trim() }
        });

        if (error) throw error;

        setResults(data?.results || []);
      } catch (error) {
        console.error('Error in unified search:', error);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Group results by type
  const artistResults = results.filter(r => r.type === 'artist');
  const venueResults = results.filter(r => r.type === 'venue');

  const handleManualArtistAdd = () => {
    if (searchTerm.trim()) {
      onSelect({
        type: 'artist',
        id: `manual-${Date.now()}`,
        name: searchTerm.trim(),
      });
    }
  };

  const handleManualVenueAdd = () => {
    if (searchTerm.trim()) {
      onSelect({
        type: 'venue',
        id: `manual-${Date.now()}`,
        name: searchTerm.trim(),
      });
    }
  };

  return (
    <div className="space-y-4 w-full">
      <p className="text-sm text-muted-foreground text-center">
        Search for an artist, venue, or festival
      </p>

      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
        <Input
          placeholder="Search artist, venue, or festival..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 pr-10 h-12 text-base"
          autoFocus
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Results */}
      <div className="space-y-4 max-h-[400px] overflow-y-auto">
        {/* Manual add options when typing but no good results */}
        {searchTerm.trim().length >= 2 && !isSearching && (
          <div className="flex gap-2">
            <button
              onClick={handleManualArtistAdd}
              className="flex-1 p-3 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium text-sm">"{searchTerm}"</div>
                  <div className="text-xs text-muted-foreground">Add as artist</div>
                </div>
              </div>
            </button>
            <button
              onClick={handleManualVenueAdd}
              className="flex-1 p-3 rounded-lg border-2 border-dashed border-primary/30 hover:border-primary hover:bg-primary/5 transition-all text-left"
            >
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-primary" />
                <div>
                  <div className="font-medium text-sm">"{searchTerm}"</div>
                  <div className="text-xs text-muted-foreground">Add as venue</div>
                </div>
              </div>
            </button>
          </div>
        )}

        {/* Artists section */}
        {artistResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-1">
              <Music className="h-4 w-4" />
              Artists
            </div>
            {artistResults.map((result) => (
              <button
                key={result.id}
                onClick={() => onSelect(result)}
                className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{result.name}</div>
                    {result.subtitle && (
                      <div className="text-sm text-muted-foreground truncate">
                        {result.subtitle}
                      </div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Venues section */}
        {venueResults.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground px-1">
              <MapPin className="h-4 w-4" />
              Venues & Festivals
            </div>
            {venueResults.map((result) => (
              <button
                key={result.id}
                onClick={() => onSelect(result)}
                className="w-full text-left p-4 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all"
              >
                <div className="flex items-start gap-3">
                  <div className="h-10 w-10 rounded-full bg-accent flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold">{result.name}</div>
                    {result.location && (
                      <div className="text-sm text-muted-foreground truncate">
                        {result.location}
                      </div>
                    )}
                    <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                      {result.userShowCount && result.userShowCount > 0 && (
                        <span className="text-primary font-medium">
                          You've been {result.userShowCount} time{result.userShowCount !== 1 ? 's' : ''}
                        </span>
                      )}
                      {result.sceneUsersCount && result.sceneUsersCount > 0 && (
                        <span>
                          {result.sceneUsersCount} Scene user{result.sceneUsersCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!isSearching && searchTerm.trim().length >= 2 && results.length === 0 && (
          <div className="text-center py-8 text-muted-foreground text-sm">
            <Sparkles className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No results found</p>
            <p className="text-xs mt-1">Use the buttons above to add "{searchTerm}"</p>
          </div>
        )}

        {/* Initial state */}
        {searchTerm.trim().length < 2 && (
          <div className="text-center py-12 text-muted-foreground">
            <div className="flex justify-center gap-4 mb-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <Music className="h-6 w-6 text-primary" />
              </div>
              <div className="h-12 w-12 rounded-full bg-accent flex items-center justify-center">
                <MapPin className="h-6 w-6 text-muted-foreground" />
              </div>
            </div>
            <p className="text-sm">Start typing to search...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default UnifiedSearchStep;
