import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Ticket, Loader2, Music2, Calendar, MapPin, Sparkles } from "lucide-react";
import { format, parseISO } from "date-fns";
import { usePlanUpcomingShow, type ParsedUpcomingEvent, type SaveUpcomingShowData } from "@/hooks/usePlanUpcomingShow";

interface PlanShowSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Stage = "input" | "confirm" | "manual";

export default function PlanShowSheet({ open, onOpenChange }: PlanShowSheetProps) {
  const { parseInput, saveUpcomingShow, isParsing, isSaving, clearParsedResult } = usePlanUpcomingShow();

  const [stage, setStage] = useState<Stage>("input");
  const [inputText, setInputText] = useState("");
  const [confirmedEvent, setConfirmedEvent] = useState<ParsedUpcomingEvent | null>(null);

  // Editable fields (populated from parse result or typed manually)
  const [editArtist, setEditArtist] = useState("");
  const [editVenue, setEditVenue] = useState("");
  const [editLocation, setEditLocation] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editTicketUrl, setEditTicketUrl] = useState("");

  const handleClose = () => {
    onOpenChange(false);
    // Reset after close animation
    setTimeout(() => {
      setStage("input");
      setInputText("");
      setConfirmedEvent(null);
      clearParsedResult();
    }, 300);
  };

  const handleParse = async () => {
    if (!inputText.trim()) {
      // No input → go to manual entry
      setStage("manual");
      return;
    }

    const events = await parseInput(inputText);
    if (events && events.length > 0) {
      const event = events[0];
      setConfirmedEvent(event);
      setEditArtist(event.artist_name);
      setEditVenue(event.venue_name || "");
      setEditLocation(event.venue_location || "");
      setEditDate(event.show_date || "");
      setEditTicketUrl(event.ticket_url || "");
      setStage("confirm");
    }
  };

  const handleTryAgain = () => {
    setStage("input");
    setConfirmedEvent(null);
    clearParsedResult();
  };

  const handleManual = () => {
    setEditArtist("");
    setEditVenue("");
    setEditLocation("");
    setEditDate("");
    setEditTicketUrl("");
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

  const canSave = editArtist.trim().length > 0;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-white/10 bg-background/95 backdrop-blur-xl px-0 pb-safe-area-inset-bottom"
        style={{ maxHeight: "90vh", overflowY: "auto" }}
      >
        {/* ─── INPUT STAGE ─────────────────────────────────────── */}
        {stage === "input" && (
          <div className="px-5 pt-2 pb-6 space-y-5">
            <SheetHeader className="text-left space-y-1">
              <SheetTitle className="text-lg font-bold">Plan a Show</SheetTitle>
              <p className="text-sm text-muted-foreground">
                Paste a link or type artist + details — AI will fill in the rest
              </p>
            </SheetHeader>

            <Textarea
              placeholder="Paste a Ticketmaster / RA link, Instagram caption, or just type the artist name, venue, and date..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              className="min-h-[120px] bg-white/[0.05] border-white/10 text-foreground placeholder:text-muted-foreground resize-none text-sm"
              autoFocus
            />

            <div className="flex gap-3">
              <Button
                onClick={handleParse}
                disabled={isParsing}
                className="flex-1 gap-2"
              >
                {isParsing ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> Parsing...</>
                ) : (
                  <><Sparkles className="h-4 w-4" /> Parse with AI</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={handleManual}
                className="border-white/10 text-muted-foreground hover:text-foreground"
              >
                Add manually
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
            <div className="relative rounded-2xl overflow-hidden">
              {/* Background image */}
              {confirmedEvent.artist_image_url ? (
                <div className="absolute inset-0">
                  <img
                    src={confirmedEvent.artist_image_url}
                    alt={confirmedEvent.artist_name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
                </div>
              ) : (
                <div className="absolute inset-0 bg-gradient-to-br from-primary/30 to-primary/10" />
              )}

              <div className="relative p-5 pt-16">
                <h2 className="text-2xl font-bold text-white mb-1" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                  {confirmedEvent.artist_name}
                </h2>
                {confirmedEvent.venue_name && (
                  <p className="text-white/80 text-sm">{confirmedEvent.venue_name}</p>
                )}
                <div className="flex items-center gap-3 mt-1 text-white/60 text-sm">
                  {confirmedEvent.show_date && (
                    <span>{formatDateDisplay(confirmedEvent.show_date)}</span>
                  )}
                  {confirmedEvent.venue_location && (
                    <span>· {confirmedEvent.venue_location}</span>
                  )}
                </div>
                {confirmedEvent.ticket_url && (
                  <a
                    href={confirmedEvent.ticket_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-3 text-sm text-primary hover:underline"
                  >
                    <Ticket className="h-3.5 w-3.5" />
                    View Tickets
                  </a>
                )}
              </div>
            </div>

            {/* Editable fields */}
            <div className="space-y-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Edit if needed</p>
              <div className="space-y-2">
                <Input
                  placeholder="Artist name"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className="bg-white/[0.05] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
                <Input
                  placeholder="Venue name (optional)"
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  className="bg-white/[0.05] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
                <Input
                  placeholder="City / location (optional)"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="bg-white/[0.05] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
                <Input
                  type="date"
                  placeholder="Date (optional)"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="bg-white/[0.05] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving || !canSave}
              className="w-full gap-2"
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                "Add to Upcoming →"
              )}
            </Button>
          </div>
        )}

        {/* ─── MANUAL ENTRY STAGE ──────────────────────────────── */}
        {stage === "manual" && (
          <div className="px-5 pt-2 pb-6 space-y-5">
            <button
              onClick={() => setStage("input")}
              className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>

            <SheetHeader className="text-left space-y-1">
              <SheetTitle className="text-lg font-bold">Add a Show</SheetTitle>
              <p className="text-sm text-muted-foreground">Fill in what you know</p>
            </SheetHeader>

            <div className="space-y-3">
              <div className="relative">
                <Music2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Artist name *"
                  value={editArtist}
                  onChange={(e) => setEditArtist(e.target.value)}
                  className="pl-9 bg-white/[0.05] border-white/10 text-foreground placeholder:text-muted-foreground"
                  autoFocus
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Venue name (optional)"
                  value={editVenue}
                  onChange={(e) => setEditVenue(e.target.value)}
                  className="pl-9 bg-white/[0.05] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="City / location (optional)"
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  className="pl-9 bg-white/[0.05] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="date"
                  placeholder="Date (optional)"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="pl-9 bg-white/[0.05] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>
              <div className="relative">
                <Ticket className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ticket URL (optional)"
                  value={editTicketUrl}
                  onChange={(e) => setEditTicketUrl(e.target.value)}
                  className="pl-9 bg-white/[0.05] border-white/10 text-foreground placeholder:text-muted-foreground"
                />
              </div>
            </div>

            <Button
              onClick={handleSave}
              disabled={isSaving || !canSave}
              className="w-full gap-2"
            >
              {isSaving ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
              ) : (
                "Add to Upcoming →"
              )}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
