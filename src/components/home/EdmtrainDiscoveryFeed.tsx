import { Skeleton } from "@/components/ui/skeleton";
import { MapPin } from "lucide-react";
import { useEdmtrainEvents, type EdmtrainEvent } from "@/hooks/useEdmtrainEvents";
import EdmtrainEventCard from "./EdmtrainEventCard";

interface EdmtrainDiscoveryFeedProps {
  onAddToSchedule: (event: EdmtrainEvent) => void;
  matchedArtistNames?: string[];
}

export default function EdmtrainDiscoveryFeed({ onAddToSchedule, matchedArtistNames = [] }: EdmtrainDiscoveryFeedProps) {
  const { events, isLoading, error } = useEdmtrainEvents();

  // Personalization: boost events that match user's logged artists
  const matchSet = new Set(matchedArtistNames.map((n) => n.toLowerCase()));

  const scored = events.map((event) => {
    let score = 0;
    for (const artist of event.artists) {
      if (matchSet.has(artist.name.toLowerCase())) score += 10;
    }
    if (event.festival_ind) score += 2;
    return { event, score };
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
    <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1 scrollbar-hide -mx-1 px-1">
      {displayed.map(({ event }) => (
        <EdmtrainEventCard
          key={event.edmtrain_id}
          event={event}
          onAddToSchedule={onAddToSchedule}
        />
      ))}
    </div>
  );
}
