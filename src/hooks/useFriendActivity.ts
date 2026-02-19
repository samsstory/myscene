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
  rating?: number | null;
  photoUrl?: string | null;
  createdAt: string;
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
          .select("id, show_date, venue_name, venue_location, rating, photo_url, user_id, created_at")
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

      // Process logged shows — fetch artists separately
      const loggedShowIds = (loggedRes.data ?? []).map(r => r.id);
      let artistMap = new Map<string, { name: string; imageUrl: string | null }>();
      if (loggedShowIds.length > 0) {
        const { data: artistsData } = await supabase
          .from("show_artists")
          .select("show_id, artist_name, artist_image_url, is_headliner")
          .in("show_id", loggedShowIds);

        if (!cancelled) {
          for (const a of (artistsData ?? [])) {
            // Prefer headliner
            if (!artistMap.has(a.show_id) || a.is_headliner) {
              artistMap.set(a.show_id, { name: a.artist_name, image_url: a.artist_image_url } as any);
            }
          }
        }
      }

      if (cancelled) return;

      for (const row of (loggedRes.data ?? [])) {
        const friend = profileMap.get(row.user_id);
        if (!friend) continue;

        const artist = artistMap.get(row.id);
        if (!artist) continue; // skip shows with no artists

        const isHighRating = (row.rating ?? 0) >= 4;
        const signal: ActivitySignal = isHighRating ? "high-rating" : "standard";

        rawItems.push({
          id: `logged-${row.id}`,
          type: "logged",
          signal,
          friendUserId: row.user_id,
          friend,
          artistName: (artist as any).name,
          artistImageUrl: (artist as any).image_url ?? null,
          venueName: row.venue_name,
          venueLocation: row.venue_location,
          showDate: row.show_date,
          rating: row.rating,
          photoUrl: row.photo_url,
          createdAt: row.created_at,
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
