import { format } from "date-fns";
import { CalendarPlus, MapPin, CalendarDays, Ticket, Music, ExternalLink } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { EdmtrainEvent } from "@/hooks/useEdmtrainEvents";

interface EdmtrainEventDetailSheetProps {
  event: EdmtrainEvent | null;
  endDate?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToSchedule: (event: EdmtrainEvent) => void;
}

function formatDateRange(startIso: string, endIso?: string): string {
  const start = new Date(startIso + "T12:00:00");
  if (!endIso || endIso === startIso) return format(start, "EEEE, MMMM d, yyyy");
  const end = new Date(endIso + "T12:00:00");
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, "EEEE, MMMM d")}–${format(end, "d, yyyy")}`;
  }
  return `${format(start, "MMM d")}–${format(end, "MMM d, yyyy")}`;
}

export default function EdmtrainEventDetailSheet({
  event,
  endDate,
  open,
  onOpenChange,
  onAddToSchedule,
}: EdmtrainEventDetailSheetProps) {
  if (!event) return null;

  const artistNames = event.artists.map((a) => a.name).join(", ");
  const displayName = event.event_name || artistNames || "Event";
  const dateLabel = formatDateRange(event.event_date, endDate);
  const headliner = event.artists[0]?.name;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="rounded-t-2xl border-white/10 bg-background/95 backdrop-blur-xl px-0 pb-safe-area-inset-bottom"
        style={{ maxHeight: "80vh", overflowY: "auto" }}
      >
        {/* Hero */}
        <div className="relative h-52 overflow-hidden rounded-t-2xl">
          {event.artist_image_url ? (
            <>
              <img
                src={event.artist_image_url}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover scale-110"
                style={{ filter: "blur(20px)", opacity: 0.5 }}
              />
              <img
                src={event.artist_image_url}
                alt={displayName}
                className="absolute inset-0 w-full h-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            </>
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/10 to-transparent flex items-center justify-center">
              <Music className="w-16 h-16 text-white/10" />
            </div>
          )}

          {/* Festival badge */}
          {event.festival_ind && (
            <span className="absolute top-3 left-3 text-[9px] uppercase tracking-widest font-bold text-primary bg-primary/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-primary/30 z-10">
              Festival
            </span>
          )}

          <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
            <h2 className="text-xl font-bold text-white" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
              {displayName}
            </h2>
            {event.event_name && artistNames && (
              <p className="text-sm text-white/60 mt-0.5 line-clamp-1">{artistNames}</p>
            )}
          </div>
        </div>

        <div className="px-5 pt-4 pb-6 space-y-5">
          {/* Details */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 flex-shrink-0" />
              <span>{dateLabel}</span>
            </div>
            {(event.venue_name || event.venue_location) && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4 flex-shrink-0" />
                <span>
                  {[event.venue_name, event.venue_location].filter(Boolean).join(" · ")}
                </span>
              </div>
            )}
            <a
              href={event.event_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <Ticket className="h-4 w-4 flex-shrink-0" />
              View Tickets
            </a>

            {/* Spotify link for headliner */}
            {headliner && (
              <a
                href={`https://open.spotify.com/search/${encodeURIComponent(headliner)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity"
                aria-label="Listen on Spotify"
              >
                <svg viewBox="0 0 24 24" className="h-5 w-5 flex-shrink-0" fill="#1DB954" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z"/>
                </svg>
                <span className="text-xs text-[#1DB954] font-medium">Listen on Spotify</span>
              </a>
            )}
          </div>

          {/* Artists list for festivals / multi-artist events */}
          {event.artists.length > 1 && (
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-semibold">
                Lineup ({event.artists.length} artists)
              </p>
              <div className="flex flex-wrap gap-1.5">
                {event.artists.slice(0, 20).map((artist) => (
                  <span
                    key={artist.id}
                    className="text-xs bg-white/[0.06] border border-white/[0.08] rounded-lg px-2.5 py-1 text-foreground/70"
                  >
                    {artist.name}
                  </span>
                ))}
                {event.artists.length > 20 && (
                  <span className="text-xs text-muted-foreground/50 px-2 py-1">
                    +{event.artists.length - 20} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Add to schedule */}
          <Button
            className="w-full gap-2"
            onClick={() => {
              onAddToSchedule(event);
              onOpenChange(false);
            }}
          >
            <CalendarPlus className="h-4 w-4" />
            Add to My Schedule
          </Button>

          {/* Edmtrain + event link */}
          <div className="flex items-center justify-between pt-1">
            <a
              href={event.event_link}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs text-muted-foreground/50 hover:text-muted-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              View on Edmtrain
            </a>
            <a
              href={event.event_link}
              target="_blank"
              rel="noopener noreferrer"
              className="opacity-40 hover:opacity-70 transition-opacity"
            >
              <img
                src="https://edmtrain.s3.amazonaws.com/img/logo/logo-web.svg"
                alt="Edmtrain"
                className="h-[14px] w-auto invert"
              />
            </a>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
