import { useState, useCallback, useMemo } from "react";
import type { FriendShow } from "@/hooks/useFriendUpcomingShows";
import type { UpcomingShow } from "@/hooks/usePlanUpcomingShow";

interface UseFriendShowToggleOptions {
  deleteUpcomingShow: (id: string) => Promise<void>;
  saveUpcomingShow: (params: {
    artist_name: string;
    artist_image_url?: string;
    venue_name?: string;
    venue_location?: string;
    show_date?: string;
  }) => Promise<any>;
  friendShows: FriendShow[];
  upcomingShows: UpcomingShow[];
}

export function useFriendShowToggle({
  deleteUpcomingShow,
  saveUpcomingShow,
  friendShows,
  upcomingShows,
}: UseFriendShowToggleOptions) {
  const [addedFriendShowIds, setAddedFriendShowIds] = useState<Map<string, string>>(new Map());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const handleToggleFriendShow = useCallback(async (show: FriendShow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (togglingIds.has(show.id)) return;

    setTogglingIds(prev => new Set(prev).add(show.id));

    const alreadyAddedId = addedFriendShowIds.get(show.id);
    if (alreadyAddedId) {
      await deleteUpcomingShow(alreadyAddedId);
      setAddedFriendShowIds(prev => {
        const next = new Map(prev);
        next.delete(show.id);
        return next;
      });
    } else {
      const imageUrl = show.artist_image_url;
      const isUserUpload = imageUrl && imageUrl.includes("supabase") && imageUrl.includes("show-photos");
      const success = await saveUpcomingShow({
        artist_name: show.artist_name,
        artist_image_url: isUserUpload ? undefined : (imageUrl ?? undefined),
        venue_name: show.venue_name ?? undefined,
        venue_location: show.venue_location ?? undefined,
        show_date: show.show_date ?? undefined,
      });
      if (success) {
        setAddedFriendShowIds(prev => {
          const next = new Map(prev);
          next.set(show.id, "__pending__");
          return next;
        });
      }
    }

    setTogglingIds(prev => {
      const next = new Set(prev);
      next.delete(show.id);
      return next;
    });
  }, [togglingIds, addedFriendShowIds, deleteUpcomingShow, saveUpcomingShow]);

  // Resolve pending additions by matching artist_name + show_date
  const resolvedAddedIds = useMemo(() => {
    const resolved = new Map(addedFriendShowIds);
    for (const [friendShowId, ownId] of resolved.entries()) {
      if (ownId === "__pending__") {
        const fs = friendShows.find(s => s.id === friendShowId);
        if (fs) {
          const match = upcomingShows.find(
            s => s.artist_name === fs.artist_name && s.show_date === fs.show_date
          );
          if (match) resolved.set(friendShowId, match.id);
        }
      }
    }
    return resolved;
  }, [addedFriendShowIds, friendShows, upcomingShows]);

  return {
    handleToggleFriendShow,
    resolvedAddedIds,
    togglingIds,
  };
}
