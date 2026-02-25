import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X, Loader2, Music, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useArtistSearch } from "@/hooks/useArtistSearch";

import type { Artist } from "@/types/show";

interface ArtistsStepProps {
  artists: Artist[];
  onArtistsChange: (artists: Artist[]) => void;
  onContinue: () => void;
  isEditing?: boolean;
  onSave?: () => void;
}

const ArtistsStep = ({ artists, onArtistsChange, onContinue, isEditing, onSave }: ArtistsStepProps) => {
  const [currentArtist, setCurrentArtist] = useState("");
  const artistsRef = useRef(artists);
  artistsRef.current = artists;

  const { results: artistSuggestions, isSearching, spotifyUnavailable, clearResults } = useArtistSearch(currentArtist);

  const addArtist = (name: string, isHeadliner: boolean, imageUrl?: string, spotifyId?: string) => {
    if (name.trim()) {
      const trimmed = name.trim();
      if (imageUrl) {
        onArtistsChange([...artists, { name: trimmed, isHeadliner, imageUrl, spotifyId }]);
      } else {
        onArtistsChange([...artists, { name: trimmed, isHeadliner }]);
        // Background enrichment
        fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-artist-images`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ names: [trimmed] }),
        })
          .then((r) => r.json())
          .then(({ artists: resolved }) => {
            const match = resolved?.[trimmed.toLowerCase()];
            if (match?.image_url) {
              const updated = artistsRef.current.map((a) =>
                a.name.toLowerCase() === trimmed.toLowerCase()
                  ? { ...a, imageUrl: match.image_url, spotifyId: match.spotify_id || undefined }
                  : a
              );
              onArtistsChange(updated);
            }
          })
          .catch(() => {});
      }
      setCurrentArtist("");
      clearResults();
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
        <Label className="text-base font-semibold">Who'd you see?</Label>
        <p className="text-sm text-muted-foreground mt-1">
          Add the artists from this show
        </p>
      </div>

      {artists.length > 0 && (
        <div className="space-y-2">
          {artists.map((artist, index) => (
            <div
              key={index}
              className={cn(
                "flex items-center justify-between p-3 rounded-lg transition-all duration-200",
                "bg-white/[0.03] backdrop-blur-sm border border-primary/40",
                "shadow-[0_0_12px_hsl(189_94%_55%/0.1)]"
              )}
            >
              <div className="flex items-center gap-2">
                <Music className="h-4 w-4 text-primary" />
                <span className="font-medium">{artist.name}</span>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 hover:bg-white/10"
                onClick={() => removeArtist(index)}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="relative">
        <Input
          placeholder="Search for artist..."
          value={currentArtist}
          onChange={(e) => setCurrentArtist(e.target.value)}
          className={cn(
            "h-12 text-base pr-10",
            "bg-white/[0.03] border-white/[0.1] transition-all duration-200",
            "focus:ring-2 focus:ring-primary/30 focus:border-primary/50",
            "focus:shadow-[0_0_16px_hsl(189_94%_55%/0.2)]"
          )}
          autoFocus={artists.length === 0}
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-3.5 h-5 w-5 animate-spin text-muted-foreground" />
        )}
      </div>

      {spotifyUnavailable && artistSuggestions.length > 0 && (
        <div className="flex items-center gap-1.5 px-1 text-xs text-muted-foreground">
          <WifiOff className="h-3 w-3 flex-shrink-0" />
          <span>Showing local results only</span>
        </div>
      )}

      {artistSuggestions.length > 0 && (
        <div className="space-y-2 max-h-[300px] overflow-y-auto">
          {artistSuggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className={cn(
                "p-3 rounded-lg transition-all duration-200 cursor-pointer",
                "bg-white/[0.03] backdrop-blur-sm border border-white/[0.08]",
                "hover:border-primary/50 hover:bg-primary/5",
                "hover:shadow-[0_0_12px_hsl(189_94%_55%/0.15)]"
              )}
              onClick={() => addArtist(suggestion.name, true, suggestion.imageUrl, suggestion.id)}
            >
              <div className="flex items-center gap-3">
                {suggestion.imageUrl ? (
                  <img
                    src={suggestion.imageUrl}
                    alt={suggestion.name}
                    className="w-10 h-10 rounded-full object-cover border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0">
                    <Music className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{suggestion.name}</div>
                  {suggestion.genres && suggestion.genres.length > 0 && (
                    <div className="text-xs text-muted-foreground truncate">
                      {suggestion.genres.join(', ')}
                    </div>
                  )}
                </div>
                <Button
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    addArtist(suggestion.name, true, suggestion.imageUrl, suggestion.id);
                  }}
                  className={cn(
                    "text-xs h-7 px-3",
                    "bg-primary/20 text-primary border border-primary/40",
                    "hover:bg-primary/30 hover:border-primary/60"
                  )}
                >
                  Add
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {currentArtist.trim() && artistSuggestions.length === 0 && !isSearching && currentArtist.trim().length >= 3 && (
        <Button
          variant="outline"
          onClick={() => handleManualAdd(true)}
          className={cn(
            "w-full",
            "bg-white/[0.03] border-white/[0.1]",
            "hover:border-primary/50 hover:bg-primary/5"
          )}
        >
          Add "{currentArtist}"
        </Button>
      )}

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
