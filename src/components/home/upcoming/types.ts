import type { FriendShow } from "@/hooks/useFriendUpcomingShows";
import type { FollowerProfile } from "@/hooks/useFollowers";

/** A FriendShow augmented with all friends who share the same event */
export interface GroupedFriendShow extends FriendShow {
  allFriends: FollowerProfile[];
}
