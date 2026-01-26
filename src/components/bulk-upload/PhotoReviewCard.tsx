import { useState, useEffect } from "react";
import { Calendar, Music, MapPin, AlertCircle, Check } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { PhotoWithExif } from "@/lib/exif-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

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
  initialData?: ReviewedShow;
}

interface SearchResult {
  type: 'artist' | 'venue';
  id: string;
  name: string;
  subtitle?: string;
  location?: string;
}

const PhotoReviewCard = ({ photo, index, total, onUpdate, initialData }: PhotoReviewCardProps) => {
  const [artist, setArtist] = useState(initialData?.artist || "");
  const [venue, setVenue] = useState(initialData?.venue || "");
  const [venueId, setVenueId] = useState<string | null>(initialData?.venueId || null);
  const [venueLocation, setVenueLocation] = useState(initialData?.venueLocation || "");
  const [date, setDate] = useState<Date | null>(initialData?.date || photo.exifData.date);
  const [isApproximate, setIsApproximate] = useState(initialData?.isApproximate || !photo.exifData.hasExif);
  
  const [artistSearch, setArtistSearch] = useState("");
  const [venueSearch, setVenueSearch] = useState("");
  const [artistResults, setArtistResults] = useState<SearchResult[]>([]);
  const [venueResults, setVenueResults] = useState<SearchResult[]>([]);
  const [showArtistResults, setShowArtistResults] = useState(false);
  const [showVenueResults, setShowVenueResults] = useState(false);
  const [isSearchingArtist, setIsSearchingArtist] = useState(false);
  const [isSearchingVenue, setIsSearchingVenue] = useState(false);

  const isValid = artist.trim().length > 0;

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
    <div className={cn(
      "rounded-xl border bg-card p-4 space-y-4 transition-all",
      isValid ? "border-primary/50" : "border-border"
    )}>
      {/* Header with progress */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-muted-foreground">
          Show {index + 1} of {total}
        </span>
        {isValid ? (
          <div className="flex items-center gap-1 text-primary text-sm">
            <Check className="h-4 w-4" />
            Ready
          </div>
        ) : (
          <div className="flex items-center gap-1 text-amber-500 text-sm">
            <AlertCircle className="h-4 w-4" />
            Add artist
          </div>
        )}
      </div>

      {/* Photo and form */}
      <div className="flex gap-4">
        {/* Photo thumbnail */}
        <div className="flex-shrink-0">
          <img
            src={photo.previewUrl}
            alt="Show photo"
            className="w-24 h-24 object-cover rounded-lg"
          />
        </div>

        {/* Form fields */}
        <div className="flex-1 space-y-3 min-w-0">
          {/* Artist input */}
          <div className="relative">
            <div className="relative">
              <Music className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Artist name *"
                value={artist}
                onChange={(e) => handleArtistInputChange(e.target.value)}
                onFocus={() => setShowArtistResults(true)}
                onBlur={() => setTimeout(() => setShowArtistResults(false), 200)}
                className="pl-9"
              />
            </div>
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
            <div className="relative">
              <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Venue (optional)"
                value={venue}
                onChange={(e) => handleVenueInputChange(e.target.value)}
                onFocus={() => setShowVenueResults(true)}
                onBlur={() => setTimeout(() => setShowVenueResults(false), 200)}
                className="pl-9"
              />
            </div>
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

          {/* Date - compact inline */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <input
                type="date"
                value={date ? format(date, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setDate(val ? new Date(val + "T12:00:00") : null);
                }}
                className={cn(
                  "w-full h-10 pl-9 pr-3 text-sm rounded-md border border-input bg-background",
                  !date && "[color:transparent]"
                )}
                max={format(new Date(), "yyyy-MM-dd")}
              />
              {!date && (
                <span className="absolute left-9 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none">
                  Date
                </span>
              )}
            </div>
            <label className="flex items-center gap-1.5 cursor-pointer flex-shrink-0">
              <Checkbox
                id={`approx-${photo.id}`}
                checked={isApproximate}
                onCheckedChange={(checked) => setIsApproximate(!!checked)}
                className="h-3.5 w-3.5"
              />
              <span className="text-xs text-muted-foreground">Approx</span>
            </label>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoReviewCard;
