import { useMemo, useState } from "react";
import { Users } from "lucide-react";
import type { FriendShow } from "@/hooks/useFriendUpcomingShows";
import type { FollowerProfile } from "@/hooks/useFollowers";
import type { GroupedFriendShow } from "./upcoming/types";
import FriendChip from "./upcoming/FriendChip";

interface FriendsGoingSectionProps {
  friendShows: FriendShow[];
  onAddToSchedule: (show: FriendShow) => void;
  onShowTap?: (show: FriendShow) => void;
}

export default function FriendsGoingSection({ friendShows, onAddToSchedule, onShowTap }: FriendsGoingSectionProps) {
  const [addingKeys, setAddingKeys] = useState<Set<string>>(new Set());
  const [addedKeys, setAddedKeys] = useState<Set<string>>(new Set());

  const grouped = useMemo((): GroupedFriendShow[] => {
    const map = new Map<string, { friends: FollowerProfile[]; representative: FriendShow; artistImageUrl: string | null }>();
    for (const fs of friendShows) {
      const key = `${fs.artist_name}||${fs.show_date ?? "tbd"}`;
      if (!map.has(key)) {
        map.set(key, { friends: [], representative: fs, artistImageUrl: fs.artist_image_url });
      }
      const group = map.get(key)!;
      if (!group.friends.some((f) => f.id === fs.friend.id)) {
        group.friends.push(fs.friend);
      }
      if (!group.artistImageUrl && fs.artist_image_url) {
        group.artistImageUrl = fs.artist_image_url;
      }
    }

    return Array.from(map.entries())
      .sort(([, a], [, b]) => {
        if (a.friends.length !== b.friends.length) return b.friends.length - a.friends.length;
        return (a.representative.show_date ?? "").localeCompare(b.representative.show_date ?? "");
      })
      .map(([, g]) => ({
        ...g.representative,
        artist_image_url: g.artistImageUrl,
        allFriends: g.friends,
      }));
  }, [friendShows]);

  if (grouped.length === 0) {
    return (
      <div className="flex items-center gap-2 py-4 px-1">
        <Users className="h-4 w-4 text-muted-foreground/50" />
        <p className="text-xs text-muted-foreground/60">Your friends haven't shared plans yet.</p>
      </div>
    );
  }

  const handleToggle = async (show: GroupedFriendShow, e: React.MouseEvent) => {
    e.stopPropagation();
    const key = `${show.artist_name}||${show.show_date ?? "tbd"}`;
    if (addedKeys.has(key) || addingKeys.has(key)) return;
    setAddingKeys((s) => new Set(s).add(key));
    try {
      await onAddToSchedule(show as FriendShow);
      setAddedKeys((s) => new Set(s).add(key));
    } finally {
      setAddingKeys((s) => { const n = new Set(s); n.delete(key); return n; });
    }
  };

  const handleTap = (show: GroupedFriendShow) => {
    onShowTap?.(show as FriendShow);
  };

  return (
    <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
      {grouped.map((show) => {
        const key = `${show.artist_name}||${show.show_date ?? "tbd"}`;
        return (
          <FriendChip
            key={key}
            show={show}
            isAdded={addedKeys.has(key)}
            isToggling={addingKeys.has(key)}
            onTap={handleTap}
            onToggle={handleToggle}
          />
        );
      })}
    </div>
  );
}
