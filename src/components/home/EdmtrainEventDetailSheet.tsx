import { format } from "date-fns";
import { ExternalLink } from "lucide-react";
import { truncateArtists } from "@/lib/utils";
import { useShareShow } from "@/hooks/useShareShow";
import type { EdmtrainEvent } from "@/hooks/useEdmtrainEvents";
import ShowDetailSheet from "./ShowDetailSheet";

interface EdmtrainEventDetailSheetProps {
  event: EdmtrainEvent | null;
  endDate?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAddToSchedule: (event: EdmtrainEvent, rsvpStatus?: string) => void;
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
  const { shareShow } = useShareShow();
  if (!event) return null;

  const displayName = event.event_name || truncateArtists(event.artists.map(a => a.name), 3);
  const headliner = event.artists[0]?.name;

  return (
    <ShowDetailSheet
      open={open}
      onOpenChange={onOpenChange}
      title={displayName}
      subtitle={event.event_name && event.artists.length > 0 ? truncateArtists(event.artists.map(a => a.name), 3) : undefined}
      imageUrl={event.artist_image_url}
      dateLabel={formatDateRange(event.event_date, endDate)}
      venueName={event.venue_name}
      venueLocation={event.venue_location}
      spotifySearchTerm={headliner}
      heroBadge={event.festival_ind ? (
        <span className="text-[9px] uppercase tracking-widest font-bold text-primary bg-primary/20 backdrop-blur-sm px-2 py-0.5 rounded-full border border-primary/30">
          Festival
        </span>
      ) : undefined}
      ticketUrl={event.event_link}
      rsvpMode="add"
      onAddToSchedule={(status) => onAddToSchedule(event, status)}
      onInvite={() =>
        shareShow({
          showId: String(event.edmtrain_id),
          type: "edmtrain",
          artistName: displayName,
          venueName: event.venue_name ?? undefined,
          edmtrainLink: event.event_link,
        })
      }
      inviteDescription="Share this event with your squad"
      footer={
        <>
          {/* Festival badge rendered as a hero overlay via children isn't needed—
              we handle it below. For lineup chips we use children slot. */}
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
        </>
      }
    >
      {/* Artists lineup chips */}
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
    </ShowDetailSheet>
  );
}
