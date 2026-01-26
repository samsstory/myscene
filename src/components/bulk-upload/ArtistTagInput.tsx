import { useState, useEffect, useRef } from "react";
import { X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { cn } from "@/lib/utils";

interface Artist {
  name: string;
  isHeadliner: boolean;
}

interface SearchResult {
  type: 'artist' | 'venue';
  id: string;
  name: string;
  subtitle?: string;
}

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
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Search artists
  useEffect(() => {
    const search = async () => {
      if (inputValue.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke('unified-search', {
          body: { searchTerm: inputValue.trim() }
        });

        if (!error && data?.results) {
          setSearchResults(
            data.results
              .filter((r: SearchResult) => r.type === 'artist')
              .slice(0, 5)
          );
        }
      } catch (error) {
        console.error('Artist search error:', error);
      } finally {
        setIsSearching(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [inputValue]);

  const addArtist = (name: string) => {
    const trimmedName = name.trim();
    if (!trimmedName) return;
    
    // Check if already added
    if (artists.some(a => a.name.toLowerCase() === trimmedName.toLowerCase())) {
      setInputValue("");
      setSearchResults([]);
      return;
    }

    // First artist is headliner, rest are not
    const isHeadliner = artists.length === 0;
    onArtistsChange([...artists, { name: trimmedName, isHeadliner }]);
    setInputValue("");
    setSearchResults([]);
    setShowResults(false);
  };

  const removeArtist = (index: number) => {
    const newArtists = artists.filter((_, i) => i !== index);
    // If we removed the headliner, make the new first artist the headliner
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
      // Remove last artist when backspacing on empty input
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
          "flex flex-wrap items-center gap-1.5 min-h-10 px-3 py-1.5 rounded-md border border-input bg-background cursor-text",
          "focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2",
          artists.length > 0 && "border-primary/40",
          className
        )}
      >
        {/* Artist pills */}
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
        
        {/* Input field */}
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

      {/* Helper hint when typing */}
      {inputValue.trim().length > 0 && (
        <p className="text-xs text-muted-foreground mt-1 px-1">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px] font-mono">Enter</kbd> to add "{inputValue}"
        </p>
      )}

      {/* Search results dropdown */}
      {showResults && searchResults.length > 0 && (
        <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {searchResults.map((result) => (
            <button
              key={result.id}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => addArtist(result.name)}
              className="w-full text-left px-3 py-2 hover:bg-accent text-sm transition-colors"
            >
              <span className="font-medium">{result.name}</span>
              {result.subtitle && (
                <span className="text-muted-foreground ml-2 text-xs">{result.subtitle}</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ArtistTagInput;
