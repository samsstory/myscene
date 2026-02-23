import { Music2, Lock } from "lucide-react";
import { useDiscoverEvents, type DiscoverPick } from "@/hooks/useDiscoverEvents";
import { initiateSpotifyAuth } from "@/lib/spotify-pkce";
import EdmtrainEventCard from "./EdmtrainEventCard";
import { type EdmtrainEvent } from "@/hooks/useEdmtrainEvents";

interface DiscoverFeedProps {
  userArtistNames?: string[];
  onAddToSchedule?: (event: EdmtrainEvent, rsvpStatus?: string) => void;
}

function SpotifyIcon({ className = "" }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.4 0 0 5.4 0 12s5.4 12 12 12 12-5.4 12-12S18.66 0 12 0zm5.521 17.34c-.24.359-.66.48-1.021.24-2.82-1.74-6.36-2.101-10.561-1.141-.418.122-.779-.179-.899-.539-.12-.421.18-.78.54-.9 4.56-1.021 8.52-.6 11.64 1.32.42.18.479.659.301 1.02zm1.44-3.3c-.301.42-.841.6-1.262.3-3.239-1.98-8.159-2.58-11.939-1.38-.479.12-1.02-.12-1.14-.6-.12-.48.12-1.021.6-1.141C9.6 9.9 15 10.561 18.72 12.84c.361.181.54.78.241 1.2zm.12-3.36C15.24 8.4 8.82 8.16 5.16 9.301c-.6.179-1.2-.181-1.38-.721-.18-.601.18-1.2.72-1.381 4.26-1.26 11.28-1.02 15.721 1.621.539.3.719 1.02.419 1.56-.299.421-1.02.599-1.559.3z" />
    </svg>
  );
}

/* ── Placeholder teaser cards (blurred) ── */
const TEASER_ARTISTS = [
  { name: "Your top artist", venue: "Local Venue" },
  { name: "Based on taste", venue: "Near You" },
  { name: "Friends going", venue: "This Weekend" },
];

function DiscoverTeaser() {
  return (
    <div className="relative">
      {/* Blurred fake cards */}
      <div className="flex gap-3 overflow-hidden pb-1 -mx-4 px-4 pointer-events-none select-none" style={{ scrollbarWidth: "none" }}>
        {TEASER_ARTISTS.map((item, i) => (
          <div
            key={i}
            className="relative w-40 shrink-0 aspect-[3/4] rounded-2xl overflow-hidden"
            style={{ filter: "blur(6px)", opacity: 0.5 }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-white/[0.12] to-white/[0.04] flex items-center justify-center">
              <Music2 className="w-10 h-10 text-white/15" />
            </div>
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />
            <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
              <span className="inline-block text-[9px] bg-white/10 rounded-full px-2 py-0.5 text-white/70 mb-1.5">
                Personalized
              </span>
              <h4 className="text-[13px] font-semibold text-white leading-tight">{item.name}</h4>
              <p className="text-[10px] text-white/50 mt-1">{item.venue}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Connect overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <div className="flex flex-col items-center gap-3 px-4 text-center">
          <div className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/15 flex items-center justify-center">
            <Lock className="h-4.5 w-4.5 text-white/50" />
          </div>
          <p className="text-sm font-medium text-white/70 max-w-[220px]">
            Connect Spotify to unlock personalized show picks
          </p>
          <button
            onClick={() => initiateSpotifyAuth()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#1DB954]/20 border border-[#1DB954]/40 text-[#1DB954] text-sm font-semibold hover:bg-[#1DB954]/30 transition-colors"
          >
            <SpotifyIcon className="h-4 w-4" />
            Connect Spotify
          </button>
        </div>
      </div>
    </div>
  );
}

export default function DiscoverFeed({ userArtistNames = [], onAddToSchedule }: DiscoverFeedProps) {
  const { picks, isLoading, isEmpty, spotifyConnected, hasSignals } = useDiscoverEvents(userArtistNames);

  // Loading
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {[1, 2].map((i) => (
          <div key={i} className="flex-shrink-0 w-40 aspect-[3/4] rounded-2xl bg-white/[0.05] animate-pulse" />
        ))}
      </div>
    );
  }

  // Soft gate: Spotify not connected → show blurred teaser
  if (!spotifyConnected) {
    return <DiscoverTeaser />;
  }

  // Empty state: has signals but no matching events
  if (isEmpty) {
    return (
      <div className="w-full rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 flex flex-col items-center gap-2 text-center">
        <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center">
          <Music2 className="h-4 w-4 text-white/30" />
        </div>
        <p className="text-sm font-medium text-white/40">
          Keep using Scene to unlock personalized recommendations
        </p>
      </div>
    );
  }

  // Has picks
  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
      {picks.map((pick, i) => {
        if (pick.type === "edmtrain" && pick.edmtrainEvent) {
          return (
            <EdmtrainEventCard
              key={`discover-${i}`}
              event={pick.edmtrainEvent}
              onAddToSchedule={onAddToSchedule || (() => {})}
              reasonLabel={pick.reason.label}
            />
          );
        }

        // Platform-only show card
        return (
          <div
            key={`platform-${i}`}
            className="relative w-40 shrink-0 snap-start aspect-[3/4] rounded-2xl overflow-hidden group"
          >
            {pick.artistImageUrl ? (
              <img
                src={pick.artistImageUrl}
                alt={pick.artistName}
                className="absolute inset-0 w-full h-full object-cover"
                loading="lazy"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-white/[0.08] to-white/[0.02] flex items-center justify-center">
                <Music2 className="w-10 h-10 text-white/15" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

            <div className="absolute bottom-0 left-0 right-0 p-3 z-10">
              {pick.reason.label && (
                <span className="inline-block text-[9px] bg-white/10 backdrop-blur-sm rounded-full px-2 py-0.5 text-white/70 mb-1.5">
                  {pick.reason.label}
                </span>
              )}
              <h4 className="text-[13px] font-semibold text-white leading-tight line-clamp-2">
                {pick.artistName}
              </h4>
              <p className="text-[10px] text-white/50 truncate mt-1">
                {pick.venueName} · {pick.eventDate}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
