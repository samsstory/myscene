import { useState, useMemo, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { format, parseISO, startOfToday, isAfter } from "date-fns";
import { MapPin, Calendar, ChevronRight, Check, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { TAG_CATEGORIES, getCategoryForTag } from "@/lib/tag-constants";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UpcomingShow } from "@/hooks/usePlanUpcomingShow";

interface LogPastShowsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  upcomingShows: UpcomingShow[];
  onShowLogged?: () => void;
}

export default function LogPastShowsSheet({
  open,
  onOpenChange,
  upcomingShows,
  onShowLogged,
}: LogPastShowsSheetProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  // Filter to only past shows
  const pastShows = useMemo(() => {
    const today = startOfToday();
    const norm = (s: string) => s.trim().toLowerCase();
    const seen = new Map<string, UpcomingShow>();
    for (const show of upcomingShows) {
      const key = `${norm(show.artist_name)}|${show.show_date ?? ""}`;
      if (seen.has(key)) continue;
      if (!show.show_date) continue;
      try {
        if (isAfter(today, parseISO(show.show_date))) {
          seen.set(key, show);
        }
      } catch { /* skip */ }
    }
    return Array.from(seen.values()).sort(
      (a, b) => (a.show_date ?? "").localeCompare(b.show_date ?? "")
    );
  }, [upcomingShows]);

  const currentShow = pastShows[currentIndex] ?? null;
  const total = pastShows.length;
  const isLast = currentIndex >= total - 1;

  // Reset state when sheet opens
  const handleOpenChange = useCallback((v: boolean) => {
    if (v) {
      setCurrentIndex(0);
      setTags([]);
    }
    onOpenChange(v);
  }, [onOpenChange]);

  const toggleTag = (tag: string) => {
    setTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const saveCurrentShow = async () => {
    if (!currentShow) return;
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Resolve venue
      let venueIdToUse: string | null = null;
      const venueName = currentShow.venue_name || "Unknown Venue";
      const venueLocation = currentShow.venue_location || "";

      if (venueName !== "Unknown Venue") {
        const { data: existingVenue } = await supabase
          .from("venues")
          .select("id")
          .ilike("name", venueName)
          .limit(1)
          .maybeSingle();
        if (existingVenue) {
          venueIdToUse = existingVenue.id;
        } else {
          const { data: newVenue } = await supabase
            .from("venues")
            .insert({ name: venueName, location: venueLocation || null })
            .select("id")
            .single();
          if (newVenue) venueIdToUse = newVenue.id;
        }
      }

      const isFestival = currentShow.raw_input === "festival";

      // Insert the show
      const { data: show, error: showError } = await supabase
        .from("shows")
        .insert({
          user_id: user.id,
          venue_name: venueName,
          venue_location: venueLocation || null,
          venue_id: venueIdToUse,
          show_date: currentShow.show_date!,
          date_precision: "day",
          show_type: isFestival ? "festival" : "set",
        })
        .select()
        .single();

      if (showError) throw showError;

      // Insert artist
      await supabase.from("show_artists").insert({
        show_id: show.id,
        artist_name: currentShow.artist_name,
        is_headliner: true,
        artist_image_url: currentShow.artist_image_url || null,
      });

      // Insert tags
      if (tags.length > 0) {
        const tagsToInsert = tags.map((tag) => ({
          show_id: show.id,
          tag,
          category: getCategoryForTag(tag) || "the_show",
        }));
        await supabase.from("show_tags").insert(tagsToInsert);
      }

      // Upsert user_venues
      if (venueIdToUse) {
        await supabase.from("user_venues").upsert(
          {
            user_id: user.id,
            venue_id: venueIdToUse,
            show_count: 1,
            last_show_date: currentShow.show_date!,
          },
          { onConflict: "user_id,venue_id", ignoreDuplicates: false }
        );
      }

      // Delete from upcoming_shows
      await supabase
        .from("upcoming_shows" as any)
        .delete()
        .eq("id", currentShow.id);

      onShowLogged?.();

      if (isLast) {
        toast.success("All past shows logged! 🎉");
        handleOpenChange(false);
      } else {
        toast.success(`${currentShow.artist_name} logged ✓`);
        setTags([]);
        setCurrentIndex((i) => i + 1);
      }
    } catch (err) {
      console.error("Error logging show:", err);
      toast.error("Failed to log show");
    } finally {
      setIsSaving(false);
    }
  };

  const skipCurrent = async () => {
    // Delete from upcoming without logging
    if (currentShow) {
      await supabase
        .from("upcoming_shows" as any)
        .delete()
        .eq("id", currentShow.id);
      onShowLogged?.();
    }

    if (isLast) {
      handleOpenChange(false);
    } else {
      setTags([]);
      setCurrentIndex((i) => i + 1);
    }
  };

  if (!currentShow) return null;

  const dateLabel = currentShow.show_date
    ? (() => { try { return format(parseISO(currentShow.show_date), "EEEE, MMMM d, yyyy"); } catch { return ""; } })()
    : "";

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-3xl bg-background border-white/10 pb-safe max-h-[85vh] overflow-y-auto"
      >
        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-[11px] uppercase tracking-[0.15em] font-semibold text-white/35">
            {currentIndex + 1} of {total}
          </span>
          <button
            onClick={() => handleOpenChange(false)}
            className="w-7 h-7 rounded-full bg-white/[0.06] flex items-center justify-center hover:bg-white/[0.12] transition-colors"
          >
            <X className="h-3.5 w-3.5 text-white/50" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full h-0.5 bg-white/[0.06] rounded-full mb-6 overflow-hidden">
          <div
            className="h-full bg-primary/60 rounded-full transition-all duration-300"
            style={{ width: `${((currentIndex) / total) * 100}%` }}
          />
        </div>

        {/* Show hero */}
        <div className="relative rounded-2xl overflow-hidden mb-5">
          {currentShow.artist_image_url ? (
            <>
              <img
                src={currentShow.artist_image_url}
                alt={currentShow.artist_name}
                className="w-full h-40 object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </>
          ) : (
            <div className="w-full h-40 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
          )}
          <div className="absolute bottom-0 left-0 right-0 p-4">
            <h2
              className="text-xl font-bold text-white leading-tight"
              style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}
            >
              {currentShow.artist_name}
            </h2>
            <div className="flex items-center gap-3 mt-1.5">
              {dateLabel && (
                <span className="flex items-center gap-1 text-xs text-white/70">
                  <Calendar className="h-3 w-3" />
                  {dateLabel}
                </span>
              )}
              {currentShow.venue_name && (
                <span className="flex items-center gap-1 text-xs text-white/70">
                  <MapPin className="h-3 w-3" />
                  {currentShow.venue_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Tags */}
        <div className="space-y-4 mb-6">
          <p className="text-sm font-medium text-foreground">What stood out?</p>
          {TAG_CATEGORIES.map((category) => (
            <div key={category.id} className="space-y-2">
              <span className="text-[10px] font-medium uppercase tracking-[0.15em] text-white/30">
                {category.label}
              </span>
              <div className="flex flex-wrap gap-1.5">
                {category.tags.map((tag) => {
                  const isSelected = tags.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleTag(tag)}
                      className={cn(
                        "px-2.5 py-1 rounded-full text-xs font-medium transition-all",
                        "border backdrop-blur-sm",
                        isSelected
                          ? "bg-primary/20 border-primary/50 text-primary-foreground"
                          : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08]"
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

        {/* Actions */}
        <div className="space-y-2">
          <Button
            onClick={saveCurrentShow}
            disabled={isSaving}
            className="w-full h-12 text-base"
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Check className="h-4 w-4 mr-2" />
            )}
            {isLast ? "Log Show" : "Log & Next"}
            {!isLast && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
          <Button
            onClick={skipCurrent}
            variant="ghost"
            className="w-full h-10 text-sm text-muted-foreground"
          >
            {isLast ? "Skip & Close" : "Skip"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
