import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import { useEdmtrainEvents, type EdmtrainEvent } from "@/hooks/useEdmtrainEvents";
import EdmtrainEventCard from "./EdmtrainEventCard";
import EdmtrainEventDetailSheet from "./EdmtrainEventDetailSheet";

interface EdmtrainDiscoveryFeedProps {
  onAddToSchedule: (event: EdmtrainEvent) => void;
  matchedArtistNames?: string[];
  overrideLat?: number | null;
  overrideLng?: number | null;
  overrideCity?: string | null;
}

interface GroupedEvent {
  event: EdmtrainEvent;
  endDate?: string;
}

function groupMultiDayEvents(events: EdmtrainEvent[]): GroupedEvent[] {
  const keyMap = new Map<string, GroupedEvent>();
  const order: string[] = [];

  for (const event of events) {
    const name = (event.event_name || event.artists.map(a => a.name).join(", ")).toLowerCase();
    const key = `${name}::${(event.venue_name || "").toLowerCase()}`;

    const existing = keyMap.get(key);
    if (existing) {
      if (event.event_date < existing.event.event_date) {
        existing.endDate = existing.endDate || existing.event.event_date;
        existing.event = { ...event, artists: mergeArtists(event.artists, existing.event.artists) };
      } else {
        const curEnd = existing.endDate || existing.event.event_date;
        if (event.event_date > curEnd) existing.endDate = event.event_date;
        existing.event = { ...existing.event, artists: mergeArtists(existing.event.artists, event.artists) };
      }
      if (!existing.event.artist_image_url && event.artist_image_url) {
        existing.event = { ...existing.event, artist_image_url: event.artist_image_url };
      }
    } else {
      keyMap.set(key, { event });
      order.push(key);
    }
  }

  return order.map(k => keyMap.get(k)!);
}

function mergeArtists(primary: EdmtrainEvent["artists"], secondary: EdmtrainEvent["artists"]) {
  const seen = new Set(primary.map(a => a.name.toLowerCase()));
  return [...primary, ...secondary.filter(a => !seen.has(a.name.toLowerCase()))];
}

export default function EdmtrainDiscoveryFeed({
  onAddToSchedule,
  matchedArtistNames = [],
  overrideLat,
  overrideLng,
  overrideCity,
}: EdmtrainDiscoveryFeedProps) {
  const { events, isLoading, error } = useEdmtrainEvents({
    overrideLat,
    overrideLng,
    overrideCity,
  });

  const [selectedEvent, setSelectedEvent] = useState<{ event: EdmtrainEvent; endDate?: string } | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const grouped = groupMultiDayEvents(events);
  const matchSet = new Set(matchedArtistNames.map((n) => n.toLowerCase()));

  const scored = grouped.map(({ event, endDate }) => {
    let score = 0;
    for (const artist of event.artists) {
      if (matchSet.has(artist.name.toLowerCase())) score += 10;
    }
    if (event.festival_ind) score += 2;
    return { event, endDate, score };
  });

  scored.sort((a, b) => b.score - a.score || a.event.event_date.localeCompare(b.event.event_date));
  const displayed = scored.slice(0, 12);

  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden pb-1">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="w-40 shrink-0 aspect-[3/4] rounded-2xl bg-white/[0.03]" />
        ))}
      </div>
    );
  }

  if (error || displayed.length === 0) {
    return (
      <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-6 text-center">
        <MapPin className="w-5 h-5 text-white/20 mx-auto mb-2" />
        <p className="text-xs text-white/40">
          {error ? "Couldn't load nearby events" : "No upcoming events found near you"}
        </p>
        <p className="text-[10px] text-white/25 mt-1">Powered by Edmtrain</p>
      </div>
    );
  }

  return (
    <>
      <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-hide -mx-1 px-1">
        {displayed.map(({ event, endDate }) => (
          <EdmtrainEventCard
            key={event.edmtrain_id}
            event={event}
            endDate={endDate}
            onAddToSchedule={onAddToSchedule}
            onClick={() => {
              setSelectedEvent({ event, endDate });
              setDetailOpen(true);
            }}
          />
        ))}
      </div>

      <EdmtrainEventDetailSheet
        event={selectedEvent?.event ?? null}
        endDate={selectedEvent?.endDate}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onAddToSchedule={onAddToSchedule}
      />
    </>
  );
}
