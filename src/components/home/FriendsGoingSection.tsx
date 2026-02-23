import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Check, Loader2, Users } from "lucide-react";
import type { FriendShow } from "@/hooks/useFriendUpcomingShows";
import type { FollowerProfile } from "@/hooks/useFollowers";

interface GroupedEvent {
  key: string;
  artistName: string;
  showDate: string | null;
  venueName: string | null;
  venueLocation: string | null;
  artistImageUrl: string | null;
  friends: FollowerProfile[];
  /** First FriendShow in the group – used as callback payload */
  representative: FriendShow;
}

interface FriendsGoingSectionProps {
  friendShows: FriendShow[];
  onAddToSchedule: (show: FriendShow) => void;
}

export default function FriendsGoingSection({ friendShows, onAddToSchedule }: FriendsGoingSectionProps) {
  const [addingKeys, setAddingKeys] = useState<Set<string>>(new Set());
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());

  const grouped = useMemo(() => {
    const map = new Map<string, GroupedEvent>();
    for (const fs of friendShows) {
      const key = `${fs.artist_name}||${fs.show_date ?? "tbd"}`;
      if (!map.has(key)) {
        map.set(key, {
          key,
          artistName: fs.artist_name,
          showDate: fs.show_date,
          venueName: fs.venue_name,
          venueLocation: fs.venue_location,
          artistImageUrl: fs.artist_image_url,
          friends: [],
          representative: fs,
        });
      }
      const group = map.get(key)!;
      if (!group.friends.some((f) => f.id === fs.friend.id)) {
        group.friends.push(fs.friend);
      }
      // Prefer an image if one exists
      if (!group.artistImageUrl && fs.artist_image_url) {
        group.artistImageUrl = fs.artist_image_url;
      }
    }

    const arr = Array.from(map.values());
    // Multi-friend events first, then by date
    arr.sort((a, b) => {
      if (a.friends.length !== b.friends.length) return b.friends.length - a.friends.length;
      return (a.showDate ?? "").localeCompare(b.showDate ?? "");
    });
    return arr;
  }, [friendShows]);

  if (grouped.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 px-1">
        <Users className="h-4 w-4 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground/60">Your friends haven't shared plans yet.</p>
      </div>
    );
  }

  const handleToggle = async (group: GroupedEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    if (addedKeys.has(group.key) || addingKeys.has(group.key)) return;
    setAddingKeys((s) => new Set(s).add(group.key));
    try {
      await onAddToSchedule(group.representative);
      setAddedKeys((s) => new Set(s).add(group.key));
    } finally {
      setAddingKeys((s) => { const n = new Set(s); n.delete(group.key); return n; });
    }
  };

  return (
    <div className="grid grid-cols-2 gap-3">
      {grouped.slice(0, 6).map((group) => {
        const isAdded = addedKeys.has(group.key);
        const isAdding = addingKeys.has(group.key);

        const dateLabel = group.showDate
          ? (() => { try { return format(parseISO(group.showDate), "MMM d"); } catch { return ""; } })()
          : "Date TBD";

        const venueLabel = group.venueName
          ? (group.venueName.length > 18 ? group.venueName.slice(0, 16) + "…" : group.venueName)
          : group.venueLocation
          ? (group.venueLocation.length > 18 ? group.venueLocation.slice(0, 16) + "…" : group.venueLocation)
          : null;

        const visibleAvatars = group.friends.slice(0, 3);
        const extraCount = group.friends.length - visibleAvatars.length;

        const firstName = group.friends[0]?.full_name?.split(" ")[0] ?? group.friends[0]?.username ?? "Friend";
        const goingLabel = group.friends.length > 1
          ? `${firstName} + ${group.friends.length - 1} more`
          : `Join ${firstName}?`;

        return (
          <div
            key={group.key}
            className="relative rounded-2xl overflow-hidden h-40 cursor-pointer select-none"
            onClick={(e) => handleToggle(group, e)}
          >
            {/* Background */}
            {group.artistImageUrl ? (
              <>
                <img
                  src={group.artistImageUrl}
                  alt={group.artistName}
                  className="absolute inset-0 w-full h-full object-cover scale-110"
                  style={{ filter: "blur(2px)" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
              </>
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/15 to-transparent" />
            )}

            {/* Avatar stack – top-left */}
            <div className="absolute top-2 left-2 flex items-center">
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

            {/* Plan to go toggle – top-right */}
            <button
              onClick={(e) => handleToggle(group, e)}
              disabled={isAdding || isAdded}
              className={`absolute top-2 right-2 w-7 h-7 rounded-full border backdrop-blur-sm flex items-center justify-center transition-all ${
                isAdded
                  ? "bg-emerald-500/30 border-emerald-500/50"
                  : "bg-black/30 border-white/20 hover:bg-white/20"
              }`}
            >
              {isAdding ? (
                <Loader2 className="h-3.5 w-3.5 text-white/70 animate-spin" />
              ) : isAdded ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Plus className="h-3.5 w-3.5 text-white/60" />
              )}
            </button>

            {/* Text – bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-2.5">
              <p
                className="text-sm font-bold text-white leading-tight line-clamp-1"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
              >
                {group.artistName}
              </p>
              <p
                className="text-[10px] text-white/80 mt-0.5 leading-tight line-clamp-1"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
              >
                {goingLabel}
              </p>
              <p
                className="text-[10px] text-white/55 mt-0.5"
                style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
              >
                {dateLabel}
                {venueLabel && ` · ${venueLabel}`}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
