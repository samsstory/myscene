import { useState, useMemo } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, ChevronDown, Check, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { TAG_CATEGORIES } from "@/lib/tag-constants";

interface Artist {
  name: string;
  isHeadliner: boolean;
}

interface Show {
  id: string;
  artists: Artist[];
  venue: { name: string; location: string };
  date: string;
  rating?: number | null;
  tags?: string[];
  photo_url?: string | null;
}

interface DemoIncompleteRatingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shows: Show[];
}

export const DemoIncompleteRatingsSheet = ({ 
  open, 
  onOpenChange,
  shows: allShows,
}: DemoIncompleteRatingsSheetProps) => {
  const incompleteShows = useMemo(() => {
    return allShows.filter(show => !show.tags || show.tags.length === 0);
  }, [allShows]);

  const [edits, setEdits] = useState<Record<string, string[]>>(() => {
    const initial: Record<string, string[]> = {};
    incompleteShows.forEach(show => { initial[show.id] = []; });
    return initial;
  });

  const [expandedId, setExpandedId] = useState<string | null>(
    incompleteShows[0]?.id ?? null
  );

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

  const completedCount = useMemo(() => {
    return incompleteShows.filter(show => isShowComplete(show.id)).length;
  }, [incompleteShows, edits]);

  const hasChanges = useMemo(() => {
    return incompleteShows.some(show => (edits[show.id]?.length ?? 0) > 0);
  }, [incompleteShows, edits]);

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
            <Button variant="ghost" size="icon" onClick={() => onOpenChange(false)} className="h-9 w-9">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <SheetTitle className="text-lg font-bold">Add Moments</SheetTitle>
          </div>
          
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.05] border border-white/10">
            <Info className="h-4 w-4 text-white/50" />
            <span className="text-xs text-white/60">Demo Mode · Changes won't save</span>
          </div>
          
          {incompleteShows.length > 0 && (
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/60">{completedCount} of {incompleteShows.length} complete</span>
                <span className="text-white/40">{Math.round((completedCount / incompleteShows.length) * 100)}%</span>
              </div>
              <Progress value={(completedCount / incompleteShows.length) * 100} className="h-1.5 bg-white/10" />
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto py-4 space-y-3">
          {incompleteShows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <Check className="h-10 w-10 text-primary mb-2" />
              <p className="text-white/60">All shows have moments tagged!</p>
            </div>
          ) : (
            incompleteShows.map(show => {
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
                    {show.photo_url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                        <img src={show.photo_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xl text-white/40">✦</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="font-semibold text-white/90 truncate">{getHeadlinerName(show)}</div>
                      <div className="text-sm text-white/50 truncate">
                        {show.venue.name} • {format(parseISO(show.date), 'MMM d, yyyy')}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {complete ? (
                        <Check className="h-4 w-4 text-primary" />
                      ) : (
                        <span className="text-xs text-white/40">No tags</span>
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

        {incompleteShows.length > 0 && (
          <div className="flex-shrink-0 pt-4 border-t border-white/10">
            <Button className="w-full" size="lg" disabled={!hasChanges} onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default DemoIncompleteRatingsSheet;
