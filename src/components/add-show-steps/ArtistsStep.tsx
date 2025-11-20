import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { X, Loader2, Music } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ArtistsStepProps {
  artists: Array<{ name: string; isHeadliner: boolean }>;
  onArtistsChange: (artists: Array<{ name: string; isHeadliner: boolean }>) => void;
  onContinue: () => void;
  isEditing?: boolean;
  onSave?: () => void;
}

interface ArtistSuggestion {
  id: string;
  name: string;
  disambiguation: string;
  country: string;
  type: string;
}

const ArtistsStep = ({ artists, onArtistsChange, onContinue, isEditing, onSave }: ArtistsStepProps) => {
  const [currentArtist, setCurrentArtist] = useState("");
  const [artistSuggestions, setArtistSuggestions] = useState<ArtistSuggestion[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced artist search
  useEffect(() => {
    const searchArtists = async () => {
      if (currentArtist.trim().length < 2) {
        setArtistSuggestions([]);
        return;
      }

      setIsSearching(true);

      try {
        const { data, error } = await supabase.functions.invoke('search-artists', {
          body: { searchTerm: currentArtist.trim() }
        });

        if (error) throw error;

        setArtistSuggestions(data?.artists || []);
      } catch (error) {
        console.error('Error searching artists:', error);
        setArtistSuggestions([]);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(searchArtists, 300);
    return () => clearTimeout(timer);
  }, [currentArtist]);

  const addArtist = (name: string, isHeadliner: boolean) => {
    if (name.trim()) {
      onArtistsChange([...artists, { name: name.trim(), isHeadliner }]);
      setCurrentArtist("");
      setArtistSuggestions([]);
    }
  };

  const removeArtist = (index: number) => {
    onArtistsChange(artists.filter((_, i) => i !== index));
  };

  const handleManualAdd = (isHeadliner: boolean) => {
    if (currentArtist.trim()) {
      addArtist(currentArtist, isHeadliner);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">Who performed?</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Add headliners and openers
        </p>
      </div>

      {/* Added artists */}
      {artists.length > 0 && (
        <div className="space-y-2">
          {artists.map((artist, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-3 rounded-lg border border-border bg-accent/50"
            >
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{artist.name}</span>
                <Badge variant={artist.isHeadliner ? "default" : "secondary"} className="text-xs">
                  {artist.isHeadliner ? "Headliner" : "Opener"}
                </Badge>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={() => removeArtist(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Search input */}
      <div className="relative">
        <Input
          placeholder="Search for artist..."
          value={currentArtist}
          onChange={(e) => setCurrentArtist(e.target.value)}
          className="h-12 text-base pr-10"
          autoFocus={artists.length === 0}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-3 h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {/* Artist suggestions */}
      {artistSuggestions.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {artistSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="p-3 rounded-lg border border-border hover:border-primary hover:bg-accent transition-all"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{suggestion.name}</div>
                  {suggestion.disambiguation && (
                    <div className="text-sm text-muted-foreground truncate">
                      {suggestion.disambiguation}
                    </div>
                  )}
                  {suggestion.country && (
                    <div className="text-xs text-muted-foreground">{suggestion.country}</div>
                  )}
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => addArtist(suggestion.name, true)}
                    className="text-xs h-7 px-2"
                  >
                    Headliner
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => addArtist(suggestion.name, false)}
                    className="text-xs h-7 px-2"
                  >
                    Opener
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Manual add buttons */}
      {currentArtist.trim() && artistSuggestions.length === 0 && !isSearching && (
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => handleManualAdd(true)}
            className="flex-1"
          >
            Add "{currentArtist}" as Headliner
          </Button>
          <Button
            variant="outline"
            onClick={() => handleManualAdd(false)}
            className="flex-1"
          >
            Add as Opener
          </Button>
        </div>
      )}

      {/* Continue/Save button */}
      {isEditing && onSave ? (
        <Button
          onClick={onSave}
          disabled={artists.length === 0}
          className="w-full h-12 text-base"
        >
          Save Changes
        </Button>
      ) : (
        <Button
          onClick={onContinue}
          disabled={artists.length === 0}
          className="w-full h-12 text-base"
        >
          Continue
        </Button>
      )}
    </div>
  );
};

export default ArtistsStep;
