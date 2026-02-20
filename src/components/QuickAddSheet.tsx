import { useState, useEffect, useCallback } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Plus, X, MapPin, CalendarIcon, Loader2, Search, Music2, Camera } from "lucide-react";
import { TAG_CATEGORIES, getCategoryForTag } from "@/lib/tag-constants";
import type { AddedShowData } from "./AddShowFlow";

export interface QuickAddPrefill {
  artistName: string;
  artistImageUrl?: string | null;
  venueName?: string | null;
  venueLocation?: string | null;
  showDate?: string | null;
  showType: "set" | "show" | "festival";
  eventName?: string | null;
}

interface QuickAddSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prefill: QuickAddPrefill | null;
  onShowAdded?: (show: AddedShowData) => void;
}

interface ExtraArtist {
  name: string;
  imageUrl?: string;
  spotifyId?: string;
}

interface VenueSuggestion {
  id?: string;
  name: string;
  location: string;
  latitude?: number;
  longitude?: number;
}

const QuickAddSheet = ({ open, onOpenChange, prefill, onShowAdded }: QuickAddSheetProps) => {
  // Core state
  const [tags, setTags] = useState<string[]>([]);
  const [notes, setNotes] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(null);

  // Extra artists
  const [extraArtists, setExtraArtists] = useState<ExtraArtist[]>([]);
  const [showArtistSearch, setShowArtistSearch] = useState(false);
  const [artistSearchTerm, setArtistSearchTerm] = useState("");
  const [artistResults, setArtistResults] = useState<ExtraArtist[]>([]);
  const [isSearchingArtists, setIsSearchingArtists] = useState(false);

  // Missing venue
  const [venueSearchTerm, setVenueSearchTerm] = useState("");
  const [venueSuggestions, setVenueSuggestions] = useState<VenueSuggestion[]>([]);
  const [isSearchingVenues, setIsSearchingVenues] = useState(false);
  const [selectedVenue, setSelectedVenue] = useState<{ name: string; location: string; id: string | null } | null>(null);

  // Missing date
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);

  // Reset state when sheet opens with new prefill
  useEffect(() => {
    if (open && prefill) {
      setTags([]);
      setNotes("");
      setExtraArtists([]);
      setShowArtistSearch(false);
      setArtistSearchTerm("");
      setArtistResults([]);
      setSelectedVenue(
        prefill.venueName
          ? { name: prefill.venueName, location: prefill.venueLocation || "", id: null }
          : null
      );
      setVenueSearchTerm("");
      setVenueSuggestions([]);
      setSelectedDate(prefill.showDate ? new Date(prefill.showDate) : undefined);
      setCustomPhotoUrl(null);
    }
  }, [open, prefill]);

  // Artist search debounce
  useEffect(() => {
    if (artistSearchTerm.trim().length < 2) {
      setArtistResults([]);
      return;
    }
    setIsSearchingArtists(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("search-artists", {
          body: { searchTerm: artistSearchTerm.trim() },
        });
        if (!error && data?.artists) {
          setArtistResults(
            data.artists.map((a: any) => ({
              name: a.name,
              imageUrl: a.imageUrl || a.imageSmall,
              spotifyId: a.id,
            }))
          );
        }
      } catch {
        // silent
      } finally {
        setIsSearchingArtists(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [artistSearchTerm]);

  // Venue search debounce
  useEffect(() => {
    if (venueSearchTerm.trim().length < 2) {
      setVenueSuggestions([]);
      return;
    }
    setIsSearchingVenues(true);
    const timer = setTimeout(async () => {
      try {
        const { data, error } = await supabase.functions.invoke("search-venues", {
          body: { searchTerm: venueSearchTerm.trim(), showType: prefill?.showType || "set" },
        });
        if (!error && data?.suggestions) {
          setVenueSuggestions(data.suggestions);
        }
      } catch {
        // silent
      } finally {
        setIsSearchingVenues(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [venueSearchTerm, prefill?.showType]);

  const toggleTag = (tag: string) => {
    setTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  const handleSave = async () => {
    if (!prefill) return;
    setIsSaving(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        toast.error("Please sign in to add shows");
        return;
      }
      const user = session.user;

      // Resolve date
      let showDate: string;
      let datePrecision: string;
      if (selectedDate) {
        showDate = selectedDate.toISOString().split("T")[0];
        datePrecision = "exact";
      } else if (prefill.showDate) {
        showDate = prefill.showDate;
        datePrecision = "exact";
      } else {
        showDate = `${new Date().getFullYear()}-01-01`;
        datePrecision = "unknown";
      }

      // Duplicate check
      const { data: dupes } = await supabase
        .from("shows")
        .select("id")
        .eq("user_id", user.id)
        .eq("show_date", showDate)
        .ilike("venue_name", selectedVenue?.name || prefill.venueName || "")
        .limit(1);

      if (dupes && dupes.length > 0) {
        // Check artist match
        const { data: dupeArtists } = await supabase
          .from("show_artists")
          .select("artist_name")
          .eq("show_id", dupes[0].id);
        const dupeNames = (dupeArtists || []).map((a) => a.artist_name.toLowerCase());
        if (dupeNames.includes(prefill.artistName.toLowerCase())) {
          toast.warning("You already have this show in your Scene!");
          setIsSaving(false);
          return;
        }
      }

      // Resolve venue
      let venueIdToUse: string | null = null;
      const venueName = selectedVenue?.name || prefill.venueName || prefill.eventName || "Unknown Venue";
      const venueLocation = selectedVenue?.location || prefill.venueLocation || "";

      if (selectedVenue?.id) {
        venueIdToUse = selectedVenue.id;
      } else if (venueName && venueName !== "Unknown Venue") {
        // Try to find or create venue
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

      // Upload custom photo if provided
      let photoUrl: string | null = null;
      if (customPhotoUrl && customPhotoUrl.startsWith("blob:")) {
        try {
          const resp = await fetch(customPhotoUrl);
          const blob = await resp.blob();
          const ext = blob.type.split("/")[1] || "jpg";
          const filePath = `${user.id}/${crypto.randomUUID()}.${ext}`;
          const { error: uploadErr } = await supabase.storage
            .from("show-photos")
            .upload(filePath, blob, { contentType: blob.type });
          if (!uploadErr) {
            const { data: urlData } = supabase.storage.from("show-photos").getPublicUrl(filePath);
            photoUrl = urlData.publicUrl;
          }
        } catch {
          // Continue without photo
        }
      }

      // Insert show
      const { data: show, error: showError } = await supabase
        .from("shows")
        .insert({
          user_id: user.id,
          venue_name: venueName,
          venue_location: venueLocation || null,
          venue_id: venueIdToUse,
          show_date: showDate,
          date_precision: datePrecision,
          notes: notes || null,
          show_type: (prefill.showType === "set" && extraArtists.length > 0) ? "show" : prefill.showType,
          event_name: prefill.eventName || null,
          photo_url: photoUrl,
        })
        .select()
        .single();

      if (showError) throw showError;

      // Insert artists
      const allArtists = [
        {
          show_id: show.id,
          artist_name: prefill.artistName,
          is_headliner: true,
          artist_image_url: prefill.artistImageUrl || null,
        },
        ...extraArtists.map((a) => ({
          show_id: show.id,
          artist_name: a.name,
          is_headliner: false,
          artist_image_url: a.imageUrl || null,
          spotify_artist_id: a.spotifyId || null,
        })),
      ];

      const { error: artistsError } = await supabase.from("show_artists").insert(allArtists);
      if (artistsError) throw artistsError;

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
            last_show_date: showDate,
          },
          { onConflict: "user_id,venue_id", ignoreDuplicates: false }
        );
      }

      toast.success("Added to your Scene! 🎶");
      onShowAdded?.({
        id: show.id,
        artists: [{ name: prefill.artistName, isHeadliner: true }, ...extraArtists.map((a) => ({ name: a.name, isHeadliner: false }))],
        venue: { name: venueName, location: venueLocation },
        date: showDate,
        tags,
      });
      onOpenChange(false);
    } catch (error) {
      console.error("Error adding show:", error);
      toast.error("Failed to add show. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!prefill) return null;

  const hasVenue = !!(selectedVenue?.name || prefill.venueName);
  const hasDate = !!(selectedDate || prefill.showDate);
  const displayVenue = selectedVenue?.name || prefill.venueName;
  const displayLocation = selectedVenue?.location || prefill.venueLocation;
  const displayDate = selectedDate
    ? format(selectedDate, "MMMM d, yyyy")
    : prefill.showDate
    ? format(new Date(prefill.showDate), "MMMM d, yyyy")
    : null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-background border-white/10 pb-safe max-h-[92vh] overflow-y-auto p-0">
        {/* Hero Section */}
        <div className="relative w-full h-44 overflow-hidden rounded-t-3xl">
          {customPhotoUrl ? (
            <img
              src={customPhotoUrl}
              alt="Your photo"
              className="w-full h-full object-cover"
            />
          ) : prefill.artistImageUrl ? (
            <img
              src={prefill.artistImageUrl}
              alt={prefill.artistName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/40 via-primary/20 to-background" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
          {/* Photo upload trigger */}
          <input
            type="file"
            accept="image/*"
            id="quick-add-photo-input"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) {
                if (file.size > 5 * 1024 * 1024) {
                  toast.error("Photo must be under 5MB");
                  return;
                }
                const url = URL.createObjectURL(file);
                setCustomPhotoUrl(url);
              }
              e.target.value = "";
            }}
          />
          <label
            htmlFor="quick-add-photo-input"
            className="absolute top-4 left-4 w-8 h-8 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center cursor-pointer hover:bg-black/60 transition-colors"
          >
            <Camera className="h-4 w-4 text-white/70" />
          </label>
        </div>

        <div className="px-5 pb-8 -mt-10 relative z-10 space-y-5">
          {/* Show Info */}
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-xl font-bold text-foreground">{prefill.artistName}</h2>
              <button
                onClick={() => setShowArtistSearch((v) => !v)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-white/[0.06] border border-white/[0.1] text-white/60 hover:bg-white/[0.1] hover:text-white/80 transition-all"
              >
                <Plus className="h-3 w-3" />
                Add artist
              </button>
            </div>

            {/* Extra artist pills — inline with heading */}
            {extraArtists.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                {extraArtists.map((a) => (
                  <span
                    key={a.name}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-white/[0.06] border border-white/[0.1] text-white/70"
                  >
                    {a.imageUrl && (
                      <img src={a.imageUrl} alt="" className="w-3.5 h-3.5 rounded-full object-cover" />
                    )}
                    {a.name}
                    <button onClick={() => setExtraArtists((prev) => prev.filter((x) => x.name !== a.name))} className="text-white/40 hover:text-white/70 transition-colors">
                      <X className="h-2.5 w-2.5" />
                    </button>
                  </span>
                ))}
              </div>
            )}

            {/* Inline artist search */}
            {showArtistSearch && (
              <div className="space-y-2 pt-1">
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search artist..."
                    value={artistSearchTerm}
                    onChange={(e) => setArtistSearchTerm(e.target.value)}
                    className="pl-9 h-9 text-sm bg-white/[0.04] border-white/[0.1]"
                    autoFocus
                  />
                  {isSearchingArtists && <Loader2 className="absolute right-3 top-2.5 h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                {artistResults.length > 0 && (
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {artistResults.slice(0, 5).map((a) => (
                      <button
                        key={a.spotifyId || a.name}
                        onClick={() => {
                          setExtraArtists((prev) => [...prev, a]);
                          setArtistSearchTerm("");
                          setArtistResults([]);
                          setShowArtistSearch(false);
                        }}
                        className="w-full flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.06] transition-colors text-left"
                      >
                        {a.imageUrl ? (
                          <img src={a.imageUrl} alt={a.name} className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-white/[0.08] flex items-center justify-center">
                            <Music2 className="h-3 w-3 text-white/40" />
                          </div>
                        )}
                        <span className="text-sm text-foreground">{a.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Venue & Date display */}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {displayVenue && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5" />
                  {displayVenue}
                  {displayLocation && <span className="text-white/30">· {displayLocation}</span>}
                </span>
              )}
            </div>
            {displayDate && (
              <p className="text-sm text-muted-foreground flex items-center gap-1">
                <CalendarIcon className="h-3.5 w-3.5" />
                {displayDate}
              </p>
            )}
          </div>

          {/* Missing Venue — inline search */}
          {!hasVenue && (
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">
                Where was it? <span className="text-white/25">(optional)</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search venue..."
                  value={venueSearchTerm}
                  onChange={(e) => setVenueSearchTerm(e.target.value)}
                  className="pl-9 h-10 text-sm bg-white/[0.04] border-white/[0.1]"
                />
                {isSearchingVenues && <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
              {venueSuggestions.length > 0 && (
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {venueSuggestions.slice(0, 5).map((v) => (
                    <button
                      key={v.id || v.name}
                      onClick={() => {
                        setSelectedVenue({ name: v.name, location: v.location, id: v.id || null });
                        setVenueSearchTerm("");
                        setVenueSuggestions([]);
                      }}
                      className="w-full flex items-center gap-2.5 p-2.5 rounded-lg hover:bg-white/[0.06] transition-colors text-left"
                    >
                      <MapPin className="h-4 w-4 text-white/30 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm text-foreground truncate">{v.name}</p>
                        {v.location && <p className="text-xs text-muted-foreground truncate">{v.location}</p>}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Missing Date — inline picker */}
          {!hasDate && (
            <div className="space-y-2">
              <label className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">
                When was it? <span className="text-white/25">(optional)</span>
              </label>
              <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal h-10 bg-white/[0.04] border-white/[0.1]",
                      !selectedDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {selectedDate ? format(selectedDate, "PPP") : "Pick a date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      setSelectedDate(d);
                      setDatePopoverOpen(false);
                    }}
                    disabled={(date) => date > new Date()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {/* Tag Selection */}
          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">What stood out?</label>
              <p className="text-xs text-white/25">Tag the moments that made it memorable.</p>
            </div>
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
                          "px-2.5 py-1 rounded-full text-xs font-medium transition-all duration-200",
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

          {/* My Take */}
          <div className="space-y-2">
            <label className="text-xs font-medium uppercase tracking-[0.15em] text-white/40">
              My Take <span className="text-white/25">(optional)</span>
            </label>
            <Textarea
              placeholder="Add your thoughts..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              className="min-h-[70px] resize-none bg-white/[0.04] border-white/[0.1] text-sm"
            />
            <p className="text-[10px] text-white/25 text-right">{notes.length}/500</p>
          </div>

          {/* CTA */}
          <Button onClick={handleSave} disabled={isSaving} className="w-full h-12 text-base font-semibold">
            {isSaving ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </span>
            ) : (
              "Add to My Scene"
            )}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default QuickAddSheet;
