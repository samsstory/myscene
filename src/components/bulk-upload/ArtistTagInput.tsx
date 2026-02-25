import { useState, useRef } from "react";
import { X, Loader2, Music, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { useArtistSearch } from "@/hooks/useArtistSearch";

import type { BaseArtist as Artist } from "@/types/show";

interface ArtistTagInputProps {
  artists: Artist[];
  onArtistsChange: (artists: Artist[]) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}

const ArtistTagInput = ({ 
  artists, 
  onArtistsChange, 
  placeholder = "Add artists...",
  autoFocus = false,
  className
}: ArtistTagInputProps) => {
  const [inputValue, setInputValue] = useState("");
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const { results: searchResults, isSearching, spotifyUnavailable, clearResults } = useArtistSearch(inputValue);

  const addArtist = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    
    if (artists.some(a => a.name.toLowerCase() === trimmedName.toLowerCase())) {
      setInputValue("");
      clearResults();
      return;
    }

    const isHeadliner = artists.length === 0;
    onArtistsChange([...artists, { name: trimmedName, isHeadliner }]);
    setInputValue("");
    clearResults();
    setShowResults(false);
  };

  const removeArtist = (index: number) => {
    const newArtists = artists.filter((_, i) => i !== index);
    if (newArtists.length > 0 && index === 0) {
      newArtists[0] = { ...newArtists[0], isHeadliner: true };
    }
    onArtistsChange(newArtists);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      addArtist(inputValue);
    } else if (e.key === 'Backspace' && !inputValue && artists.length > 0) {
      removeArtist(artists.length - 1);
    }
  };

  const handleContainerClick = () => {
    inputRef.current?.focus();
  };

  return (
    <div className="relative" ref={containerRef}>
      <div
        onClick={handleContainerClick}
        className={cn(
          "flex flex-wrap items-center gap-1.5 min-h-10 px-3 py-1.5 rounded-md border bg-white/[0.03] cursor-text transition-all duration-200",
          "focus-within:ring-2 focus-within:ring-primary/30 focus-within:ring-offset-2 focus-within:ring-offset-background",
          "focus-within:border-primary/50 focus-within:shadow-[0_0_12px_hsl(189_94%_55%/0.15)]",
          artists.length > 0 ? "border-primary/40" : "border-white/[0.1]",
          className
        )}
      >
        {artists.map((artist, index) => (
          <span
            key={index}
            className={cn(
              "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium",
              "bg-primary/15 text-primary border border-primary/30"
            )}
          >
            {artist.name}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                removeArtist(index);
              }}
              className="hover:bg-primary/20 rounded-full p-0.5 -mr-0.5"
            >
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
        
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onFocus={() => setShowResults(true)}
          onBlur={() => setTimeout(() => setShowResults(false), 200)}
          onKeyDown={handleKeyDown}
          placeholder={artists.length === 0 ? placeholder : ""}
          autoFocus={autoFocus}
          className="flex-1 min-w-[80px] bg-transparent border-none outline-none text-sm placeholder:text-muted-foreground"
        />
        
        {isSearching && (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {inputValue.trim().length > 0 && (
        <p className="text-xs text-muted-foreground mt-1 px-1">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> to add "{inputValue}"
        </p>
      )}

      {spotifyUnavailable && showResults && searchResults.length > 0 && (
        <div className="flex items-center gap-1.5 px-1 mt-1 text-xs text-muted-foreground">
          <WifiOff className="h-3 w-3 flex-shrink-0" />
          <span>Showing local results only</span>
        </div>
      )}

      {showResults && searchResults.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover/95 backdrop-blur-sm border border-white/[0.1] rounded-md shadow-lg max-h-48 overflow-y-auto">
          {searchResults.map((result) => (
            <button
              key={result.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addArtist(result.name)}
              className={cn(
                "w-full text-left px-3 py-2.5 text-sm transition-all duration-150 flex items-center gap-2.5",
                "hover:bg-primary/10 hover:border-l-2 hover:border-primary border-l-2 border-transparent"
              )}
            >
              {result.imageUrl ? (
                <img
                  src={result.imageUrl}
                  alt={result.name}
                  className="w-7 h-7 rounded-full object-cover border border-white/10 flex-shrink-0"
                />
              ) : (
                <div className="w-7 h-7 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center flex-shrink-0">
                  <Music className="h-3 w-3 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <span className="font-medium">{result.name}</span>
                {result.subtitle && (
                  <span className="text-muted-foreground ml-2 text-xs">{result.subtitle}</span>
                )}
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtistTagInput;
