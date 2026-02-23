import { format, parseISO } from "date-fns";
import { Plus, Check, Loader2 } from "lucide-react";
import type { GroupedFriendShow } from "./types";
import type { AvatarPerson } from "./AvatarStack";
import ShowCardContent from "./ShowCardContent";

interface FriendChipProps {
  show: GroupedFriendShow;
  isAdded: boolean;
  isToggling: boolean;
  onTap: (show: GroupedFriendShow) => void;
  onToggle: (show: GroupedFriendShow, e: React.MouseEvent) => void;
}

export default function FriendChip({ show, isAdded, isToggling, onTap, onToggle }: FriendChipProps) {
  const dateLabel = show.show_date
    ? (() => { try { return format(parseISO(show.show_date), "MMM d"); } catch { return ""; } })()
    : "Date TBD";

  const allFriends = show.allFriends;
  const avatars: AvatarPerson[] = allFriends.map((f) => ({
    id: f.id,
    avatar_url: f.avatar_url,
    username: f.username,
    full_name: f.full_name,
  }));

  return (
    <button
      className="relative flex-shrink-0 w-32 aspect-[3/4] rounded-2xl overflow-hidden cursor-pointer select-none text-left"
      onClick={() => onTap(show)}
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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/15 to-transparent" />
      )}

      {/* Quick add/remove toggle — top-right */}
      <button
        onClick={(e) => onToggle(show, e)}
        disabled={isToggling}
        className={`absolute top-2 right-2 w-6 h-6 rounded-full border backdrop-blur-sm flex items-center justify-center transition-all ${
          isAdded
            ? "bg-emerald-500/30 border-emerald-500/50"
            : "bg-black/30 border-white/20 hover:bg-white/20"
        }`}
      >
        {isToggling ? (
          <Loader2 className="h-3 w-3 text-white/70 animate-spin" />
        ) : isAdded ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : (
          <Plus className="h-3 w-3 text-white/60" />
        )}
      </button>

      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <ShowCardContent
          avatars={avatars}
          eventName={show.event_name}
          artistName={show.artist_name}
          venueName={show.venue_name ?? show.venue_location}
          dateLabel={dateLabel}
        />
      </div>
    </button>
  );
}
