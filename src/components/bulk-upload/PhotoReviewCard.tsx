import { useState, useEffect, useRef } from "react";
import { Pencil, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhotoWithExif, extractExifData } from "@/lib/exif-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export interface ReviewedShow {
  photoId: string;
  file: File;
  previewUrl: string;
  artist: string;
  venue: string;
  venueId: string | null;
  venueLocation: string;
  date: Date | null;
  isApproximate: boolean;
  isValid: boolean;
}

interface PhotoReviewCardProps {
  photo: PhotoWithExif;
  index: number;
  total: number;
  onUpdate: (data: ReviewedShow) => void;
  onPhotoReplace: (photoId: string, newPhoto: PhotoWithExif) => void;
  onDelete: (photoId: string) => void;
  initialData?: ReviewedShow;
  isExpanded: boolean;
  onToggle: () => void;
}

interface SearchResult {
  type: 'artist' | 'venue';
  id: string;
  name: string;
  subtitle?: string;
  location?: string;
}

const PhotoReviewCard = ({ 
  photo, 
  index, 
  total, 
  onUpdate, 
  onPhotoReplace, 
  onDelete, 
  initialData,
  isExpanded,
  onToggle
}: PhotoReviewCardProps) => {
  const [artist, setArtist] = useState(initialData?.artist || "");
  const [venue, setVenue] = useState(initialData?.venue || "");
  const [venueId, setVenueId] = useState<string | null>(initialData?.venueId || null);
  const [venueLocation, setVenueLocation] = useState(initialData?.venueLocation || "");
  const [date, setDate] = useState<Date | null>(initialData?.date || photo.exifData.date);
  const [isApproximate, setIsApproximate] = useState(initialData?.isApproximate || !photo.exifData.hasExif);
  const [previewUrl, setPreviewUrl] = useState(photo.previewUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [artistSearch, setArtistSearch] = useState("");
  const [venueSearch, setVenueSearch] = useState("");
  const [artistResults, setArtistResults] = useState<SearchResult[]>([]);
  const [venueResults, setVenueResults] = useState<SearchResult[]>([]);
  const [showArtistResults, setShowArtistResults] = useState(false);
  const [showVenueResults, setShowVenueResults] = useState(false);
  const [isSearchingArtist, setIsSearchingArtist] = useState(false);
  const [isSearchingVenue, setIsSearchingVenue] = useState(false);

  const isValid = artist.trim().length > 0;

  // Update preview URL when photo changes
  useEffect(() => {
    setPreviewUrl(photo.previewUrl);
  }, [photo.previewUrl]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const exifData = await extractExifData(file);
    const newPreviewUrl = URL.createObjectURL(file);
    
    if (previewUrl !== photo.previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    
    const newPhoto: PhotoWithExif = {
      id: photo.id,
      file,
      previewUrl: newPreviewUrl,
      exifData
    };
    
    setPreviewUrl(newPreviewUrl);
    
    if (exifData.date) {
      setDate(exifData.date);
      setIsApproximate(false);
    }
    
    onPhotoReplace(photo.id, newPhoto);
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Update parent whenever data changes
  useEffect(() => {
    onUpdate({
      photoId: photo.id,
      file: photo.file,
      previewUrl: photo.previewUrl,
      artist,
      venue,
      venueId,
      venueLocation,
      date,
      isApproximate,
      isValid,
    });
  }, [artist, venue, venueId, venueLocation, date, isApproximate, isValid]);

  // Search artists
  useEffect(() => {
    const search = async () => {
      if (artistSearch.trim().length < 2) {
        setArtistResults([]);
        return;
      }

      setIsSearchingArtist(true);
      try {
        const { data, error } = await supabase.functions.invoke('unified-search', {
          body: { searchTerm: artistSearch.trim() }
        });

        if (!error && data?.results) {
          setArtistResults(data.results.filter((r: SearchResult) => r.type === 'artist').slice(0, 5));
        }
      } catch (error) {
        console.error('Artist search error:', error);
      } finally {
        setIsSearchingArtist(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [artistSearch]);

  // Search venues
  useEffect(() => {
    const search = async () => {
      if (venueSearch.trim().length < 2) {
        setVenueResults([]);
        return;
      }

      setIsSearchingVenue(true);
      try {
        const { data, error } = await supabase.functions.invoke('unified-search', {
          body: { searchTerm: venueSearch.trim() }
        });

        if (!error && data?.results) {
          setVenueResults(data.results.filter((r: SearchResult) => r.type === 'venue').slice(0, 5));
        }
      } catch (error) {
        console.error('Venue search error:', error);
      } finally {
        setIsSearchingVenue(false);
      }
    };

    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [venueSearch]);

  const handleArtistSelect = (result: SearchResult) => {
    setArtist(result.name);
    setArtistSearch("");
    setShowArtistResults(false);
  };

  const handleVenueSelect = (result: SearchResult) => {
    setVenue(result.name);
    setVenueId(result.id);
    setVenueLocation(result.location || "");
    setVenueSearch("");
    setShowVenueResults(false);
  };

  const handleArtistInputChange = (value: string) => {
    setArtist(value);
    setArtistSearch(value);
    setShowArtistResults(true);
  };

  const handleVenueInputChange = (value: string) => {
    setVenue(value);
    setVenueSearch(value);
    setVenueId(null);
    setVenueLocation("");
    setShowVenueResults(true);
  };


  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={cn(
        "rounded-xl border bg-card transition-all",
        isValid ? "border-primary/50" : "border-border border-dashed"
      )}>
        {/* Header - always visible */}
        <CollapsibleTrigger asChild>
          <button 
            type="button" 
            className="w-full flex items-center gap-3 p-3 transition-colors hover:bg-muted/50 active:bg-muted/70"
          >
            {/* Thumbnail with edit/delete overlay */}
            <div className="relative flex-shrink-0 group">
              <img 
                src={previewUrl} 
                alt="Show photo" 
                className="w-12 h-12 object-cover rounded-lg"
              />
              {isExpanded && (
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/40 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      fileInputRef.current?.click();
                    }}
                    className="p-1 rounded-full bg-black/50 hover:bg-black/70"
                  >
                    <Pencil className="h-3 w-3 text-white" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(photo.id);
                    }}
                    className="p-1 rounded-full bg-black/50 hover:bg-destructive"
                  >
                    <X className="h-3 w-3 text-white" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 text-left">
              <p className={cn(
                "text-sm truncate",
                artist ? "font-medium" : "text-orange-400"
              )}>
                {artist || "Add Artist"}
              </p>
              {venue && (
                <p className="text-xs text-muted-foreground truncate">{venue}</p>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Expanded content */}
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-3 pb-3 space-y-3 border-t border-border/50">
            {/* Artist input */}
            <div className="relative mt-3">
              <Input
                placeholder="Artist*"
                value={artist}
                onChange={(e) => handleArtistInputChange(e.target.value)}
                onFocus={() => setShowArtistResults(true)}
                onBlur={() => setTimeout(() => setShowArtistResults(false), 200)}
                className={cn(artist.trim() && "border-primary/40")}
              />
              {showArtistResults && artistResults.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {artistResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleArtistSelect(result)}
                      className="w-full text-left px-3 py-2 hover:bg-accent text-sm"
                    >
                      {result.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Venue input */}
            <div className="relative">
              <Input
                placeholder="Venue"
                value={venue}
                onChange={(e) => handleVenueInputChange(e.target.value)}
                onFocus={() => setShowVenueResults(true)}
                onBlur={() => setTimeout(() => setShowVenueResults(false), 200)}
              />
              {showVenueResults && venueResults.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-md max-h-48 overflow-y-auto">
                  {venueResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => handleVenueSelect(result)}
                      className="w-full text-left px-3 py-2 hover:bg-accent"
                    >
                      <div className="text-sm font-medium">{result.name}</div>
                      {result.location && (
                        <div className="text-xs text-muted-foreground">{result.location}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div className="relative">
              <input
                type="date"
                value={date ? format(date, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setDate(val ? new Date(val + "T12:00:00") : null);
                }}
                className={cn(
                  "w-full h-10 px-3 text-sm rounded-md border border-input bg-background",
                  !date && "[color:transparent]"
                )}
                max={format(new Date(), "yyyy-MM-dd")}
              />
              {!date && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  Date (optional)
                </span>
              )}
            </div>

            {/* Hidden file input for photo replacement */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

export default PhotoReviewCard;
