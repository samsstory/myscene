import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FollowerProfile } from "./useFollowers";

/**
 * Returns a Map<isoDateString, FollowerProfile[]> so the calendar can do
 * a simple `friendsOnDate.get("2026-03-15") ?? []` lookup.
 */
export function useFriendUpcomingShows(followingIds: string[]) {
  const [friendsByDate, setFriendsByDate] = useState<Map<string, FollowerProfile[]>>(new Map());
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (followingIds.length === 0) {
      setFriendsByDate(new Map());
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function load() {
      // Fetch upcoming shows for all followed users, joining profiles for avatar data
      const { data, error } = await supabase
        .from("upcoming_shows")
        .select(`
          show_date,
          created_by_user_id,
          profiles!upcoming_shows_created_by_user_id_fkey(id, username, full_name, avatar_url)
        `)
        .in("created_by_user_id", followingIds)
        .not("show_date", "is", null);

      if (cancelled) return;

      if (error) {
        console.error("useFriendUpcomingShows error:", error);
        setIsLoading(false);
        return;
      }

      const map = new Map<string, FollowerProfile[]>();

      for (const row of (data ?? [])) {
        const isoDate = row.show_date as string;
        const profile = (row as any).profiles as FollowerProfile | null;
        if (!isoDate || !profile) continue;

        if (!map.has(isoDate)) map.set(isoDate, []);
        const existing = map.get(isoDate)!;
        // Deduplicate by profile id
        if (!existing.some(p => p.id === profile.id)) {
          existing.push(profile);
        }
      }

      setFriendsByDate(map);
      setIsLoading(false);
    }

    load();
    return () => { cancelled = true; };
  }, [followingIds.join(",")]); // eslint-disable-line react-hooks/exhaustive-deps

  return { friendsByDate, isLoading };
}
