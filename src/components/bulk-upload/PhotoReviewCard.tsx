import { useState, useEffect, useRef } from "react";
import { Pencil, X, MapPin, ChevronDown, Loader2, Plus, Minus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { PhotoWithExif, VenueSuggestion, extractExifData } from "@/lib/exif-utils";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import ArtistTagInput from "./ArtistTagInput";

interface Artist {
  name: string;
  isHeadliner: boolean;
}

export interface ReviewedShow {
  photoId: string;
  file: File;
  previewUrl: string;
  artists: Artist[];
  venue: string;
  venueId: string | null;
  venueLocation: string;
  date: Date | null;
  isApproximate: boolean;
  isValid: boolean;
  // Optional rating fields
  artistPerformance: number | null;
  sound: number | null;
  lighting: number | null;
  crowd: number | null;
  venueVibe: number | null;
  notes: string;
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

// Compact rating pills for bulk upload
const CompactRatingPills = ({ 
  value, 
  onChange,
  label 
}: { 
  value: number | null; 
  onChange: (val: number | null) => void;
  label: string;
}) => (
  <div className="flex items-center justify-between gap-2">
    <Label className="text-xs text-muted-foreground whitespace-nowrap">{label}</Label>
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map((num) => (
        <button
          key={num}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onChange(value === num ? null : num);
          }}
          className={cn(
            "w-7 h-7 rounded-full text-xs font-medium transition-all duration-150",
            value === num
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground hover:bg-muted/80"
          )}
        >
          {num}
        </button>
      ))}
    </div>
  </div>
);

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
  const [artists, setArtists] = useState<Artist[]>(initialData?.artists || []);
  const [venue, setVenue] = useState(initialData?.venue || photo.suggestedVenue?.name || "");
  const [venueId, setVenueId] = useState<string | null>(initialData?.venueId || photo.suggestedVenue?.id || null);
  const [venueLocation, setVenueLocation] = useState(initialData?.venueLocation || photo.suggestedVenue?.address || "");
  const [date, setDate] = useState<Date | null>(initialData?.date || photo.exifData.date);
  const [isApproximate, setIsApproximate] = useState(initialData?.isApproximate || !photo.exifData.hasExif);
  const [previewUrl, setPreviewUrl] = useState(photo.previewUrl);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track if we're using a suggested venue
  const [isAutoDetectedVenue, setIsAutoDetectedVenue] = useState(!!photo.suggestedVenue);
  const [showManualSearch, setShowManualSearch] = useState(false);
  
  const [venueSearch, setVenueSearch] = useState("");
  const [venueResults, setVenueResults] = useState<SearchResult[]>([]);
  const [showVenueResults, setShowVenueResults] = useState(false);
  const [isSearchingVenue, setIsSearchingVenue] = useState(false);

  // Rating & notes state
  const [showRatings, setShowRatings] = useState(false);
  const [artistPerformance, setArtistPerformance] = useState<number | null>(initialData?.artistPerformance ?? null);
  const [sound, setSound] = useState<number | null>(initialData?.sound ?? null);
  const [lighting, setLighting] = useState<number | null>(initialData?.lighting ?? null);
  const [crowd, setCrowd] = useState<number | null>(initialData?.crowd ?? null);
  const [venueVibe, setVenueVibe] = useState<number | null>(initialData?.venueVibe ?? null);
  const [notes, setNotes] = useState(initialData?.notes ?? "");

  const isValid = artists.length > 0;
  
  // Check if any ratings have been added
  const hasRatings = artistPerformance !== null || sound !== null || lighting !== null || crowd !== null || venueVibe !== null || notes.trim().length > 0;

  // Update venue when photo's suggested venue changes
  useEffect(() => {
    if (photo.suggestedVenue && !initialData?.venue) {
      setVenue(photo.suggestedVenue.name);
      setVenueId(photo.suggestedVenue.id || null);
      setVenueLocation(photo.suggestedVenue.address);
      setIsAutoDetectedVenue(true);
    }
  }, [photo.suggestedVenue, initialData?.venue]);

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
      exifData,
      venueMatchStatus: 'pending', // Will be re-matched
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
      artists,
      venue,
      venueId,
      venueLocation,
      date,
      isApproximate,
      isValid,
      artistPerformance,
      sound,
      lighting,
      crowd,
      venueVibe,
      notes,
    });
  }, [artists, venue, venueId, venueLocation, date, isApproximate, isValid, artistPerformance, sound, lighting, crowd, venueVibe, notes]);

  // Search venues (only when manual search is active)
  useEffect(() => {
    if (!showManualSearch) return;
    
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
  }, [venueSearch, showManualSearch]);

  const handleVenueSelect = (result: SearchResult) => {
    setVenue(result.name);
    setVenueId(result.id);
    setVenueLocation(result.location || "");
    setVenueSearch("");
    setShowVenueResults(false);
    setShowManualSearch(false);
    setIsAutoDetectedVenue(false);
  };

  const handleSuggestedVenueSelect = (suggestion: VenueSuggestion) => {
    setVenue(suggestion.name);
    setVenueId(suggestion.id || null);
    setVenueLocation(suggestion.address);
    setIsAutoDetectedVenue(true);
    setShowManualSearch(false);
  };

  const handleVenueInputChange = (value: string) => {
    setVenue(value);
    setVenueSearch(value);
    setVenueId(null);
    setVenueLocation("");
    setShowVenueResults(true);
    setIsAutoDetectedVenue(false);
  };

  const handleSwitchToManualSearch = () => {
    setShowManualSearch(true);
    setVenue("");
    setVenueId(null);
    setVenueLocation("");
    setVenueSearch("");
    setIsAutoDetectedVenue(false);
  };

  // Get display text for collapsed header
  const headerArtistText = artists.length > 0 
    ? artists.map(a => a.name).join(", ")
    : "Add Artist";

  // Build venue suggestions list
  const allVenueSuggestions = [
    photo.suggestedVenue,
    ...(photo.alternativeVenues || [])
  ].filter(Boolean) as VenueSuggestion[];

  const hasVenueSuggestions = allVenueSuggestions.length > 0;
  const isVenueMatching = photo.venueMatchStatus === 'pending';

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
                artists.length > 0 ? "font-medium" : "text-orange-400"
              )}>
                {headerArtistText}
              </p>
              {venue && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                  {isAutoDetectedVenue && <MapPin className="h-3 w-3 text-primary" />}
                  {venue}
                </p>
              )}
            </div>
          </button>
        </CollapsibleTrigger>

        {/* Expanded content */}
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-3 pb-3 space-y-3 border-t border-border/50">
            {/* Artist tag input */}
            <div className="mt-3">
              <ArtistTagInput
                artists={artists}
                onArtistsChange={setArtists}
                placeholder="Add artists..."
                autoFocus={isExpanded && artists.length === 0}
              />
            </div>

            {/* Venue input - with auto-detect or manual search */}
            <div className="relative">
              {isVenueMatching ? (
                <div className="h-10 flex items-center gap-2 px-3 text-sm text-muted-foreground border rounded-md bg-muted/50">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Finding nearby venues...
                </div>
              ) : hasVenueSuggestions && !showManualSearch ? (
                // Show dropdown with suggestions
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "w-full h-auto min-h-10 flex items-start justify-between px-3 py-2 text-left border rounded-md bg-background hover:bg-accent/50 transition-colors",
                        venue ? "text-foreground" : "text-muted-foreground"
                      )}
                    >
                      <div className="flex-1 min-w-0">
                        {venue ? (
                          <>
                            <div className="flex items-center gap-1.5 text-sm font-medium">
                              <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                              <span className="truncate">{venue}</span>
                            </div>
                            {venueLocation && (
                              <p className="text-xs text-muted-foreground truncate mt-0.5 ml-5">
                                {venueLocation}
                              </p>
                            )}
                          </>
                        ) : (
                          <span className="text-sm">Select venue</span>
                        )}
                      </div>
                      <ChevronDown className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="start" className="w-[var(--radix-dropdown-menu-trigger-width)]">
                    {allVenueSuggestions.map((suggestion, idx) => (
                      <DropdownMenuItem
                        key={suggestion.externalPlaceId || suggestion.id || idx}
                        onClick={() => handleSuggestedVenueSelect(suggestion)}
                        className="flex items-start gap-2 py-2"
                      >
                        <MapPin className="h-4 w-4 text-primary flex-shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium truncate">{suggestion.name}</p>
                          {suggestion.address && (
                            <p className="text-xs text-muted-foreground truncate">
                              {suggestion.address}
                            </p>
                          )}
                        </div>
                        {venue === suggestion.name && (
                          <span className="text-xs text-primary">✓</span>
                        )}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSwitchToManualSearch} className="text-muted-foreground">
                      Search for a different venue...
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : (
                // Manual search input
                <>
                  <Input
                    placeholder="Search venue..."
                    value={showManualSearch ? venueSearch : venue}
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
                  {hasVenueSuggestions && showManualSearch && (
                    <button
                      type="button"
                      onClick={() => {
                        setShowManualSearch(false);
                        if (photo.suggestedVenue) {
                          handleSuggestedVenueSelect(photo.suggestedVenue);
                        }
                      }}
                      className="mt-1 text-xs text-primary hover:underline"
                    >
                      ← Back to suggested venues
                    </button>
                  )}
                </>
              )}
            </div>

            {/* Date */}
            <div className="relative group">
              <input
                type="date"
                value={date ? format(date, "yyyy-MM-dd") : ""}
                onChange={(e) => {
                  const val = e.target.value;
                  setDate(val ? new Date(val + "T12:00:00") : null);
                }}
                className={cn(
                  "w-full h-10 px-3 text-sm rounded-md border border-input bg-background",
                  "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                  !date && "text-transparent focus:text-foreground"
                )}
                max={format(new Date(), "yyyy-MM-dd")}
              />
              {!date && (
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none group-focus-within:hidden">
                  Date (optional)
                </span>
              )}
            </div>

            {/* Add rating & notes toggle */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowRatings(!showRatings);
              }}
              className={cn(
                "flex items-center gap-1.5 text-sm transition-colors",
                hasRatings ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              {showRatings ? (
                <Minus className="h-3.5 w-3.5" />
              ) : (
                <Plus className="h-3.5 w-3.5" />
              )}
              {hasRatings ? "Edit rating & notes" : "Add rating & notes"}
            </button>

            {/* Inline rating section */}
            {showRatings && (
              <div className="space-y-4 pt-2 border-t border-border/50">
                <CompactRatingPills
                  label="Performance"
                  value={artistPerformance}
                  onChange={setArtistPerformance}
                />
                <CompactRatingPills
                  label="Sound"
                  value={sound}
                  onChange={setSound}
                />
                <CompactRatingPills
                  label="Lighting"
                  value={lighting}
                  onChange={setLighting}
                />
                <CompactRatingPills
                  label="Crowd"
                  value={crowd}
                  onChange={setCrowd}
                />
                <CompactRatingPills
                  label="Venue Vibe"
                  value={venueVibe}
                  onChange={setVenueVibe}
                />
                
                {/* Notes */}
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">My Take</Label>
                  <Textarea
                    placeholder="Add your thoughts..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    maxLength={500}
                    className="min-h-[60px] resize-none text-sm bg-muted/30 border-border"
                  />
                  <p className="text-xs text-muted-foreground text-right">
                    {notes.length}/500
                  </p>
                </div>
              </div>
            )}

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
