import { format, parseISO } from "date-fns";
import { CheckCircle2, CircleHelp, X } from "lucide-react";
import type { UpcomingShow } from "@/hooks/usePlanUpcomingShow";
import type { FriendShow } from "@/hooks/useFriendUpcomingShows";
import AvatarStack from "./AvatarStack";
import type { AvatarPerson } from "./AvatarStack";

const RSVP_BADGE = {
  going:     { Icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" },
  maybe:     { Icon: CircleHelp,  color: "text-amber-400",   bg: "bg-amber-500/20 border-amber-500/30"   },
  not_going: { Icon: X,            color: "text-red-400",     bg: "bg-red-500/20 border-red-500/30"        },
} as const;

interface UpcomingChipProps {
  show: UpcomingShow;
  goingWith: FriendShow[];
  onTap: (show: UpcomingShow, goingWith: FriendShow[]) => void;
}

export default function UpcomingChip({ show, goingWith, onTap }: UpcomingChipProps) {
  const dateLabel = show.show_date
    ? (() => { try { return format(parseISO(show.show_date), "MMM d"); } catch { return ""; } })()
    : "Date TBD";

  const venueLabel = show.venue_name
    ? (show.venue_name.length > 16 ? show.venue_name.slice(0, 14) + "…" : show.venue_name)
    : show.venue_location
    ? (show.venue_location.length > 16 ? show.venue_location.slice(0, 14) + "…" : show.venue_location)
    : null;

  const badge = RSVP_BADGE[show.rsvp_status ?? "going"];
  const BadgeIcon = badge.Icon;

  // Normalise goingWith friends into AvatarPerson[]
  const goingWithPeople: AvatarPerson[] = goingWith.map((fs) => ({
    id: fs.friend.id,
    avatar_url: fs.friend.avatar_url,
    username: fs.friend.username,
    full_name: fs.friend.full_name,
  }));

  return (
    <button
      className="relative flex-shrink-0 w-32 h-36 rounded-2xl overflow-hidden cursor-pointer select-none text-left"
      onClick={() => onTap(show, goingWith)}
    >
      {show.artist_image_url ? (
        <>
          <img
            src={show.artist_image_url}
            alt={show.artist_name}
            className="absolute inset-0 w-full h-full object-cover scale-110"
            style={{ filter: "blur(2px)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-transparent" />
      )}

      <div className={`absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full border backdrop-blur-sm ${badge.bg}`}>
        <BadgeIcon className={`h-3 w-3 ${badge.color}`} />
      </div>

      {show.raw_input === "festival" && (
        <span className="absolute top-2 left-2 text-[7px] uppercase tracking-widest font-bold text-primary bg-primary/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-primary/30 z-10">
          Festival
        </span>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        {goingWithPeople.length > 0 && (
          <AvatarStack people={goingWithPeople} size="sm" className="mb-1" />
        )}
        <p
          className="text-xs font-bold text-white leading-tight line-clamp-2"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {show.artist_name}
        </p>
        <p
          className="text-[10px] text-white/70 mt-0.5"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {dateLabel}
          {venueLabel && ` · ${venueLabel}`}
        </p>
      </div>
    </button>
  );
}
