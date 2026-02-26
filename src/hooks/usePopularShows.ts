import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export type ShowTypeFilter = "set" | "show" | "festival";

export interface PopularArtist {
  type: "artist";
  artistName: string;
  artistImageUrl: string | null;
  userCount: number;
  sampleVenueName: string | null;
  sampleShowDate: string | null;
  showType: ShowTypeFilter;
  winRate: number | null;
  matchupCount: number;
  userCountRanked: number;
}

export interface PopularEvent {
  type: "event";
  eventName: string;
  venueName: string;
  imageUrl: string | null;
  userCount: number;
  topArtists: string[];
  sampleShowDate: string | null;
  showType: ShowTypeFilter;
  winRate: number | null;
  matchupCount: number;
  userCountRanked: number;
}

export type PopularItem = PopularArtist | PopularEvent;

export function usePopularShows(enabled: boolean, showType: ShowTypeFilter = "set") {
  const [items, setItems] = useState<PopularItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setIsLoading(true);

    async function load() {
      // Get shows of this type
      const { data: showRows } = await supabase
        .from("shows")
        .select("id, user_id, venue_name, show_date, event_name, show_type")
        .eq("show_type", showType);

      if (cancelled || !showRows) { setIsLoading(false); return; }
      if (showRows.length === 0) { setItems([]); setIsLoading(false); return; }

      const showIds = showRows.map(s => s.id);
      const showMap = new Map(showRows.map(s => [s.id, s]));

      // Get headliner artists with images
      const { data: artistRows } = await supabase
        .from("show_artists")
        .select("artist_name, artist_image_url, show_id, is_headliner")
        .eq("is_headliner", true)
        .not("artist_image_url", "is", null)
        .in("show_id", showIds);

      if (cancelled || !artistRows) { setIsLoading(false); return; }

      if (showType === "set") {
        // Artist-centric aggregation (original logic)
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
              latestShow: { venueName: show.venue_name, showDate: show.show_date, date: new Date(show.show_date).getTime() },
            });
          }
          const agg = artistAgg.get(key)!;
          agg.userIds.add(show.user_id);
          if (row.artist_image_url?.includes("scdn.co")) agg.imageUrl = row.artist_image_url;
          const d = new Date(show.show_date).getTime();
          if (d > agg.latestShow.date) {
            agg.latestShow = { venueName: show.venue_name, showDate: show.show_date, date: d };
          }
        }

        const sorted: PopularItem[] = [...artistAgg.entries()]
          .map(([key, agg]) => ({
            type: "artist" as const,
            artistName: artistRows.find(a => a.artist_name.toLowerCase() === key)?.artist_name ?? key,
            artistImageUrl: agg.imageUrl,
            userCount: agg.userIds.size,
            sampleVenueName: agg.latestShow.venueName,
            sampleShowDate: agg.latestShow.showDate,
            showType: showType,
            winRate: null,
            matchupCount: 0,
            userCountRanked: 0,
          }))
          .filter(a => a.artistImageUrl)
          .sort((a, b) => b.userCount - a.userCount || a.artistName.localeCompare(b.artistName))
          .slice(0, 12);

        if (!cancelled) {
          setItems(sorted);
          setTotalUsers(new Set(showRows.map(s => s.user_id)).size);
          setIsLoading(false);
        }
      } else {
        // Event-centric aggregation for shows & festivals
        // Group by venue_name (or event_name if set)
        const eventAgg = new Map<string, {
          eventName: string;
          venueName: string;
          imageUrl: string | null;
          userIds: Set<string>;
          artists: Set<string>;
          latestDate: string | null;
        }>();

        // Build artist lookup per show
        const artistsByShow = new Map<string, typeof artistRows>();
        for (const row of artistRows) {
          if (!artistsByShow.has(row.show_id)) artistsByShow.set(row.show_id, []);
          artistsByShow.get(row.show_id)!.push(row);
        }

        for (const show of showRows) {
          const key = (show.event_name || show.venue_name).toLowerCase();
          if (!eventAgg.has(key)) {
            const showArtists = artistsByShow.get(show.id) ?? [];
            const bestImage = showArtists.find(a => a.artist_image_url?.includes("scdn.co"))?.artist_image_url
              ?? showArtists[0]?.artist_image_url ?? null;
            eventAgg.set(key, {
              eventName: show.event_name || show.venue_name,
              venueName: show.venue_name,
              imageUrl: bestImage,
              userIds: new Set(),
              artists: new Set(),
              latestDate: show.show_date,
            });
          }
          const agg = eventAgg.get(key)!;
          agg.userIds.add(show.user_id);

          // Collect artists
          const showArtists = artistsByShow.get(show.id) ?? [];
          for (const a of showArtists) agg.artists.add(a.artist_name);

          // Better image
          const betterImg = showArtists.find(a => a.artist_image_url?.includes("scdn.co"))?.artist_image_url;
          if (betterImg) agg.imageUrl = betterImg;

          // Latest date
          if (!agg.latestDate || show.show_date > agg.latestDate) agg.latestDate = show.show_date;
        }

        const sorted: PopularItem[] = [...eventAgg.values()]
          .filter(e => e.imageUrl)
          .map(e => ({
            type: "event" as const,
            eventName: e.eventName,
            venueName: e.venueName,
            imageUrl: e.imageUrl,
            userCount: e.userIds.size,
            topArtists: [...e.artists].slice(0, 4),
            sampleShowDate: e.latestDate,
            showType: showType,
            winRate: null,
            matchupCount: 0,
            userCountRanked: 0,
          }))
          .sort((a, b) => b.userCount - a.userCount || a.eventName.localeCompare(b.eventName))
          .slice(0, 12);

        if (!cancelled) {
          setItems(sorted);
          setTotalUsers(new Set(showRows.map(s => s.user_id)).size);
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [enabled, showType]);

  return { items, totalUsers, isLoading };
}
