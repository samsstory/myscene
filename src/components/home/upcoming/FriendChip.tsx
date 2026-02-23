import { format, parseISO } from "date-fns";
import { Plus, Check, Loader2 } from "lucide-react";
import type { GroupedFriendShow } from "./types";

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

  const venueLabel = show.venue_name
    ? (show.venue_name.length > 16 ? show.venue_name.slice(0, 14) + "…" : show.venue_name)
    : show.venue_location
    ? (show.venue_location.length > 16 ? show.venue_location.slice(0, 14) + "…" : show.venue_location)
    : null;

  const allFriends = show.allFriends;
  const visibleAvatars = allFriends.slice(0, 3);
  const extraCount = allFriends.length - visibleAvatars.length;


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
        {/* Friend avatars directly above artist name */}
        <div className="flex items-center mb-1">
          {visibleAvatars.map((f, i) =>
            f.avatar_url ? (
              <img
                key={f.id}
                src={f.avatar_url}
                alt={f.username ?? f.full_name ?? "Friend"}
                className="w-6 h-6 rounded-full border border-black/60 object-cover"
                style={{ marginLeft: i === 0 ? 0 : -8, zIndex: visibleAvatars.length - i }}
              />
            ) : (
              <div
                key={f.id}
                className="w-6 h-6 rounded-full border border-black/60 bg-primary/70 flex items-center justify-center"
                style={{ marginLeft: i === 0 ? 0 : -8, zIndex: visibleAvatars.length - i }}
              >
                <span className="text-[8px] font-bold text-primary-foreground leading-none">
                  {(f.username ?? f.full_name ?? "?")[0].toUpperCase()}
                </span>
              </div>
            )
          )}
          {extraCount > 0 && (
            <div
              className="w-6 h-6 rounded-full border border-black/60 bg-white/20 flex items-center justify-center"
              style={{ marginLeft: -8, zIndex: 0 }}
            >
              <span className="text-[7px] font-bold text-white/90 leading-none">+{extraCount}</span>
            </div>
          )}
        </div>
        <p
          className="text-xs font-bold text-white leading-tight line-clamp-2"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {show.artist_name}
        </p>
        {venueLabel && (
          <p
            className="text-[10px] text-white/70 mt-0.5"
            style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
          >
            {venueLabel}
          </p>
        )}
        <p
          className="text-[10px] text-white/50 mt-0.5"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {dateLabel}
        </p>
      </div>
    </button>
  );
}
