import { useState } from "react";
import {
  MapPin,
  CalendarDays,
  Ticket,
  Music,
  UserPlus,
  ChevronRight,
  CheckCircle2,
  CircleHelp,
  X,
  Link,
  Send,
} from "lucide-react";
import { truncateArtists } from "@/lib/utils";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/* ── Shared types ─────────────────────────────────────── */

type RsvpStatus = "going" | "maybe" | "not_going";

const RSVP_OPTIONS: { value: RsvpStatus; label: string; icon: React.ReactNode; activeClass: string }[] = [
  {
    value: "going",
    label: "I'm in",
    icon: <CheckCircle2 className="h-4 w-4" />,
    activeClass: "bg-emerald-500/20 border-emerald-500/50 text-emerald-400",
  },
  {
    value: "maybe",
    label: "Maybe",
    icon: <CircleHelp className="h-4 w-4" />,
    activeClass: "bg-amber-500/20 border-amber-500/50 text-amber-400",
  },
  {
    value: "not_going",
    label: "I'm out",
    icon: <X className="h-4 w-4" />,
    activeClass: "bg-red-500/20 border-red-500/50 text-red-400",
  },
];

/* ── Friend avatar type ───────────────────────────────── */

export interface GoingWithFriend {
  id: string;
  username?: string | null;
  full_name?: string | null;
  avatar_url?: string | null;
}

/* ── Props ────────────────────────────────────────────── */

export interface ShowDetailSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;

  /* Normalised show data */
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  dateLabel: string;
  venueName?: string | null;
  venueLocation?: string | null;
  spotifySearchTerm?: string;

  /* Ticket */
  ticketUrl?: string | null;
  /** If true, allow the user to add/edit a ticket link inline */
  editableTicket?: boolean;
  onSaveTicketUrl?: (url: string) => void;

  /* RSVP (3-way toggle for owned shows, or add-to-schedule for discovery) */
  rsvpMode: "toggle" | "add";
  currentRsvp?: RsvpStatus;
  onRsvpChange?: (status: RsvpStatus) => void;
  /** Called in "add" mode when user picks going/maybe */
  onAddToSchedule?: (status: RsvpStatus) => void;

  /* Invite */
  onInvite: () => void;
  inviteDescription?: string;

  /* Friends going */
  goingWith?: GoingWithFriend[];

  /* Optional extra sections rendered between details & actions */
  children?: React.ReactNode;

  /* Badge overlay on top-left of hero image (e.g. "Festival") */
  heroBadge?: React.ReactNode;

  /* Footer slot (e.g. Edmtrain attribution, delete button) */
  footer?: React.ReactNode;
}

/* ── Component ────────────────────────────────────────── */

