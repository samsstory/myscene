import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ChevronDown, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface Artist {
  name: string;
  isHeadliner: boolean;
}

interface Show {
  id: string;
  artists: Artist[];
  venue: {
    name: string;
    location: string;
  };
  date: string;
  rating: number;
  artistPerformance?: number | null;
  sound?: number | null;
  lighting?: number | null;
  crowd?: number | null;
  venueVibe?: number | null;
  photo_url?: string | null;
}

interface RatingEdits {
  artistPerformance: number | null;
  sound: number | null;
  lighting: number | null;
  crowd: number | null;
  venueVibe: number | null;
}

interface DemoIncompleteRatingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shows: Show[];
}

const RATING_CATEGORIES = [
  { key: 'artistPerformance', label: 'Artist' },
  { key: 'sound', label: 'Sound' },
  { key: 'lighting', label: 'Lighting' },
  { key: 'crowd', label: 'Crowd' },
  { key: 'venueVibe', label: 'Vibe' },
] as const;

type RatingKey = typeof RATING_CATEGORIES[number]['key'];

const RatingPills = ({ 
  value, 
  onChange,
  filled 
}: { 
  value: number | null; 
  onChange: (v: number) => void;
  filled: boolean;
}) => (
  <div className="flex gap-1.5">
    {[1, 2, 3, 4, 5].map((n) => (
      <button
        key={n}
        onClick={() => onChange(n)}
        className={cn(
          "w-8 h-8 rounded-full text-sm font-medium transition-all",
          value === n
            ? "bg-primary text-primary-foreground shadow-lg"
            : filled
            ? "bg-white/10 text-white/60 hover:bg-white/20"
            : "bg-white/[0.05] text-white/40 hover:bg-white/10 border border-dashed border-white/20"
        )}
      >
        {n}
      </button>
    ))}
  </div>
);

const CompletionIndicator = ({ filledCount }: { filledCount: number }) => {
  const dots = Array.from({ length: 5 }, (_, i) => i < filledCount);
  return (
    <div className="flex gap-1">
      {dots.map((filled, i) => (
        <div
          key={i}
          className={cn(
            "w-1.5 h-1.5 rounded-full",
            filled ? "bg-primary" : "bg-white/20"
          )}
        />
      ))}
    </div>
  );
};

