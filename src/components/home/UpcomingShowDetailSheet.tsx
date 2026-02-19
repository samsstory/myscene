import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Trash2, Ticket, MapPin, CalendarDays, CheckCircle2, AlertCircle, X, UserPlus, ChevronRight } from "lucide-react";
import { useShareShow } from "@/hooks/useShareShow";
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
import type { FriendShow } from "@/hooks/useFriendUpcomingShows";

type RsvpStatus = "going" | "maybe" | "not_going";

interface UpcomingShowDetailSheetProps {
  show: UpcomingShow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  onRsvpChange: (id: string, status: "going" | "maybe" | "not_going") => Promise<void>;
  goingWith?: FriendShow[];
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
    label: "I'm out",
    icon: <X className="h-4 w-4" />,
    activeClass: "bg-red-500/20 border-red-500/50 text-red-400",
  },
];

export default function UpcomingShowDetailSheet({
  show,
  open,
  onOpenChange,
  onDelete,
  onRsvpChange,
  goingWith = [],
}: UpcomingShowDetailSheetProps) {
  const [rsvp, setRsvp] = useState<RsvpStatus>(show?.rsvp_status ?? "going");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { shareShow } = useShareShow();

  // Sync RSVP state only when the selected show *changes* (different show opened),
  // not on every re-render — avoids resetting the optimistic local update.
  useEffect(() => {
    if (show?.rsvp_status) setRsvp(show.rsvp_status);
  }, [show?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <div className="relative h-52 overflow-hidden rounded-t-2xl">
            {show.artist_image_url ? (
              <>
                {/* Blurred background fill */}
                <img
                  src={show.artist_image_url}
                  alt=""
                  aria-hidden
                  className="absolute inset-0 w-full h-full object-cover scale-110"
                  style={{ filter: "blur(20px)", opacity: 0.5 }}
                />
                {/* Sharp portrait — object-top keeps the face in frame */}
                <img
                  src={show.artist_image_url}
                  alt={show.artist_name}
                  className="absolute inset-0 w-full h-full object-cover object-top"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent" />
            )}
            <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
              <h2 className="text-xl font-bold text-white" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
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
                    onClick={() => {
                      setRsvp(opt.value);
                      onRsvpChange(show.id, opt.value);
                    }}
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

          {/* Who's Going — social section */}
          {goingWith.length > 0 && (() => {
            // Prioritise friends with profile pictures
            const sorted = [...goingWith].sort((a, b) => {
              const aHas = a.friend.avatar_url ? 1 : 0;
              const bHas = b.friend.avatar_url ? 1 : 0;
              return bHas - aHas;
            });
            return (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  {goingWith.length === 1 ? "1 Friend Going" : `${goingWith.length} Friends Going`}
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                  {sorted.map((fs) => {
                    const name = fs.friend.full_name?.split(" ")[0] ?? fs.friend.username ?? "Friend";
                    const initial = (fs.friend.username ?? fs.friend.full_name ?? "?")[0].toUpperCase();
                    return (
                      <div key={fs.friend.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-14">
                        {fs.friend.avatar_url ? (
                          <img
                            src={fs.friend.avatar_url}
                            alt={name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-primary/40 ring-2 ring-primary/20"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center">
                            <span className="text-base font-bold text-primary/90">{initial}</span>
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full text-center">
                          {name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Invite a friend */}
          <button
            className="w-full flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] rounded-xl px-4 py-3 transition-all group"
            onClick={() =>
              shareShow({
                showId: show.id,
                type: "upcoming",
                artistName: show.artist_name,
                venueName: show.venue_name ?? undefined,
              })
            }
          >
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <UserPlus className="h-4 w-4 text-primary/70" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground/90">Invite a friend</p>
              <p className="text-[11px] text-muted-foreground">
                Invite them to join you at {show.artist_name}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </button>

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