export default function ShowDetailSheet({
  open,
  onOpenChange,
  title,
  subtitle,
  imageUrl,
  dateLabel,
  venueName,
  venueLocation,
  spotifySearchTerm,
  ticketUrl: initialTicketUrl,
  editableTicket = false,
  onSaveTicketUrl,
  rsvpMode,
  currentRsvp = "going",
  onRsvpChange,
  onAddToSchedule,
  onInvite,
  inviteDescription,
  goingWith = [],
  children,
  heroBadge,
  footer,
}: ShowDetailSheetProps) {
  const [rsvp, setRsvp] = useState<RsvpStatus>(currentRsvp);
  const [addingTicket, setAddingTicket] = useState(false);
  const [ticketInput, setTicketInput] = useState("");
  const [localTicketUrl, setLocalTicketUrl] = useState<string | null>(initialTicketUrl ?? null);

  // Sync when the parent changes (e.g. different show selected)
  // We rely on the parent re-mounting or keying the component
  // but also handle prop changes for rsvp
  if (currentRsvp !== rsvp && rsvpMode === "toggle") {
    setRsvp(currentRsvp);
  }

  const handleSaveTicket = () => {
    if (!ticketInput.trim()) return;
    const url = ticketInput.trim();
    setLocalTicketUrl(url);
    setAddingTicket(false);
    setTicketInput("");
    onSaveTicketUrl?.(url);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-white/10 bg-background/95 backdrop-blur-xl px-0 pb-safe-area-inset-bottom"
        style={{ maxHeight: "80vh", overflowY: "auto" }}
      >
        {/* ── Hero ── */}
        <div className="relative h-52 overflow-hidden rounded-t-2xl">
          {imageUrl ? (
            <>
              <img
                src={imageUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover scale-110"
                style={{ filter: "blur(20px)", opacity: 0.5 }}
              />
              <img
                src={imageUrl}
                alt={title}
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent flex items-center justify-center">
              <Music className="w-16 h-16 text-white/10" />
            </div>
          )}

          {heroBadge && (
            <div className="absolute top-3 left-4 z-10">
              {heroBadge}
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <h2
              className="text-xl font-bold text-white line-clamp-1"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p className="text-sm text-white/60 mt-0.5 line-clamp-1">{subtitle}</p>
            )}
          </div>
        </div>

        <div className="px-5 pt-4 pb-6 space-y-5">
          {/* ── Details ── */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 flex-shrink-0" />
              <span>{dateLabel}</span>
            </div>
            {(venueName || venueLocation) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>{[venueName, venueLocation].filter(Boolean).join(" · ")}</span>
              </div>
            )}

            {/* Ticket link */}
            {localTicketUrl ? (
              <a
                href={localTicketUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-white/70 text-[11px] font-medium hover:bg-white/20 hover:text-white active:scale-95 transition-all"
              >
                <Ticket className="h-3 w-3 flex-shrink-0" />
                Tickets
              </a>
            ) : editableTicket && addingTicket ? (
              <div className="flex items-center gap-2">
                <input
                  type="url"
                  value={ticketInput}
                  onChange={(e) => setTicketInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSaveTicket()}
                  placeholder="Paste ticket link…"
                  autoFocus
                  className="flex-1 text-sm bg-white/[0.06] border border-white/[0.12] rounded-lg px-3 py-1.5 text-foreground placeholder:text-muted-foreground/50 outline-none focus:border-primary/50 transition-colors"
                />
                <button
                  onClick={handleSaveTicket}
                  disabled={!ticketInput.trim()}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 hover:bg-primary/30 disabled:opacity-40 transition-colors"
                >
                  <Send className="h-3.5 w-3.5 text-primary" />
                </button>
                <button
                  onClick={() => { setAddingTicket(false); setTicketInput(""); }}
                  className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg hover:bg-white/[0.06] transition-colors"
                >
                  <X className="h-3.5 w-3.5 text-muted-foreground" />
                </button>
              </div>
            ) : editableTicket ? (
              <button
                onClick={() => setAddingTicket(true)}
                className="flex items-center gap-2 text-sm text-muted-foreground/70 hover:text-muted-foreground transition-colors group"
              >
                <Link className="h-4 w-4 flex-shrink-0" />
                <span>Add ticket link</span>
                <span className="text-[10px] bg-white/[0.06] border border-white/[0.08] rounded px-1.5 py-0.5 text-muted-foreground/50 group-hover:border-white/[0.14] transition-colors ml-1">
                  Help your friends out
                </span>
              </button>
            ) : null}

            {/* Spotify */}
            {spotifySearchTerm && (
              <a
                href={`https://open.spotify.com/search/${encodeURIComponent(spotifySearchTerm)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"
                aria-label="Listen on Spotify"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" fill="#1DB954" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
                </svg>
                <span className="text-xs text-[#1DB954] font-medium">Spotify</span>
              </a>
            )}
          </div>

          {/* ── Injected children (lineup chips, festival badge, etc.) ── */}
          {children}

          {/* ── RSVP ── */}
          <div className="space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
              {rsvpMode === "add" ? "Add to Schedule" : "Your Status"}
            </p>
            <div className="flex gap-2">
              {RSVP_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setRsvp(opt.value);
                    if (rsvpMode === "toggle") {
                      onRsvpChange?.(opt.value);
                    } else if (opt.value === "not_going") {
                      onOpenChange(false);
                    } else {
                      onAddToSchedule?.(opt.value);
                      onOpenChange(false);
                    }
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


          {/* ── Who's Going ── */}
          {goingWith.length > 0 && (() => {
            const sorted = [...goingWith].sort((a, b) => {
              const aHas = a.avatar_url ? 1 : 0;
              const bHas = b.avatar_url ? 1 : 0;
              return bHas - aHas;
            });
            return (
              <div className="space-y-3">
                <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                  {goingWith.length === 1 ? "1 Friend Going" : `${goingWith.length} Friends Going`}
                </p>
                <div className="flex gap-3 overflow-x-auto pb-1 -mx-1 px-1" style={{ scrollbarWidth: "none" }}>
                  {sorted.map((f) => {
                    const name = f.full_name?.split(" ")[0] ?? f.username ?? "Friend";
                    const initial = (f.username ?? f.full_name ?? "?")[0].toUpperCase();
                    return (
                      <div key={f.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 w-14">
                        {f.avatar_url ? (
                          <img
                            src={f.avatar_url}
                            alt={name}
                            className="w-12 h-12 rounded-full object-cover border-2 border-primary/40 ring-2 ring-primary/20"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-full bg-primary/20 border-2 border-primary/30 flex items-center justify-center">
                            <span className="text-base font-bold text-primary/90">{initial}</span>
                          </div>
                        )}
                        <span className="text-[10px] text-muted-foreground text-center leading-tight truncate w-full">
                          {name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* ── Invite a friend ── */}
          <button
            className="w-full flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.07] rounded-xl px-4 py-3 transition-all group"
            onClick={onInvite}
          >
            <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
              <UserPlus className="h-4 w-4 text-primary/70" />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground/90">Invite a friend</p>
              <p className="text-[11px] text-muted-foreground line-clamp-2">
                {inviteDescription ?? "Share this event with your squad"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-muted-foreground transition-colors" />
          </button>

          {/* ── Footer (delete button, edmtrain attribution, etc.) ── */}
          {footer}
        </div>
      </SheetContent>
    </Sheet>
  );
}
