import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PopularItem, ShowTypeFilter } from "@/hooks/usePopularShows";

const MILES_TO_KM = 1.60934;
const RADIUS_MILES = 50;
const RADIUS_KM = RADIUS_MILES * MILES_TO_KM;

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function usePopularNearMe(enabled: boolean, showType: ShowTypeFilter = "set") {
  const [items, setItems] = useState<PopularItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setIsLoading(true);

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) { setIsLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("home_latitude, home_longitude")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      const homeLat = profile?.home_latitude ? Number(profile.home_latitude) : null;
      const homeLng = profile?.home_longitude ? Number(profile.home_longitude) : null;

      if (!homeLat || !homeLng) {
        setHasLocation(false);
        setIsLoading(false);
        return;
      }
      setHasLocation(true);

      const { data: venues } = await supabase
        .from("venues")
        .select("id, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (cancelled || !venues) { setIsLoading(false); return; }

      const nearbyVenueIds = new Set(
        venues
          .filter(v => haversineKm(homeLat, homeLng, Number(v.latitude), Number(v.longitude)) <= RADIUS_KM)
          .map(v => v.id)
      );

      if (nearbyVenueIds.size === 0) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      const { data: showRows } = await supabase
        .from("shows")
        .select("id, user_id, venue_name, show_date, venue_id, event_name, show_type")
        .eq("show_type", showType)
        .in("venue_id", [...nearbyVenueIds]);

      if (cancelled || !showRows || showRows.length === 0) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      const showIds = showRows.map(s => s.id);
      const showMap = new Map(showRows.map(s => [s.id, s]));

      const { data: artistRows } = await supabase
        .from("show_artists")
        .select("artist_name, artist_image_url, show_id, is_headliner")
        .eq("is_headliner", true)
        .not("artist_image_url", "is", null)
        .in("show_id", showIds);

      if (cancelled || !artistRows) { setIsLoading(false); return; }

      if (showType === "set") {
        // Artist-centric
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
        // Event-centric
        const artistsByShow = new Map<string, typeof artistRows>();
        for (const row of artistRows) {
          if (!artistsByShow.has(row.show_id)) artistsByShow.set(row.show_id, []);
          artistsByShow.get(row.show_id)!.push(row);
        }

        const eventAgg = new Map<string, {
          eventName: string; venueName: string; imageUrl: string | null;
          userIds: Set<string>; artists: Set<string>; latestDate: string | null;
        }>();

        for (const show of showRows) {
          const key = (show.event_name || show.venue_name).toLowerCase();
          if (!eventAgg.has(key)) {
            const sa = artistsByShow.get(show.id) ?? [];
            eventAgg.set(key, {
              eventName: show.event_name || show.venue_name,
              venueName: show.venue_name,
              imageUrl: sa.find(a => a.artist_image_url?.includes("scdn.co"))?.artist_image_url ?? sa[0]?.artist_image_url ?? null,
              userIds: new Set(), artists: new Set(), latestDate: show.show_date,
            });
          }
          const agg = eventAgg.get(key)!;
          agg.userIds.add(show.user_id);
          for (const a of (artistsByShow.get(show.id) ?? [])) agg.artists.add(a.artist_name);
          const betterImg = (artistsByShow.get(show.id) ?? []).find(a => a.artist_image_url?.includes("scdn.co"))?.artist_image_url;
          if (betterImg) agg.imageUrl = betterImg;
          if (!agg.latestDate || show.show_date > agg.latestDate) agg.latestDate = show.show_date;
        }

        const sorted: PopularItem[] = [...eventAgg.values()]
          .filter(e => e.imageUrl)
          .map(e => ({
            type: "event" as const,
            eventName: e.eventName, venueName: e.venueName, imageUrl: e.imageUrl,
            userCount: e.userIds.size, topArtists: [...e.artists].slice(0, 4),
            sampleShowDate: e.latestDate, showType: showType,
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

  return { items, totalUsers, isLoading, hasLocation };
}
