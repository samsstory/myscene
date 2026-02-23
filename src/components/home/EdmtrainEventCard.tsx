import { ExternalLink, CalendarPlus, Music } from "lucide-react";
import { cn } from "@/lib/utils";
import { type EdmtrainEvent } from "@/hooks/useEdmtrainEvents";
import { format } from "date-fns";

interface EdmtrainEventCardProps {
  event: EdmtrainEvent;
  onAddToSchedule: (event: EdmtrainEvent) => void;
  compact?: boolean;
}

export default function EdmtrainEventCard({ event, onAddToSchedule, compact }: EdmtrainEventCardProps) {
  const artistNames = event.artists.map((a) => a.name).join(", ");
  const displayName = event.event_name || artistNames || "Event";
  const dateStr = format(new Date(event.event_date + "T12:00:00"), "MMM d");

  return (
    <div
      className={cn(
        "group relative rounded-2xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-md overflow-hidden transition-all duration-300 hover:bg-white/[0.06] hover:border-white/[0.14]",
        compact ? "p-3" : "p-4"
      )}
    >
      {/* Festival badge */}
      {event.festival_ind && (
        <span className="absolute top-2 right-2 text-[9px] uppercase tracking-widest font-bold text-primary/70 bg-primary/10 px-2 py-0.5 rounded-full border border-primary/20">
          Festival
        </span>
      )}

      <div className="space-y-2">
        {/* Artist / Event name */}
        <div className="flex items-start gap-2">
          <div className="w-8 h-8 rounded-lg bg-white/[0.06] flex items-center justify-center shrink-0">
            <Music className="w-4 h-4 text-white/40" />
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-semibold text-white/90 truncate">{displayName}</h4>
            {event.event_name && artistNames && (
              <p className="text-xs text-white/50 truncate">{artistNames}</p>
            )}
          </div>
        </div>

        {/* Venue + Date */}
        <div className="flex items-center justify-between text-xs text-white/50">
          <span className="truncate max-w-[60%]">
            {event.venue_name}{event.venue_location ? ` · ${event.venue_location}` : ""}
          </span>
          <span className="font-medium text-white/70 shrink-0">{dateStr}</span>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <button
            onClick={() => onAddToSchedule(event)}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-primary/15 border border-primary/25 text-primary text-xs font-semibold hover:bg-primary/25 active:scale-[0.97] transition-all"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            Add to Schedule
          </button>
          <a
            href={event.event_link}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 px-3 py-2 rounded-xl bg-white/[0.06] border border-white/[0.10] text-white/60 text-xs font-medium hover:bg-white/[0.10] hover:text-white/80 active:scale-[0.97] transition-all"
          >
            <ExternalLink className="w-3 h-3" />
            Edmtrain
          </a>
        </div>
      </div>

      {/* Attribution */}
      <div className="mt-2 flex items-center justify-end">
        <span className="text-[9px] text-white/25 tracking-wide">Powered by Edmtrain</span>
      </div>
    </div>
  );
}