export const DemoIncompleteRatingsSheet = ({ 
  open, 
  onOpenChange,
  shows: allShows,
}: DemoIncompleteRatingsSheetProps) => {
  // Filter to incomplete shows
  const incompleteShows = useMemo(() => {
    return allShows.filter(show => 
      show.artistPerformance === null ||
      show.sound === null ||
      show.lighting === null ||
      show.crowd === null ||
      show.venueVibe === null
    );
  }, [allShows]);

  const [edits, setEdits] = useState<Record<string, RatingEdits>>(() => {
    const initial: Record<string, RatingEdits> = {};
    incompleteShows.forEach(show => {
      initial[show.id] = {
        artistPerformance: show.artistPerformance ?? null,
        sound: show.sound ?? null,
        lighting: show.lighting ?? null,
        crowd: show.crowd ?? null,
        venueVibe: show.venueVibe ?? null,
      };
    });
    return initial;
  });

  const [expandedId, setExpandedId] = useState<string | null>(
    incompleteShows[0]?.id ?? null
  );

  const updateRating = (showId: string, key: RatingKey, value: number) => {
    setEdits(prev => ({
      ...prev,
      [showId]: {
        ...prev[showId],
        [key]: value,
      }
    }));
  };

  const getFilledCount = (showId: string): number => {
    const showEdits = edits[showId];
    if (!showEdits) return 0;
    return RATING_CATEGORIES.filter(cat => showEdits[cat.key] !== null).length;
  };

  const isShowComplete = (showId: string): boolean => {
    return getFilledCount(showId) === 5;
  };

  const completedCount = useMemo(() => {
    return incompleteShows.filter(show => isShowComplete(show.id)).length;
  }, [incompleteShows, edits]);

  const hasChanges = useMemo(() => {
    return incompleteShows.some(show => {
      const original = {
        artistPerformance: show.artistPerformance ?? null,
        sound: show.sound ?? null,
        lighting: show.lighting ?? null,
        crowd: show.crowd ?? null,
        venueVibe: show.venueVibe ?? null,
      };
      const current = edits[show.id];
      if (!current) return false;
      return JSON.stringify(original) !== JSON.stringify(current);
    });
  }, [incompleteShows, edits]);

  const toggleExpanded = (showId: string) => {
    setExpandedId(prev => prev === showId ? null : showId);
  };

  const getHeadlinerName = (show: Show): string => {
    const headliner = show.artists.find(a => a.isHeadliner);
    return headliner?.name || show.artists[0]?.name || 'Unknown Artist';
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl"
      >
        <SheetHeader className="flex-shrink-0 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => onOpenChange(false)}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SheetTitle className="text-lg font-bold">Complete Your Ratings</SheetTitle>
          </div>
          
          {/* Demo mode badge */}
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10">
            <Info className="h-4 w-4 text-white/50" />
            <span className="text-xs text-white/60">
              Demo Mode · Changes won't save
            </span>
          </div>
          
          {/* Progress indicator */}
          {incompleteShows.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">
                  {completedCount} of {incompleteShows.length} complete
                </span>
                <span className="text-white/40">
                  {Math.round((completedCount / incompleteShows.length) * 100)}%
                </span>
              </div>
              <Progress 
                value={(completedCount / incompleteShows.length) * 100} 
                className="h-1.5 bg-white/10"
              />
            </div>
          )}
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {incompleteShows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Check className="h-10 w-10 text-primary mb-2" />
              <p className="text-white/60">All shows have complete ratings!</p>
            </div>
          ) : (
            incompleteShows.map(show => {
              const isExpanded = expandedId === show.id;
              const filledCount = getFilledCount(show.id);
              const isComplete = filledCount === 5;

              return (
                <div
                  key={show.id}
                  className={cn(
                    "rounded-xl border transition-all overflow-hidden",
                    isExpanded 
                      ? "bg-white/[0.05] border-white/20" 
                      : "bg-white/[0.02] border-white/10",
                    isComplete && !isExpanded && "opacity-60"
                  )}
                >
                  {/* Collapsed header */}
                  <button
                    onClick={() => toggleExpanded(show.id)}
                    className="w-full p-3 flex items-center gap-3 text-left"
                  >
                    {/* Thumbnail */}
                    {show.photo_url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={show.photo_url} 
                          alt="" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl text-white/40">✦</span>
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white/90 truncate">
                        {getHeadlinerName(show)}
                      </div>
                      <div className="text-sm text-white/50 truncate">
                        {show.venue.name} • {format(parseISO(show.date), 'MMM d, yyyy')}
                      </div>
                    </div>

                    {/* Status */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {isComplete ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <CompletionIndicator filledCount={filledCount} />
                      )}
                      <ChevronDown 
                        className={cn(
                          "h-4 w-4 text-white/40 transition-transform",
                          isExpanded && "rotate-180"
                        )}
                      />
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-3 pb-4 space-y-4 border-t border-white/10 pt-4">
                      {RATING_CATEGORIES.map(cat => {
                        const currentValue = edits[show.id]?.[cat.key] ?? null;
                        const originalValue = show[cat.key as keyof Show];
                        const isFilled = originalValue !== null && originalValue !== undefined;

                        return (
                          <div key={cat.key} className="flex items-center justify-between">
                            <span className={cn(
                              "text-sm font-medium",
                              currentValue !== null ? "text-white/80" : "text-white/50"
                            )}>
                              {cat.label}
                            </span>
                            <RatingPills
                              value={currentValue}
                              onChange={(v) => updateRating(show.id, cat.key, v)}
                              filled={isFilled}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Save button */}
        {incompleteShows.length > 0 && (
          <div className="flex-shrink-0 pt-4 border-t border-white/10">
            <Button
              className="w-full"
              size="lg"
              disabled={!hasChanges}
              onClick={() => {
                // In demo mode, just close with a success message feel
                onOpenChange(false);
              }}
            >
              Done
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DemoIncompleteRatingsSheet;
