import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { FollowerProfile } from "./useFollowers";

export type ActivitySignal = "shared" | "multi-friend" | "high-rating" | "standard";

export interface FriendActivityItem {
  id: string;
  type: "upcoming" | "logged";
  signal: ActivitySignal;
  friendUserId: string;
  friend: FollowerProfile;
  artistName: string;
  artistImageUrl: string | null;
  venueName: string | null;
  venueLocation: string | null;
  showDate: string | null;
  showType?: string | null; // 'show' | 'showcase' | 'festival'
  rating?: number | null;
  photoUrl?: string | null;
  createdAt: string;
  // ELO rank position in the friend's collection (1 = #1 ranked)
  rankPosition?: number | null;
  // If multiple friends share this event
  sharedFriends?: FollowerProfile[];
}

/** Signal priority for sorting */
const SIGNAL_RANK: Record<ActivitySignal, number> = {
  shared: 0,
  "multi-friend": 1,
  "high-rating": 2,
  standard: 3,
};

export function useFriendActivity(followingIds: string[], myUpcomingArtistDates?: Array<{ artist: string; date: string }>) {
  const [items, setItems] = useState<FriendActivityItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (followingIds.length === 0) {
      setItems([]);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    async function load() {
      // Fetch profiles for friends first
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", followingIds);

      if (cancelled) return;

      const profileMap = new Map<string, FollowerProfile>();
      for (const p of (profiles ?? [])) {
        profileMap.set(p.id, p as FollowerProfile);
      }

      // Fetch friend upcoming shows (future only)
      const today = new Date().toISOString().split("T")[0];
      const [upcomingRes, loggedRes] = await Promise.all([
        supabase
          .from("upcoming_shows")
          .select("id, show_date, artist_name, artist_image_url, venue_name, venue_location, created_by_user_id, created_at")
          .in("created_by_user_id", followingIds)
          .gte("show_date", today)
          .order("created_at", { ascending: false })
          .limit(50),
        supabase
          .from("shows")
          .select("id, show_date, venue_name, venue_location, rating, photo_url, user_id, created_at, show_type")
          .in("user_id", followingIds)
          .order("created_at", { ascending: false })
          .limit(50),
      ]);

      if (cancelled) return;

      const rawItems: FriendActivityItem[] = [];

      // Build a lookup: artist+date → how many friends have it upcoming
      const upcomingKey = (artist: string, date: string | null) =>
        `${artist.toLowerCase()}__${date ?? ""}`;

      const upcomingCountMap = new Map<string, string[]>(); // key → userId[]
      for (const row of (upcomingRes.data ?? [])) {
        const k = upcomingKey(row.artist_name, row.show_date);
        if (!upcomingCountMap.has(k)) upcomingCountMap.set(k, []);
        upcomingCountMap.get(k)!.push(row.created_by_user_id);
      }

      // My upcoming shows as a Set for "shared" detection
      const myUpcomingSet = new Set(
        (myUpcomingArtistDates ?? []).map(({ artist, date }) => upcomingKey(artist, date))
      );

      // Process upcoming
      for (const row of (upcomingRes.data ?? [])) {
        const friend = profileMap.get(row.created_by_user_id);
        if (!friend) continue;

        const k = upcomingKey(row.artist_name, row.show_date);
        const friendsCount = upcomingCountMap.get(k)?.length ?? 1;
        const isShared = myUpcomingSet.has(k);

        let signal: ActivitySignal = "standard";
        if (isShared) signal = "shared";
        else if (friendsCount > 1) signal = "multi-friend";

        const otherFriends = (upcomingCountMap.get(k) ?? [])
          .filter(id => id !== row.created_by_user_id)
          .map(id => profileMap.get(id))
          .filter(Boolean) as FollowerProfile[];

        rawItems.push({
          id: `upcoming-${row.id}`,
          type: "upcoming",
          signal,
          friendUserId: row.created_by_user_id,
          friend,
          artistName: row.artist_name,
          artistImageUrl: row.artist_image_url,
          venueName: row.venue_name,
          venueLocation: row.venue_location,
          showDate: row.show_date,
          createdAt: row.created_at,
          sharedFriends: otherFriends.length > 0 ? otherFriends : undefined,
        });
      }

      // Process logged shows — fetch artists and rankings in parallel
      const loggedShowIds = (loggedRes.data ?? []).map(r => r.id);
      let artistMap = new Map<string, { name: string; image_url: string | null }>();
      // rankMap: show_id → rank position (1-indexed, sorted by ELO desc)
      const rankMap = new Map<string, number>();

      if (loggedShowIds.length > 0) {
        const [artistsRes, rankingsRes] = await Promise.all([
          supabase
            .from("show_artists")
            .select("show_id, artist_name, artist_image_url, is_headliner")
            .in("show_id", loggedShowIds),
          supabase
            .from("show_rankings")
            .select("show_id, user_id, elo_score")
            .in("user_id", followingIds),
        ]);

        if (!cancelled) {
          for (const a of (artistsRes.data ?? [])) {
            // Prefer headliner
            if (!artistMap.has(a.show_id) || a.is_headliner) {
              artistMap.set(a.show_id, { name: a.artist_name, image_url: a.artist_image_url });
            }
          }

          // Group rankings by user, sort by ELO desc, assign positions
          const ranksByUser = new Map<string, Array<{ show_id: string; elo_score: number }>>();
          for (const r of (rankingsRes.data ?? [])) {
            if (!ranksByUser.has(r.user_id)) ranksByUser.set(r.user_id, []);
            ranksByUser.get(r.user_id)!.push({ show_id: r.show_id, elo_score: r.elo_score });
          }
          for (const [, userRankings] of ranksByUser) {
            userRankings.sort((a, b) => b.elo_score - a.elo_score);
            userRankings.forEach((r, idx) => rankMap.set(r.show_id, idx + 1));
          }
        }
      }

      if (cancelled) return;

      for (const row of (loggedRes.data ?? [])) {
        const friend = profileMap.get(row.user_id);
        if (!friend) continue;

        const artist = artistMap.get(row.id);
        if (!artist) continue; // skip shows with no artists

        const rankPosition = rankMap.get(row.id) ?? null;
        // "high-rating" signal = ranked in top 3 by ELO
        const isTopRanked = rankPosition !== null && rankPosition <= 3;
        const signal: ActivitySignal = isTopRanked ? "high-rating" : "standard";

        rawItems.push({
          id: `logged-${row.id}`,
          type: "logged",
          signal,
          friendUserId: row.user_id,
          friend,
          artistName: artist.name,
          artistImageUrl: artist.image_url ?? null,
          venueName: row.venue_name,
          venueLocation: row.venue_location,
          showDate: row.show_date,
          showType: row.show_type ?? null,
          rating: row.rating,
          photoUrl: row.photo_url,
          createdAt: row.created_at,
          rankPosition,
        });
      }

      // Deduplicate upcoming: keep only one entry per artist+date (already handled by countMap — but strip dupes here)
      const seen = new Set<string>();
      const deduped = rawItems.filter(item => {
        if (item.type !== "upcoming") return true;
        const k = `${item.artistName.toLowerCase()}__${item.showDate}`;
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });

      // Sort: by signal first, then recency
      deduped.sort((a, b) => {
        const sd = SIGNAL_RANK[a.signal] - SIGNAL_RANK[b.signal];
        if (sd !== 0) return sd;
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });

      if (!cancelled) {
        setItems(deduped.slice(0, 30));
        setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [followingIds.join(","), JSON.stringify(myUpcomingArtistDates)]); // eslint-disable-line react-hooks/exhaustive-deps

  return { items, isLoading };
}
