import { useState, useRef, useCallback } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Ticket, Loader2, Music2, Calendar, MapPin, Sparkles, ImagePlus, X, Link2 } from "lucide-react";
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

// Compress image to base64, max ~800px wide to keep payload reasonable
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
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [confirmedEvent, setConfirmedEvent] = useState<ParsedUpcomingEvent | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Editable fields
  const [editArtist, setEditArtist] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTicketUrl, setEditTicketUrl] = useState("");

  const resetInputState = useCallback(() => {
    setInputText("");
    setScreenshotFile(null);
    setScreenshotPreview(null);
    setConfirmedEvent(null);
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
    const file = e.target.files?.[0];
    if (!file) return;
    setScreenshotFile(file);
    const preview = URL.createObjectURL(file);
    setScreenshotPreview(preview);
    // Reset file input so same file can be re-selected
    e.target.value = "";
  };

  const handleRemoveScreenshot = () => {
    if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
    setScreenshotFile(null);
    setScreenshotPreview(null);
  };

  const handleParse = async () => {
    const hasText = inputText.trim().length > 0;
    const hasImage = !!screenshotFile;

    if (!hasText && !hasImage) {
      setEditArtist(""); setEditVenue(""); setEditLocation(""); setEditDate(""); setEditTicketUrl("");
      setStage("manual");
      return;
    }

    setIsParsing(true);
    try {
      let imageBase64: string | undefined;
      if (hasImage) {
        imageBase64 = await compressImageToBase64(screenshotFile!);
      }

      const { data, error: fnError } = await supabase.functions.invoke("parse-upcoming-show", {
        body: {
          input: hasText ? inputText : undefined,
          image: imageBase64,
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

      const event = events[0];
      setConfirmedEvent(event);
      setEditArtist(event.artist_name);
      setEditVenue(event.venue_name || "");
      setEditLocation(event.venue_location || "");
      setEditDate(event.show_date || "");
      setEditTicketUrl(event.ticket_url || "");
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
    clearParsedResult();
  };

  const handleManual = () => {
    setEditArtist(""); setEditVenue(""); setEditLocation(""); setEditDate(""); setEditTicketUrl("");
    setStage("manual");
  };

  const handleSave = async () => {
    const data: SaveUpcomingShowData = {
      artist_name: editArtist,
      venue_name: editVenue || undefined,
      venue_location: editLocation || undefined,
      show_date: editDate || undefined,
      ticket_url: editTicketUrl || undefined,
      artist_image_url: confirmedEvent?.artist_image_url || undefined,
      raw_input: inputText || undefined,
    };
    const ok = await saveUpcomingShow(data);
    if (ok) handleClose();
  };

  const formatDateDisplay = (iso: string) => {
    try { return format(parseISO(iso), "MMM d, yyyy"); } catch { return iso; }
  };

  const canParse = activeTab === "text" ? inputText.trim().length > 0 : !!screenshotFile;
  const canSave = editArtist.trim().length > 0;

  const inputFieldClass = "bg-white/[0.05] border-white/10 text-foreground placeholder:text-muted-foreground";

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-white/10 bg-background/95 backdrop-blur-xl px-0 pb-safe-area-inset-bottom"
        style={{ maxHeight: "92vh", overflowY: "auto" }}
      >
        {/* hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
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
                  placeholder="Paste a Ticketmaster / RA link, Instagram caption, or type artist name, venue, and date..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className={`min-h-[130px] resize-none text-sm ${inputFieldClass}`}
                  autoFocus
                />
              </>
            )}

            {/* Screenshot tab */}
            {activeTab === "screenshot" && (
              <div>
                {!screenshotPreview ? (
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full h-36 rounded-2xl border-2 border-dashed border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition-colors flex flex-col items-center justify-center gap-2.5 group"
                  >
                    <div className="w-11 h-11 rounded-full bg-primary/15 border border-primary/30 flex items-center justify-center group-hover:bg-primary/25 transition-colors">
                      <ImagePlus className="h-5 w-5 text-primary/80" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-medium text-white/60">Upload screenshot</p>
                      <p className="text-xs text-white/35 mt-0.5">Instagram post, Ticketmaster, RA, anything</p>
                    </div>
                  </button>
                ) : (
                  <div className="relative rounded-2xl overflow-hidden bg-white/[0.04] border border-white/10">
                    <img
                      src={screenshotPreview}
                      alt="Screenshot preview"
                      className="w-full max-h-56 object-contain"
                    />
                    <button
                      onClick={handleRemoveScreenshot}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-white" />
                    </button>
                    <div className="px-3 py-2">
                      <p className="text-xs text-muted-foreground truncate">{screenshotFile?.name}</p>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleParse}
                disabled={isParsing || !canParse}
                className="flex-1 gap-2"
              >
                {isParsing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Reading...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Parse with AI</>
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
            <button
              onClick={handleTryAgain}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Try again
            </button>

            {/* Artist card */}
            <div className="relative rounded-2xl overflow-hidden min-h-[110px]">
              {confirmedEvent.artist_image_url ? (
                <div className="absolute inset-0">
                  <img src={confirmedEvent.artist_image_url} alt={confirmedEvent.artist_name} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10" />
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

            <Button onClick={handleSave} disabled={isSaving || !canSave} className="w-full gap-2">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Add to Upcoming →"}
            </Button>
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
            <Button onClick={handleSave} disabled={isSaving || !canSave} className="w-full gap-2">
              {isSaving ? <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</> : "Add to Upcoming →"}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
