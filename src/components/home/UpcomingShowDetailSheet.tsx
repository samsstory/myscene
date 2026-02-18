import { useState } from "react";
import { format, parseISO } from "date-fns";
import { Trash2, Ticket, MapPin, CalendarDays, CheckCircle2, Circle, AlertCircle } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { UpcomingShow } from "@/hooks/usePlanUpcomingShow";

type RsvpStatus = "going" | "maybe" | "not_going";

interface UpcomingShowDetailSheetProps {
  show: UpcomingShow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
}

const RSVP_OPTIONS: { value: RsvpStatus; label: string; icon: React.ReactNode; activeClass: string }[] = [
  {
    value: "going",
    label: "Going",
    icon: <CheckCircle2 className="h-4 w-4" />,
    activeClass: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
  },
  {
    value: "maybe",
    label: "Maybe",
    icon: <AlertCircle className="h-4 w-4" />,
    activeClass: "bg-amber-500/20 border-amber-500/50 text-amber-400",
  },
  {
    value: "not_going",
    label: "Can't go",
    icon: <Circle className="h-4 w-4" />,
    activeClass: "bg-white/10 border-white/20 text-white/60",
  },
];

export default function UpcomingShowDetailSheet({
  show,
  open,
  onOpenChange,
  onDelete,
}: UpcomingShowDetailSheetProps) {
  const [rsvp, setRsvp] = useState<RsvpStatus>("going");
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!show) return null;

  const dateLabel = show.show_date
    ? (() => {
        try {
          return format(parseISO(show.show_date), "EEEE, MMMM d, yyyy");
        } catch {
          return show.show_date;
        }
      })()
    : "Date TBD";

  const handleDelete = () => {
    onDelete(show.id);
    setConfirmOpen(false);
    onOpenChange(false);
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent
          side="bottom"
          className="rounded-t-2xl border-white/10 bg-background/95 backdrop-blur-xl px-0 pb-safe-area-inset-bottom"
          style={{ maxHeight: "80vh", overflowY: "auto" }}
        >
          {/* Hero */}
          <div className="relative h-40 overflow-hidden">
            {show.artist_image_url ? (
              <>
                <img
                  src={show.artist_image_url}
                  alt={show.artist_name}
                  className="absolute inset-0 w-full h-full object-cover scale-110"
                  style={{ filter: "blur(3px)" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background/95 via-background/40 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
            )}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
              <h2 className="text-xl font-bold text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
                {show.artist_name}
              </h2>
            </div>
          </div>

          <div className="px-5 pt-4 pb-6 space-y-5">
            {/* Details */}
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <CalendarDays className="h-4 w-4 flex-shrink-0" />
                <span>{dateLabel}</span>
              </div>
              {(show.venue_name || show.venue_location) && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <MapPin className="h-4 w-4 flex-shrink-0" />
                  <span>
                    {[show.venue_name, show.venue_location].filter(Boolean).join(" · ")}
                  </span>
                </div>
              )}
              {show.ticket_url && (
                <a
                  href={show.ticket_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Ticket className="h-4 w-4 flex-shrink-0" />
                  View Tickets
                </a>
              )}
            </div>

            {/* RSVP */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                Your Status
              </p>
              <div className="flex gap-2">
                {RSVP_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRsvp(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      rsvp === opt.value
                        ? opt.activeClass
                        : "border-white/[0.08] text-muted-foreground hover:border-white/20 hover:text-foreground/70"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Remove */}
            <Button
              variant="outline"
              className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 gap-2"
              onClick={() => setConfirmOpen(true)}
            >
              <Trash2 className="h-4 w-4" />
              Remove from calendar
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Safe confirmation dialog */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-background/95 border-white/10 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this show?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{show.artist_name}</span> will be removed
              from your upcoming calendar. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500/80 hover:bg-red-500 text-white border-0"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
