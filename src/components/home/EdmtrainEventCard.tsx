import { CalendarPlus, Music, Ticket, CheckCircle2, CircleHelp } from "lucide-react";
import { type EdmtrainEvent } from "@/hooks/useEdmtrainEvents";
import { format } from "date-fns";

export type ScheduledStatus = "going" | "maybe" | null;

interface EdmtrainEventCardProps {
  event: EdmtrainEvent;
  endDate?: string;
  onAddToSchedule: (event: EdmtrainEvent, rsvpStatus?: string) => void;
  onClick?: () => void;
  scheduledStatus?: ScheduledStatus;
}

function formatDateRange(startIso: string, endIso?: string): string {
  const start = new Date(startIso + "T12:00:00");
  if (!endIso || endIso === startIso) return format(start, "MMM d");
  const end = new Date(endIso + "T12:00:00");
  if (start.getMonth() === end.getMonth()) {
    return `${format(start, "MMM d")}–${format(end, "d")}`;
  }
  return `${format(start, "MMM d")}–${format(end, "MMM d")}`;
}

export default function EdmtrainEventCard({ event, endDate, onAddToSchedule, onClick, scheduledStatus }: EdmtrainEventCardProps) {
  const artistNames = event.artists.map((a) => a.name).join(", ");
  const displayName = event.event_name || artistNames || "Event";
  const dateStr = formatDateRange(event.event_date, endDate);
  const hasImage = !!event.artist_image_url;

  return (
    <div
      className="relative w-40 shrink-0 snap-start aspect-[3/4] rounded-2xl overflow-hidden group cursor-pointer"
      onClick={onClick}
    >
      {/* Background image or gradient fallback */}
      {hasImage ? (
        <img
          src={event.artist_image_url!}
          alt={displayName}
          className="absolute inset-0 w-full h-full object-cover"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center">
          <Music className="w-10 h-10 text-white/15" />
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      {/* Festival badge - top left */}
      {event.festival_ind && (
        <span className="absolute top-2 left-2 text-[8px] uppercase tracking-widest font-bold text-primary bg-primary/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-primary/30 z-10">
          Festival
        </span>
      )}

      {/* Add to schedule / status badge - top right */}
      {scheduledStatus ? (
        <div
          className={`absolute top-2 right-2 flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm border z-10 text-[9px] font-bold uppercase tracking-wider ${
            scheduledStatus === "going"
              ? "bg-emerald-500/25 border-emerald-500/40 text-emerald-300"
              : "bg-amber-500/25 border-amber-500/40 text-amber-300"
          }`}
        >
          {scheduledStatus === "going" ? (
            <CheckCircle2 className="w-3 h-3" />
          ) : (
            <CircleHelp className="w-3 h-3" />
          )}
          {scheduledStatus === "going" ? "Going" : "Maybe"}
        </div>
      ) : (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onAddToSchedule(event);
          }}
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white/80 hover:bg-primary/30 hover:border-primary/40 hover:text-primary active:scale-90 transition-all z-10"
        >
          <CalendarPlus className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Bottom content */}
      <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
        <h4 className="text-[13px] font-semibold text-white leading-tight line-clamp-2">{displayName}</h4>
        {event.event_name && artistNames && (
          <p className="text-[10px] text-white/60 truncate mt-0.5">{artistNames}</p>
        )}
        <p className="text-[10px] text-white/50 truncate mt-1">
          {event.venue_name} · {dateStr}
        </p>

        {/* Bottom row: Ticket + Edmtrain logo */}
        <div className="flex items-center justify-between mt-2">
          <a
            href={event.event_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 backdrop-blur-sm border border-white/15 text-white/70 text-[10px] font-medium hover:bg-white/20 hover:text-white active:scale-95 transition-all"
          >
            <Ticket className="w-3 h-3" />
            Tickets
          </a>
          <a
            href={event.event_link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="opacity-40 hover:opacity-70 transition-opacity"
          >
            <img
              src="https://edmtrain.s3.amazonaws.com/img/logo/logo-web.svg"
              alt="Edmtrain"
              className="h-[12px] w-auto invert"
            />
          </a>
        </div>
      </div>
    </div>
  );
}
