import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface IncompleteShow {
  id: string;
  artistName: string;
  venueName: string;
  showDate: string;
  photoUrl: string | null;
  artistPerformance: number | null;
  sound: number | null;
  lighting: number | null;
  crowd: number | null;
  venueVibe: number | null;
}

interface RatingEdits {
  artistPerformance: number | null;
  sound: number | null;
  lighting: number | null;
  crowd: number | null;
  venueVibe: number | null;
}

interface IncompleteRatingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

const RATING_CATEGORIES = [
  { key: 'artistPerformance', label: 'Artist', dbKey: 'artist_performance' },
  { key: 'sound', label: 'Sound', dbKey: 'sound' },
  { key: 'lighting', label: 'Lighting', dbKey: 'lighting' },
  { key: 'crowd', label: 'Crowd', dbKey: 'crowd' },
  { key: 'venueVibe', label: 'Vibe', dbKey: 'venue_vibe' },
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

export const IncompleteRatingsSheet = ({ 
  open, 
  onOpenChange,
  onComplete 
}: IncompleteRatingsSheetProps) => {
  const [shows, setShows] = useState<IncompleteShow[]>([]);
  const [edits, setEdits] = useState<Record<string, RatingEdits>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Fetch incomplete shows when sheet opens
  useEffect(() => {
    if (open) {
      fetchIncompleteShows();
    }
  }, [open]);

  const fetchIncompleteShows = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Fetch shows with incomplete ratings
      const { data: showsData, error } = await supabase
        .from('shows')
        .select('id, venue_name, show_date, photo_url, artist_performance, sound, lighting, crowd, venue_vibe')
        .eq('user_id', user.id)
        .or('artist_performance.is.null,sound.is.null,lighting.is.null,crowd.is.null,venue_vibe.is.null')
        .order('show_date', { ascending: false });

      if (error) throw error;

      // Fetch headliner artist for each show
      const showsWithArtists = await Promise.all((showsData || []).map(async (show) => {
        const { data: artistData } = await supabase
          .from('show_artists')
          .select('artist_name')
          .eq('show_id', show.id)
          .eq('is_headliner', true)
          .limit(1);

        return {
          id: show.id,
          artistName: artistData?.[0]?.artist_name || 'Unknown Artist',
          venueName: show.venue_name,
          showDate: show.show_date,
          photoUrl: show.photo_url,
          artistPerformance: show.artist_performance,
          sound: show.sound,
          lighting: show.lighting,
          crowd: show.crowd,
          venueVibe: show.venue_vibe,
        };
      }));

      setShows(showsWithArtists);
      
      // Initialize edits with current values
      const initialEdits: Record<string, RatingEdits> = {};
      showsWithArtists.forEach(show => {
        initialEdits[show.id] = {
          artistPerformance: show.artistPerformance,
          sound: show.sound,
          lighting: show.lighting,
          crowd: show.crowd,
          venueVibe: show.venueVibe,
        };
      });
      setEdits(initialEdits);

      // Auto-expand first incomplete show
      const firstIncomplete = showsWithArtists.find(show => 
        show.artistPerformance === null ||
        show.sound === null ||
        show.lighting === null ||
        show.crowd === null ||
        show.venueVibe === null
      );
      if (firstIncomplete) {
        setExpandedId(firstIncomplete.id);
      }
    } catch (error) {
      console.error('Error fetching incomplete shows:', error);
      toast.error('Failed to load shows');
    } finally {
      setLoading(false);
    }
  };

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
    return shows.filter(show => isShowComplete(show.id)).length;
  }, [shows, edits]);

  const hasChanges = useMemo(() => {
    return shows.some(show => {
      const original = {
        artistPerformance: show.artistPerformance,
        sound: show.sound,
        lighting: show.lighting,
        crowd: show.crowd,
        venueVibe: show.venueVibe,
      };
      const current = edits[show.id];
      if (!current) return false;
      return JSON.stringify(original) !== JSON.stringify(current);
    });
  }, [shows, edits]);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      // Batch update all shows that have changes
      const updates = shows
        .filter(show => {
          const original = {
            artistPerformance: show.artistPerformance,
            sound: show.sound,
            lighting: show.lighting,
            crowd: show.crowd,
            venueVibe: show.venueVibe,
          };
          return JSON.stringify(original) !== JSON.stringify(edits[show.id]);
        })
        .map(show => {
          const showEdits = edits[show.id];
          return {
            id: show.id,
            artist_performance: showEdits?.artistPerformance ?? null,
            sound: showEdits?.sound ?? null,
            lighting: showEdits?.lighting ?? null,
            crowd: showEdits?.crowd ?? null,
            venue_vibe: showEdits?.venueVibe ?? null,
          };
        });

      // Update each show
      for (const update of updates) {
        const { error } = await supabase
          .from('shows')
          .update({
            artist_performance: update.artist_performance,
            sound: update.sound,
            lighting: update.lighting,
            crowd: update.crowd,
            venue_vibe: update.venue_vibe,
          })
          .eq('id', update.id);

        if (error) throw error;
      }

      toast.success(`Updated ${updates.length} ${updates.length === 1 ? 'show' : 'shows'}`);
      
      // If all shows are now complete, close the sheet
      const allComplete = shows.every(show => isShowComplete(show.id));
      if (allComplete) {
        onOpenChange(false);
        onComplete?.();
      } else {
        // Refresh the list
        fetchIncompleteShows();
      }
    } catch (error) {
      console.error('Error saving ratings:', error);
      toast.error('Failed to save ratings');
    } finally {
      setSaving(false);
    }
  };

  const toggleExpanded = (showId: string) => {
    setExpandedId(prev => prev === showId ? null : showId);
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
          
          {/* Progress indicator */}
          {!loading && shows.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">
                  {completedCount} of {shows.length} complete
                </span>
                <span className="text-white/40">
                  {Math.round((completedCount / shows.length) * 100)}%
                </span>
              </div>
              <Progress 
                value={(completedCount / shows.length) * 100} 
                className="h-1.5 bg-white/10"
              />
            </div>
          )}
        </SheetHeader>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse text-white/40">Loading shows...</div>
            </div>
          ) : shows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Check className="h-10 w-10 text-primary mb-2" />
              <p className="text-white/60">All shows have complete ratings!</p>
            </div>
          ) : (
            shows.map(show => {
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
                    {show.photoUrl ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img 
                          src={show.photoUrl} 
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
                        {show.artistName}
                      </div>
                      <div className="text-sm text-white/50 truncate">
                        {show.venueName} • {format(parseISO(show.showDate), 'MMM d, yyyy')}
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
                        const originalValue = show[cat.key];
                        const isFilled = originalValue !== null;

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
        {shows.length > 0 && (
          <div className="flex-shrink-0 pt-4 border-t border-white/10">
            <Button
              className="w-full"
              size="lg"
              disabled={!hasChanges || saving}
              onClick={handleSaveAll}
            >
              {saving ? 'Saving...' : 'Save All Changes'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default IncompleteRatingsSheet;
