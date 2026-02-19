import { useState, useEffect, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ChevronDown, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { TAG_CATEGORIES, getCategoryForTag } from "@/lib/tag-constants";

interface IncompleteShow {
  id: string;
  artistName: string;
  artistImageUrl: string | null;
  venueName: string;
  showDate: string;
  photoUrl: string | null;
}

interface IncompleteTagsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
  focusShowId?: string | null;
}

export const IncompleteTagsSheet = ({ 
  open, 
  onOpenChange,
  onComplete,
  focusShowId,
}: IncompleteTagsSheetProps) => {
  const [shows, setShows] = useState<IncompleteShow[]>([]);
  const [edits, setEdits] = useState<Record<string, string[]>>({});
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) fetchIncompleteShows();
  }, [open]);

  const fetchIncompleteShows = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get show IDs that already have tags
      const { data: taggedRows } = await supabase
        .from('show_tags')
        .select('show_id');

      const taggedShowIds = new Set((taggedRows || []).map(r => r.show_id));

      // Get all user shows
      const { data: showsData, error } = await supabase
        .from('shows')
        .select('id, venue_name, show_date, photo_url')
        .eq('user_id', user.id)
        .order('show_date', { ascending: false });

      if (error) throw error;

      // Filter to shows without tags
      const untagged = (showsData || []).filter(s => !taggedShowIds.has(s.id));

      const showsWithArtists = await Promise.all(untagged.map(async (show) => {
        const { data: artistData } = await supabase
          .from('show_artists')
          .select('artist_name, artist_image_url')
          .eq('show_id', show.id)
          .eq('is_headliner', true)
          .limit(1);

        return {
          id: show.id,
          artistName: artistData?.[0]?.artist_name || 'Unknown Artist',
          artistImageUrl: artistData?.[0]?.artist_image_url || null,
          venueName: show.venue_name,
          showDate: show.show_date,
          photoUrl: show.photo_url,
        };
      }));

      setShows(showsWithArtists);
      const initialEdits: Record<string, string[]> = {};
      showsWithArtists.forEach(s => { initialEdits[s.id] = []; });
      setEdits(initialEdits);
      // If a specific show is focused, expand it first (and sort it to top)
      if (focusShowId && showsWithArtists.some(s => s.id === focusShowId)) {
        setExpandedId(focusShowId);
        setShows(prev => {
          const focused = prev.find(s => s.id === focusShowId);
          const rest = prev.filter(s => s.id !== focusShowId);
          return focused ? [focused, ...rest] : prev;
        });
      } else {
        setExpandedId(showsWithArtists[0]?.id ?? null);
      }
    } catch (error) {
      console.error('Error fetching incomplete shows:', error);
      toast.error('Failed to load shows');
    } finally {
      setLoading(false);
    }
  };

  const toggleTag = (showId: string, tag: string) => {
    setEdits(prev => {
      const current = prev[showId] || [];
      return {
        ...prev,
        [showId]: current.includes(tag) ? current.filter(t => t !== tag) : [...current, tag],
      };
    });
  };

  const isShowComplete = (showId: string) => (edits[showId]?.length ?? 0) > 0;

  const completedCount = useMemo(() => shows.filter(s => isShowComplete(s.id)).length, [shows, edits]);

  const hasChanges = useMemo(() => shows.some(s => (edits[s.id]?.length ?? 0) > 0), [shows, edits]);

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const showsToSave = shows.filter(s => (edits[s.id]?.length ?? 0) > 0);

      for (const show of showsToSave) {
        // Delete existing tags then insert new ones
        await supabase.from('show_tags').delete().eq('show_id', show.id);

        const rows = edits[show.id].map(tag => ({
          show_id: show.id,
          tag,
          category: getCategoryForTag(tag) || 'unknown',
        }));

        const { error } = await supabase.from('show_tags').insert(rows);
        if (error) throw error;
      }

      toast.success(`Updated ${showsToSave.length} ${showsToSave.length === 1 ? 'show' : 'shows'}`);

      const allComplete = shows.every(s => isShowComplete(s.id));
      if (allComplete) {
        onOpenChange(false);
        onComplete?.();
      } else {
        fetchIncompleteShows();
      }
    } catch (error) {
      console.error('Error saving tags:', error);
      toast.error('Failed to save highlights');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent 
        side="bottom" 
        className="h-[90vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl"
      >
        <SheetHeader className="flex-shrink-0 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SheetTitle className="text-lg font-bold">
              {focusShowId && shows.find(s => s.id === focusShowId)
                ? `Add highlights — ${shows.find(s => s.id === focusShowId)!.artistName}`
                : "Add Highlights"}
            </SheetTitle>
          </div>
          
          {!loading && shows.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">{completedCount} of {shows.length} complete</span>
                <span className="text-white/40">{Math.round((completedCount / shows.length) * 100)}%</span>
              </div>
              <Progress value={(completedCount / shows.length) * 100} className="h-1.5 bg-white/10" />
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-pulse text-white/40">Loading shows...</div>
            </div>
          ) : shows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Check className="h-10 w-10 text-primary mb-2" />
              <p className="text-white/60">All shows have highlights!</p>
            </div>
          ) : (
            shows.map(show => {
              const isExpanded = expandedId === show.id;
              const complete = isShowComplete(show.id);
              const selectedTags = edits[show.id] || [];

              return (
                <div
                  key={show.id}
                  className={cn(
                    "rounded-xl border transition-all overflow-hidden",
                    isExpanded ? "bg-white/[0.05] border-white/20" : "bg-white/[0.02] border-white/10",
                    complete && !isExpanded && "opacity-60"
                  )}
                >
                  <button
                    onClick={() => setExpandedId(prev => prev === show.id ? null : show.id)}
                    className="w-full p-3 flex items-center gap-3 text-left"
                  >
                    {(show.photoUrl || show.artistImageUrl) ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={show.photoUrl || show.artistImageUrl!} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl text-white/40">✦</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white/90 truncate">{show.artistName}</div>
                      <div className="text-sm text-white/50 truncate">
                        {show.venueName} • {format(parseISO(show.showDate), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {complete ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="text-xs text-white/40">No highlights</span>
                      )}
                      <ChevronDown className={cn("h-4 w-4 text-white/40 transition-transform", isExpanded && "rotate-180")} />
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-3 pb-4 space-y-4 border-t border-white/10 pt-4">
                      {TAG_CATEGORIES.map(category => (
                        <div key={category.id} className="space-y-2">
                          <span className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">
                            {category.label}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {category.tags.map(tag => {
                              const isSelected = selectedTags.includes(tag);
                              return (
                                <button
                                  key={tag}
                                  type="button"
                                  onClick={() => toggleTag(show.id, tag)}
                                  className={cn(
                                    "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200",
                                    "border backdrop-blur-sm",
                                    isSelected
                                      ? "bg-primary/20 border-primary/50 text-primary-foreground shadow-[0_0_12px_hsl(var(--primary)/0.3)]"
                                      : "bg-white/[0.04] border-white/[0.1] text-white/60 hover:bg-white/[0.08] hover:text-white/80"
                                  )}
                                >
                                  {tag}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {shows.length > 0 && (
          <div className="flex-shrink-0 pt-4 border-t border-white/10">
            <Button className="w-full" size="lg" disabled={!hasChanges || saving} onClick={handleSaveAll}>
              {saving ? 'Saving...' : 'Save Highlights'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default IncompleteTagsSheet;
