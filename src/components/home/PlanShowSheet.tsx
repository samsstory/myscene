import { useState, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Ticket, Loader2, Music2, Calendar, MapPin, Sparkles, ImagePlus, X, Link2, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { usePlanUpcomingShow, type ParsedUpcomingEvent, type SaveUpcomingShowData } from "@/hooks/usePlanUpcomingShow";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PlanShowSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Stage = "input" | "confirm" | "manual";
type InputTab = "text" | "screenshot";

interface ScreenshotEntry {
  file: File;
  preview: string;
}

// Compress image to base64, max ~900px wide to keep payload reasonable
async function compressImageToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const MAX = 900;
      let { width, height } = img;
      if (width > MAX) { height = Math.round((height * MAX) / width); width = MAX; }
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      resolve(dataUrl);
    };
    img.onerror = reject;
    img.src = url;
  });
}

export default function PlanShowSheet({ open, onOpenChange }: PlanShowSheetProps) {
  const { saveUpcomingShow, isSaving, clearParsedResult } = usePlanUpcomingShow();

  const [stage, setStage] = useState<Stage>("input");
  const [activeTab, setActiveTab] = useState<InputTab>("text");
  const [inputText, setInputText] = useState("");
  const [screenshots, setScreenshots] = useState<ScreenshotEntry[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [parsedEvents, setParsedEvents] = useState<ParsedUpcomingEvent[]>([]);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [confirmedEvent, setConfirmedEvent] = useState<ParsedUpcomingEvent | null>(null);
  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null);
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [editArtist, setEditArtist] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTicketUrl, setEditTicketUrl] = useState("");

  const resetInputState = useCallback(() => {
    setInputText("");
    setScreenshots([]);
    setConfirmedEvent(null);
    setParsedEvents([]);
    setCurrentEventIndex(0);
    setSelectedImageFile(null);
    setSelectedImageUrl(null);
    clearParsedResult();
  }, [clearParsedResult]);

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => {
      setStage("input");
      setActiveTab("text");
      resetInputState();
    }, 300);
  };

  const handleScreenshotSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const newEntries: ScreenshotEntry[] = files.map((file) => ({
      file,
      preview: URL.createObjectURL(file),
    }));

    setScreenshots((prev) => [...prev, ...newEntries]);
    e.target.value = "";
  };

  const handleRemoveScreenshot = (index: number) => {
    setScreenshots((prev) => {
      URL.revokeObjectURL(prev[index].preview);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleParse = async () => {
    const hasText = inputText.trim().length > 0;
    const hasImages = screenshots.length > 0;

    if (!hasText && !hasImages) {
      setEditArtist(""); setEditVenue(""); setEditLocation(""); setEditDate(""); setEditTicketUrl("");
      setStage("manual");
      return;
    }

    setIsParsing(true);
    try {
      // Compress all screenshots to base64
      const imageBase64List = hasImages
        ? await Promise.all(screenshots.map((s) => compressImageToBase64(s.file)))
        : [];

      const { data, error: fnError } = await supabase.functions.invoke("parse-upcoming-show", {
        body: {
          input: hasText ? inputText : undefined,
          // Pass first image as `image` for backward compat, extras as `images`
          image: imageBase64List[0],
          images: imageBase64List.length > 1 ? imageBase64List : undefined,
        },
      });

      if (fnError) throw fnError;

      if (data?.error) {
        if (data.error.includes("Rate limit")) toast.error("Rate limit hit — try again in a moment");
        else if (data.error.includes("credits")) toast.error("AI credits exhausted");
        else toast.error(data.error);
        return;
      }

      const events: ParsedUpcomingEvent[] = data?.events || [];
      if (events.length === 0) {
        toast.error("Couldn't extract event details — try adding more info");
        return;
      }

      // Store all events; start with the first one
      setParsedEvents(events);
      setCurrentEventIndex(0);
      const event = events[0];
      setConfirmedEvent(event);
      setEditArtist(event.artist_name);
      setEditVenue(event.venue_name || "");
      setEditLocation(event.venue_location || "");
      setEditDate(event.show_date || "");
      setEditTicketUrl(event.ticket_url || "");

      // Image priority: single screenshot → use it; otherwise fall back to Spotify image
      if (screenshots.length === 1) {
        setSelectedImageFile(screenshots[0].file);
        setSelectedImageUrl(screenshots[0].preview);
      } else {
        setSelectedImageFile(null);
        setSelectedImageUrl(null);
      }

      setStage("confirm");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to parse");
    } finally {
      setIsParsing(false);
    }
  };

  const handleTryAgain = () => {
    setStage("input");
    setConfirmedEvent(null);
    setParsedEvents([]);
    setCurrentEventIndex(0);
    clearParsedResult();
  };

  const handleManual = () => {
    setEditArtist(""); setEditVenue(""); setEditLocation(""); setEditDate(""); setEditTicketUrl("");
    setStage("manual");
  };

  const advanceToNextEvent = (nextIndex: number) => {
    const next = parsedEvents[nextIndex];
    setCurrentEventIndex(nextIndex);
    setConfirmedEvent(next);
    setEditArtist(next.artist_name);
    setEditVenue(next.venue_name || "");
    setEditLocation(next.venue_location || "");
    setEditDate(next.show_date || "");
    setEditTicketUrl(next.ticket_url || "");
  };

  const handleSave = async () => {
    let finalImageUrl = confirmedEvent?.artist_image_url || undefined;

    // If a single screenshot was chosen as the show graphic, upload it first
    if (selectedImageFile) {
      try {
        const ext = selectedImageFile.name.split(".").pop() || "jpg";
        const path = `upcoming/${crypto.randomUUID()}.${ext}`;
        const { error: uploadError } = await supabase.storage
          .from("show-photos")
          .upload(path, selectedImageFile, { contentType: selectedImageFile.type, upsert: false });

        if (!uploadError) {
          const { data: urlData } = supabase.storage.from("show-photos").getPublicUrl(path);
          finalImageUrl = urlData.publicUrl;
        }
        // If upload fails, gracefully fall back to Spotify image (finalImageUrl already set)
      } catch {
        // fall back silently
      }
    }

    const data: SaveUpcomingShowData = {
      artist_name: editArtist,
      venue_name: editVenue || undefined,
      venue_location: editLocation || undefined,
      show_date: editDate || undefined,
      ticket_url: editTicketUrl || undefined,
      artist_image_url: finalImageUrl,
      raw_input: inputText || undefined,
    };
    const ok = await saveUpcomingShow(data);
    if (ok) {
      const nextIndex = currentEventIndex + 1;
      if (nextIndex < parsedEvents.length) {
        advanceToNextEvent(nextIndex);
      } else {
        handleClose();
      }
    }
  };

  const formatDateDisplay = (iso: string) => {
    try { return format(parseISO(iso), "MMM d, yyyy"); } catch { return iso; }
  };

  const canParse = activeTab === "text" ? inputText.trim().length > 0 : screenshots.length > 0;
  const canSave = editArtist.trim().length > 0;

  const inputFieldClass = "bg-white/[0.05] border-white/10 text-foreground placeholder:text-muted-foreground";

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-white/10 bg-background/95 backdrop-blur-xl px-0 pb-safe-area-inset-bottom"
        style={{ maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* hidden file input — multiple allowed */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleScreenshotSelect}
        />

        {/* ─── INPUT STAGE ─────────────────────────────────────── */}
        {stage === "input" && (
          <div className="px-5 pt-2 pb-6 space-y-4">
            <SheetHeader className="text-left space-y-0.5">
              <SheetTitle className="text-lg font-bold">Plan a Show</SheetTitle>
              <p className="text-sm text-muted-foreground">AI reads links, captions, or screenshots</p>
            </SheetHeader>

            {/* Tab switcher */}
            <div className="flex gap-1 p-1 rounded-xl bg-white/[0.05] border border-white/[0.07]">
              <button
                onClick={() => setActiveTab("text")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "text"
                    ? "bg-white/[0.12] text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                <Link2 className="h-3.5 w-3.5" />
                Paste link
              </button>
              <button
                onClick={() => setActiveTab("screenshot")}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === "screenshot"
                    ? "bg-white/[0.12] text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground/70"
                }`}
              >
                <ImagePlus className="h-3.5 w-3.5" />
                Screenshot
              </button>
            </div>

            {/* Text tab */}
            {activeTab === "text" && (
              <>
                <p className="text-xs text-muted-foreground/60 text-center">Use screenshot for Instagram</p>
                <Textarea
                  placeholder="Paste any ticket link, text, or type artist name, venue, and date..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className={`min-h-[130px] resize-none text-sm ${inputFieldClass}`}
                  autoFocus
                />
              </>
            )}

            {/* Screenshot tab */}
            {activeTab === "screenshot" && (
              <div className="space-y-3">
                {screenshots.length === 0 ? (
                  /* Empty drop zone */
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition-colors flex flex-col items-center justify-center gap-2.5 group"
                  >
                    <div className="w-11 h-11 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center group-hover:bg-white/[0.14] transition-colors">
                      <ImagePlus className="h-5 w-5 text-white/60" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-white/60">Upload screenshots</p>
                      <p className="text-xs text-white/35 mt-0.5">Instagram, Ticketmaster, your group chat – add as many as you'd like</p>
                    </div>
                  </button>
                ) : (
                  /* Thumbnail strip */
                  <div>
                    <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                      {screenshots.map((s, i) => (
                        <div
                          key={i}
                          className="relative flex-shrink-0 w-24 h-24 rounded-xl overflow-hidden border border-white/10 bg-white/[0.04]"
                        >
                          <img
                            src={s.preview}
                            alt={`Screenshot ${i + 1}`}
                            className="w-full h-full object-cover"
                          />
                          <button
                            onClick={() => handleRemoveScreenshot(i)}
                            className="absolute top-1 right-1 w-5 h-5 rounded-full bg-black/70 backdrop-blur-sm flex items-center justify-center hover:bg-black/90 transition-colors"
                          >
                            <X className="h-3 w-3 text-white" />
                          </button>
                        </div>
                      ))}

                      {/* Add more button */}
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex-shrink-0 w-24 h-24 rounded-xl border border-dashed border-white/20 bg-white/[0.03] hover:bg-white/[0.07] transition-colors flex flex-col items-center justify-center gap-1.5 group"
                      >
                        <div className="w-7 h-7 rounded-full bg-white/[0.08] border border-white/[0.14] flex items-center justify-center group-hover:bg-white/[0.14] transition-colors">
                          <Plus className="h-3.5 w-3.5 text-white/60" />
                        </div>
                        <span className="text-[10px] text-white/40 font-medium">Add more</span>
                      </button>
                    </div>

                    <p className="text-xs text-white/35 mt-2">
                      {screenshots.length} screenshot{screenshots.length > 1 ? "s" : ""} — AI will read all of them
                    </p>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleParse}
                disabled={isParsing || !canParse}
                variant="glass"
                className="flex-1 gap-2 bg-primary/[0.08] border-primary/[0.22] hover:bg-primary/[0.14] hover:border-primary/[0.35] text-primary/90"
              >
                {isParsing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Reading...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Magic Add</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleManual}
                className="border-white/10 text-muted-foreground hover:text-foreground"
              >
                Manual
              </Button>
            </div>
          </div>
        )}

        {/* ─── CONFIRM STAGE ───────────────────────────────────── */}
        {stage === "confirm" && confirmedEvent && (
          <div className="px-5 pt-2 pb-6 space-y-5">
            {/* Header row: back + progress indicator */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleTryAgain}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                Try again
              </button>
              {parsedEvents.length > 1 && (
                <span className="text-xs text-muted-foreground bg-white/[0.06] border border-white/[0.10] px-2.5 py-1 rounded-full">
                  {currentEventIndex + 1} of {parsedEvents.length}
                </span>
              )}
            </div>

            {/* Artist card */}
            <div className="relative rounded-2xl overflow-hidden min-h-[110px]">
              {(selectedImageUrl ?? confirmedEvent.artist_image_url) ? (
                <div className="absolute inset-0">
                  <img src={selectedImageUrl ?? confirmedEvent.artist_image_url!} alt={confirmedEvent.artist_name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-white/[0.03]" />
              )}
              <div className="relative p-5 pt-16">
                <h2 className="text-2xl font-bold text-white mb-1" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                  {confirmedEvent.artist_name}
                </h2>
                {confirmedEvent.venue_name && <p className="text-white/80 text-sm">{confirmedEvent.venue_name}</p>}
                <div className="flex items-center gap-3 mt-1 text-white/60 text-sm">
                  {confirmedEvent.show_date && <span>{formatDateDisplay(confirmedEvent.show_date)}</span>}
                  {confirmedEvent.venue_location && <span>· {confirmedEvent.venue_location}</span>}
                </div>
                {confirmedEvent.ticket_url && (
                  <a href={confirmedEvent.ticket_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline">
                    <Ticket className="h-3.5 w-3.5" /> View Tickets
                  </a>
                )}
              </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Edit if needed</p>
              <div className="space-y-2">
                <Input placeholder="Artist name" value={editArtist} onChange={(e) => setEditArtist(e.target.value)} className={inputFieldClass} />
                <Input placeholder="Venue name (optional)" value={editVenue} onChange={(e) => setEditVenue(e.target.value)} className={inputFieldClass} />
                <Input placeholder="City / location (optional)" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className={inputFieldClass} />
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={inputFieldClass} />
              </div>
            </div>

            <div className="flex gap-3">
              <Button onClick={handleSave} disabled={isSaving || !canSave} variant="glass" className="flex-1 gap-2">
                {isSaving ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
                ) : (
                  "Add To Calendar →"
                )}
              </Button>
              {/* Skip button when multiple events */}
              {parsedEvents.length > 1 && currentEventIndex + 1 < parsedEvents.length && (
                <Button
                  variant="outline"
                  onClick={() => advanceToNextEvent(currentEventIndex + 1)}
                  className="border-white/10 text-muted-foreground hover:text-foreground"
                >
                  Skip
                </Button>
              )}
            </div>
          </div>
        )}

        {/* ─── MANUAL ENTRY STAGE ──────────────────────────────── */}
        {stage === "manual" && (
          <div className="px-5 pt-2 pb-6 space-y-5">
            <button onClick={() => setStage("input")} className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <SheetHeader className="text-left space-y-1">
              <SheetTitle className="text-lg font-bold">Add a Show</SheetTitle>
              <p className="text-sm text-muted-foreground">Fill in what you know</p>
            </SheetHeader>
            <div className="space-y-3">
              <div className="relative">
                <Music2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Artist name *" value={editArtist} onChange={(e) => setEditArtist(e.target.value)} className={`pl-9 ${inputFieldClass}`} autoFocus />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Venue name (optional)" value={editVenue} onChange={(e) => setEditVenue(e.target.value)} className={`pl-9 ${inputFieldClass}`} />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="City / location (optional)" value={editLocation} onChange={(e) => setEditLocation(e.target.value)} className={`pl-9 ${inputFieldClass}`} />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input type="date" value={editDate} onChange={(e) => setEditDate(e.target.value)} className={`pl-9 ${inputFieldClass}`} />
              </div>
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Ticket URL (optional)" value={editTicketUrl} onChange={(e) => setEditTicketUrl(e.target.value)} className={`pl-9 ${inputFieldClass}`} />
              </div>
            </div>
            <Button onClick={handleSave} disabled={isSaving || !canSave} variant="glass" className="w-full gap-2">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Add To Calendar →"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
