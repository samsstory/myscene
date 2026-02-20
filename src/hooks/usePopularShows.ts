import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface PopularArtist {
  artistName: string;
  artistImageUrl: string | null;
  userCount: number;
  /** A representative show to quick-add from (most recent) */
  sampleVenueName: string | null;
  sampleShowDate: string | null;
}

export function usePopularShows(enabled: boolean) {
  const [artists, setArtists] = useState<PopularArtist[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setIsLoading(true);

    async function load() {
      // Get popular headliner artists with image, grouped by artist name
      const { data: artistRows } = await supabase
        .from("show_artists")
        .select("artist_name, artist_image_url, show_id, is_headliner")
        .eq("is_headliner", true)
        .not("artist_image_url", "is", null);

      if (cancelled || !artistRows) return;

      // Need show details for user_id and venue
      const showIds = [...new Set(artistRows.map(a => a.show_id))];
      if (showIds.length === 0) {
        setIsLoading(false);
        return;
      }

      const { data: showRows } = await supabase
        .from("shows")
        .select("id, user_id, venue_name, show_date")
        .in("id", showIds);

      if (cancelled || !showRows) return;

      const showMap = new Map(showRows.map(s => [s.id, s]));

      // Group by artist_name → unique users + best image + sample venue
      const artistAgg = new Map<string, {
        imageUrl: string | null;
        userIds: Set<string>;
        latestShow: { venueName: string | null; showDate: string | null; date: number };
      }>();

      for (const row of artistRows) {
        const show = showMap.get(row.show_id);
        if (!show) continue;

        const key = row.artist_name.toLowerCase();
        if (!artistAgg.has(key)) {
          artistAgg.set(key, {
            imageUrl: row.artist_image_url,
            userIds: new Set(),
            latestShow: {
              venueName: show.venue_name,
              showDate: show.show_date,
              date: new Date(show.show_date).getTime(),
            },
          });
        }
        const agg = artistAgg.get(key)!;
        agg.userIds.add(show.user_id);

        // Keep the image that looks like a Spotify URL (prefer those)
        if (row.artist_image_url?.includes("scdn.co")) {
          agg.imageUrl = row.artist_image_url;
        }

        // Keep most recent show as sample
        const d = new Date(show.show_date).getTime();
        if (d > agg.latestShow.date) {
          agg.latestShow = { venueName: show.venue_name, showDate: show.show_date, date: d };
        }
      }

      // Sort by user count desc, then by name
      const sorted = [...artistAgg.entries()]
        .map(([key, agg]) => ({
          artistName: artistRows.find(a => a.artist_name.toLowerCase() === key)?.artist_name ?? key,
          artistImageUrl: agg.imageUrl,
          userCount: agg.userIds.size,
          sampleVenueName: agg.latestShow.venueName,
          sampleShowDate: agg.latestShow.showDate,
        }))
        .filter(a => a.artistImageUrl)
        .sort((a, b) => b.userCount - a.userCount || a.artistName.localeCompare(b.artistName))
        .slice(0, 12);

      // Total unique users across all shows
      const allUsers = new Set(showRows.map(s => s.user_id));

      if (!cancelled) {
        setArtists(sorted);
        setTotalUsers(allUsers.size);
        setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [enabled]);

  return { artists, totalUsers, isLoading };
}
