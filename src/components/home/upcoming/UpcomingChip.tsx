import { format, parseISO } from "date-fns";
import { CheckCircle2, CircleHelp, X } from "lucide-react";
import type { UpcomingShow } from "@/hooks/usePlanUpcomingShow";
import type { FriendShow } from "@/hooks/useFriendUpcomingShows";
import type { AvatarPerson } from "./AvatarStack";
import ShowCardContent from "./ShowCardContent";

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

  const badge = RSVP_BADGE[show.rsvp_status ?? "going"];
  const BadgeIcon = badge.Icon;

  const goingWithPeople: AvatarPerson[] = goingWith.map((fs) => ({
    id: fs.friend.id,
    avatar_url: fs.friend.avatar_url,
    username: fs.friend.username,
    full_name: fs.friend.full_name,
  }));

  return (
    <button
      className="relative flex-shrink-0 w-32 aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer select-none text-left"
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
        <ShowCardContent
          avatars={goingWithPeople}
          eventName={show.event_name}
          artistName={show.artist_name}
          venueName={show.venue_name ?? show.venue_location}
          dateLabel={dateLabel}
        />
      </div>
    </button>
  );
}
