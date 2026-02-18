import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FollowerProfile } from "./useFollowers";

export interface FriendShow {
  id: string;
  show_date: string | null;
  artist_name: string;
  artist_image_url: string | null;
  venue_name: string | null;
  venue_location: string | null;
  friend: FollowerProfile;
}

/**
 * Returns:
 * - friendsByDate: Map<isoDateString, FollowerProfile[]> for calendar ghost tiles
 * - friendShows: FriendShow[] flat array sorted by show_date ascending for the strip
 */
export function useFriendUpcomingShows(followingIds: string[]) {
  const [friendsByDate, setFriendsByDate] = useState<Map<string, FollowerProfile[]>>(new Map());
  const [friendShows, setFriendShows] = useState<FriendShow[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (followingIds.length === 0) {
      setFriendsByDate(new Map());
      setFriendShows([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function load() {
      console.log("[FriendShows] Fetching for followingIds:", followingIds);

      // Fetch upcoming shows for all followed users
      const { data, error } = await supabase
        .from("upcoming_shows")
        .select(`
          id,
          show_date,
          artist_name,
          artist_image_url,
          venue_name,
          venue_location,
          created_by_user_id
        `)
        .in("created_by_user_id", followingIds)
        .not("show_date", "is", null)
        .order("show_date", { ascending: true });

      if (cancelled) return;

      console.log("[FriendShows] Query result:", { data, error });

      if (error) {
        console.error("useFriendUpcomingShows error:", error);
        setIsLoading(false);
        return;
      }

      // Fetch profiles for all unique user IDs in the results
      const uniqueUserIds = [...new Set((data ?? []).map(r => r.created_by_user_id))];
      let profileMap = new Map<string, FollowerProfile>();

      if (uniqueUserIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("id, username, full_name, avatar_url")
          .in("id", uniqueUserIds);

        if (!cancelled) {
          for (const p of (profiles ?? [])) {
            profileMap.set(p.id, p as FollowerProfile);
          }
        }
      }

      if (cancelled) return;

      const map = new Map<string, FollowerProfile[]>();
      const shows: FriendShow[] = [];

      for (const row of (data ?? [])) {
        const isoDate = row.show_date as string;
        const profile = profileMap.get(row.created_by_user_id);
        if (!isoDate || !profile) continue;

        // Build friendsByDate map
        if (!map.has(isoDate)) map.set(isoDate, []);
        const existing = map.get(isoDate)!;
        if (!existing.some(p => p.id === profile.id)) {
          existing.push(profile);
        }

        // Build flat friendShows array (one entry per show row)
        shows.push({
          id: row.id,
          show_date: row.show_date,
          artist_name: row.artist_name,
          artist_image_url: row.artist_image_url,
          venue_name: row.venue_name,
          venue_location: row.venue_location,
          friend: profile,
        });
      }

      setFriendsByDate(map);
      setFriendShows(shows);
      setIsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [followingIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { friendsByDate, friendShows, isLoading };
}
