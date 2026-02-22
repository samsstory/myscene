import { useState, useCallback, useEffect } from "react";
import { Music, MapPin, Trash2, ChevronDown, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import ArtistTagInput from "./ArtistTagInput";
import CompactDateSelector, { DatePrecision } from "./CompactDateSelector";
import { ParsedShow } from "./TextImportStep";

import type { Artist } from "@/types/show";

interface ReviewedTextShow {
  id: string;
  artists: Artist[];
  venue: string;
  venueId: string | null;
  venueLocation: string;
  date: Date | null;
  datePrecision: DatePrecision;
  selectedMonth: string;
  selectedYear: string;
  isValid: boolean;
}

interface TextReviewStepProps {
  parsedShows: ParsedShow[];
  onComplete: (shows: ReviewedTextShow[]) => void;
  isSubmitting: boolean;
}

// Individual card component
const TextReviewCard = ({
  show,
  onUpdate,
  onRemove,
  isExpanded,
  onToggle,
}: {
  show: ParsedShow;
  onUpdate: (data: ReviewedTextShow) => void;
  onRemove: (id: string) => void;
  isExpanded: boolean;
  onToggle: () => void;
}) => {
  // Parse initial artists from the comma-separated string
  const initialArtists: Artist[] = show.artist.split(',').map((name, i) => ({
    name: name.trim(),
    isHeadliner: i === 0,
    imageUrl: i === 0 ? (show.spotify?.imageUrl || undefined) : undefined,
    spotifyId: i === 0 ? (show.spotify?.id || undefined) : undefined,
  }));

  const [artists, setArtists] = useState<Artist[]>(initialArtists);
  const [venue, setVenue] = useState(show.venue);
  const [venueId, setVenueId] = useState<string | null>(null);
  const [venueLocation, setVenueLocation] = useState("");

  // Parse initial date
  const parsedDate = show.date ? new Date(show.date + 'T00:00:00') : null;
  const isValidDate = parsedDate && !isNaN(parsedDate.getTime());

  const [date, setDate] = useState<Date | null>(isValidDate ? parsedDate : null);
  const [datePrecision, setDatePrecision] = useState<DatePrecision>(
    isValidDate ? "exact" : "approximate"
  );
  const [selectedMonth, setSelectedMonth] = useState(
    isValidDate ? String(parsedDate!.getMonth() + 1).padStart(2, '0') : ""
  );
  const [selectedYear, setSelectedYear] = useState(
    isValidDate ? String(parsedDate!.getFullYear()) : show.date?.slice(0, 4) || String(new Date().getFullYear())
  );

  // Venue search
  const [venueSearch, setVenueSearch] = useState("");
  const [venueResults, setVenueResults] = useState<any[]>([]);
  const [showVenueResults, setShowVenueResults] = useState(false);
  const [isSearchingVenue, setIsSearchingVenue] = useState(false);

  const isValid = artists.length > 0;

  // Venue search effect
  useEffect(() => {
    const search = async () => {
      if (venueSearch.trim().length < 2) {
        setVenueResults([]);
        return;
      }
      setIsSearchingVenue(true);
      try {
        const { data, error } = await supabase.functions.invoke('unified-search', {
          body: { searchTerm: venueSearch.trim() },
        });
        if (!error && data?.results) {
          setVenueResults(data.results.filter((r: any) => r.type === 'venue').slice(0, 5));
        }
      } catch {
        // ignore
      } finally {
        setIsSearchingVenue(false);
      }
    };
    const timer = setTimeout(search, 300);
    return () => clearTimeout(timer);
  }, [venueSearch]);

  // Notify parent on changes
  useEffect(() => {
    onUpdate({
      id: show.id,
      artists,
      venue,
      venueId,
      venueLocation,
      date,
      datePrecision,
      selectedMonth,
      selectedYear,
      isValid,
    });
  }, [artists, venue, venueId, venueLocation, date, datePrecision, selectedMonth, selectedYear, isValid]);

  const handleVenueSelect = (result: any) => {
    setVenue(result.name);
    setVenueId(result.id);
    setVenueLocation(result.location || "");
    setVenueSearch("");
    setShowVenueResults(false);
  };

  const handleVenueInputChange = (value: string) => {
    setVenue(value);
    setVenueSearch(value);
    setVenueId(null);
    setVenueLocation("");
    setShowVenueResults(true);
  };

  const confidenceColor = show.confidence === 'high' ? 'bg-green-500' : show.confidence === 'medium' ? 'bg-amber-500' : 'bg-red-500';
  const headerArtistText = artists.length > 0 ? artists.map(a => a.name).join(", ") : "Add Info";
  const spotifyImage = show.spotify?.imageUrl;

  return (
    <Collapsible open={isExpanded} onOpenChange={onToggle}>
      <div className={cn(
        "rounded-xl transition-all duration-300",
        "bg-white/[0.03] backdrop-blur-sm border",
        isValid
          ? "border-primary/40 shadow-[0_0_20px_hsl(189_94%_55%/0.15)]"
          : "border-white/[0.08] border-dashed"
      )}>
        {/* Header */}
        <CollapsibleTrigger asChild>
          <button type="button" className="w-full flex items-center gap-3 p-3 transition-colors hover:bg-white/[0.02]">
            {/* Artist image or fallback */}
            <div className={cn(
              "relative flex-shrink-0",
              isValid && "ring-2 ring-primary/60 ring-offset-2 ring-offset-background rounded-full"
            )}>
              {spotifyImage ? (
                <img src={spotifyImage} alt={artists[0]?.name} className="w-12 h-12 rounded-full object-cover" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
                  <Music className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              {isValid && (
                <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary flex items-center justify-center shadow-lg">
                  <Check className="h-3 w-3 text-primary-foreground" />
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 text-left">
              <div className="flex items-center gap-2">
                <div className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", confidenceColor)} />
                <p className={cn(
                  "text-sm truncate",
                  artists.length > 0 ? "font-medium text-foreground" : "text-white/60"
                )}>
                  {headerArtistText}
                </p>
              </div>
              {venue && (
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                  <MapPin className="h-3 w-3" />
                  {venue}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onRemove(show.id); }}
              className="p-1.5 rounded-full hover:bg-destructive/20 transition-colors flex-shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
            </button>

            <ChevronDown className={cn("h-4 w-4 text-muted-foreground transition-transform", isExpanded && "rotate-180")} />
          </button>
        </CollapsibleTrigger>

        {/* Expanded */}
        <CollapsibleContent className="overflow-hidden data-[state=open]:animate-accordion-down data-[state=closed]:animate-accordion-up">
          <div className="px-3 pb-3 space-y-3 border-t border-white/[0.06]">
            {/* Artist */}
            <div className="mt-3">
              <Label className="text-xs text-muted-foreground mb-1.5 block">
                Artist <span className="text-destructive">*</span>
              </Label>
              <ArtistTagInput
                artists={artists}
                onArtistsChange={setArtists}
                placeholder="Add artists..."
                autoFocus={isExpanded && artists.length === 0}
              />
            </div>

            {/* Venue */}
            <div className="relative">
              <Label className="text-xs text-muted-foreground mb-1.5 block">Venue</Label>
              <Input
                placeholder="Search venue..."
                value={venue}
                onChange={(e) => handleVenueInputChange(e.target.value)}
                onFocus={() => setShowVenueResults(true)}
                onBlur={() => setTimeout(() => setShowVenueResults(false), 200)}
              />
              {isSearchingVenue && (
                <div className="absolute right-3 top-[calc(50%+8px)] -translate-y-1/2">
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {showVenueResults && venueResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-popover/95 backdrop-blur-sm border border-white/[0.1] rounded-md shadow-lg max-h-36 overflow-y-auto">
                  {venueResults.map((result: any) => (
                    <button
                      key={result.id}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => handleVenueSelect(result)}
                      className="w-full text-left px-3 py-2 text-sm hover:bg-primary/10 flex items-center gap-2"
                    >
                      <MapPin className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                      <div className="min-w-0">
                        <span className="font-medium">{result.name}</span>
                        {result.location && <span className="text-muted-foreground ml-2 text-xs">{result.location}</span>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date */}
            <div>
              <Label className="text-xs text-muted-foreground mb-1.5 block">Date</Label>
              <CompactDateSelector
                date={date}
                precision={datePrecision}
                selectedMonth={selectedMonth}
                selectedYear={selectedYear}
                hasExifDate={false}
                onDateChange={setDate}
                onPrecisionChange={setDatePrecision}
                onMonthChange={setSelectedMonth}
                onYearChange={setSelectedYear}
              />
            </div>
          </div>
        </CollapsibleContent>
      </div>
    </Collapsible>
  );
};

const TextReviewStep = ({ parsedShows, onComplete, isSubmitting }: TextReviewStepProps) => {
  const [shows, setShows] = useState<ParsedShow[]>(parsedShows);
  const [reviewedShows, setReviewedShows] = useState<Map<string, ReviewedTextShow>>(new Map());
  const [expandedId, setExpandedId] = useState<string | null>(shows[0]?.id || null);

  const handleUpdate = useCallback((data: ReviewedTextShow) => {
    setReviewedShows(prev => {
      const next = new Map(prev);
      next.set(data.id, data);
      return next;
    });
  }, []);

  const handleRemove = (id: string) => {
    setShows(prev => prev.filter(s => s.id !== id));
    setReviewedShows(prev => {
      const next = new Map(prev);
      next.delete(id);
      return next;
    });
  };

  const handleToggle = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  const validShows = Array.from(reviewedShows.values()).filter(s => s.isValid);

  const handleSubmit = () => {
    onComplete(validShows);
  };

  return (
    <div className="space-y-4">
      {/* Progress */}
      <div className="text-center space-y-3">
        <p className="text-sm text-muted-foreground">
          Confirm artists, venues, and dates for each show.
        </p>
        <div className="flex items-center justify-center gap-3">
          <div className="flex gap-1.5">
            {shows.map((show) => (
              <div
                key={show.id}
                className={cn(
                  "w-2.5 h-2.5 rounded-full transition-all duration-300",
                  reviewedShows.get(show.id)?.isValid
                    ? "bg-primary shadow-[0_0_8px_hsl(189_94%_55%/0.6)]"
                    : "bg-white/20"
                )}
              />
            ))}
          </div>
          <span className={cn(
            "text-sm font-medium",
            validShows.length > 0 ? "text-primary" : "text-muted-foreground"
          )}>
            {validShows.length} of {shows.length} ready
          </span>
        </div>
      </div>

      {/* Cards */}
      <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1">
        {shows.map((show) => (
          <TextReviewCard
            key={show.id}
            show={show}
            onUpdate={handleUpdate}
            onRemove={handleRemove}
            isExpanded={expandedId === show.id}
            onToggle={() => handleToggle(show.id)}
          />
        ))}
      </div>

      {shows.length === 0 && (
        <p className="text-center text-sm text-muted-foreground py-8">All shows removed. Go back to try again.</p>
      )}

      {/* Submit CTA */}
      <Button
        onClick={handleSubmit}
        disabled={validShows.length === 0 || isSubmitting}
        className={cn(
          "w-full py-6 text-base font-semibold rounded-xl transition-all duration-200",
          "bg-gradient-to-r from-[hsl(189,94%,55%)] via-primary to-[hsl(17,88%,60%)]",
          "shadow-lg shadow-primary/25",
          "hover:shadow-primary/40 hover:scale-[1.01]",
          "disabled:opacity-50 disabled:shadow-none disabled:scale-100"
        )}
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Adding shows...
          </>
        ) : (
          <>Add {validShows.length} show{validShows.length !== 1 ? 's' : ''}</>
        )}
      </Button>
    </div>
  );
};

export default TextReviewStep;
export type { ReviewedTextShow };
