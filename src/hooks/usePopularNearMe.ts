import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PopularItem, ShowTypeFilter } from "@/hooks/usePopularShows";

const MILES_TO_KM = 1.60934;
const RADIUS_MILES = 50;
const RADIUS_KM = RADIUS_MILES * MILES_TO_KM;

export type GeoScope = "city" | "country" | "world";

function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function usePopularNearMe(
  enabled: boolean,
  showType: ShowTypeFilter = "set",
  geoScope: GeoScope = "city",
  overrideLat?: number | null,
  overrideLng?: number | null,
  overrideCity?: string | null,
) {
  const [items, setItems] = useState<PopularItem[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);
  const [cityName, setCityName] = useState<string | null>(null);
  const [countryName, setCountryName] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setIsLoading(true);

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (cancelled || !user) { setIsLoading(false); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("home_latitude, home_longitude, home_city")
        .eq("id", user.id)
        .single();

      if (cancelled) return;

      // Use override coords/city if provided, otherwise fall back to profile
      const homeLat = overrideLat ?? (profile?.home_latitude ? Number(profile.home_latitude) : null);
      const homeLng = overrideLng ?? (profile?.home_longitude ? Number(profile.home_longitude) : null);
      const resolvedCity = overrideCity ?? profile?.home_city ?? null;
      if (resolvedCity) setCityName(resolvedCity);

      if (geoScope !== "world" && (!homeLat || !homeLng)) {
        setHasLocation(false);
        setIsLoading(false);
        return;
      }
      setHasLocation(true);

      let nearbyVenueIds: Set<string> | null = null;
      let resolvedCountry: string | null = null;

      if (geoScope !== "world" && homeLat && homeLng) {
        const { data: venues } = await supabase
          .from("venues")
          .select("id, latitude, longitude, country")
          .not("latitude", "is", null)
          .not("longitude", "is", null);

        if (cancelled || !venues) { setIsLoading(false); return; }

        if (geoScope === "city") {
          nearbyVenueIds = new Set(
            venues
              .filter(v => haversineKm(homeLat, homeLng, Number(v.latitude), Number(v.longitude)) <= RADIUS_KM)
              .map(v => v.id)
          );
        } else if (geoScope === "country") {
          let userCountry: string | null = null;
          let minDist = Infinity;
          for (const v of venues) {
            if (!v.country) continue;
            const d = haversineKm(homeLat, homeLng, Number(v.latitude), Number(v.longitude));
            if (d < minDist) { minDist = d; userCountry = v.country; }
          }
          resolvedCountry = userCountry;
          if (!cancelled) setCountryName(userCountry);
          if (userCountry) {
            nearbyVenueIds = new Set(
              venues.filter(v => v.country === userCountry || !v.country).map(v => v.id)
            );
          } else {
            nearbyVenueIds = null;
          }
        }

        if (nearbyVenueIds && nearbyVenueIds.size === 0) {
          setItems([]);
          setIsLoading(false);
          return;
        }
      }

      let query = supabase
        .from("shows")
        .select("id, user_id, venue_name, show_date, venue_id, event_name, show_type, parent_show_id")
        .eq("show_type", showType)
        .is("parent_show_id", null);

      if (nearbyVenueIds && nearbyVenueIds.size <= 200) {
        query = query.in("venue_id", [...nearbyVenueIds]);
      }

      const { data: rawShowRows } = await query;

      if (cancelled || !rawShowRows || rawShowRows.length === 0) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      const showRows = nearbyVenueIds && nearbyVenueIds.size > 200
        ? rawShowRows.filter(s => s.venue_id && nearbyVenueIds!.has(s.venue_id))
        : rawShowRows;

      if (showRows.length === 0) {
        setItems([]);
        setIsLoading(false);
        return;
      }

      const showIds = showRows.map(s => s.id);
      const showMap = new Map(showRows.map(s => [s.id, s]));

      // Fetch artists, rankings, and comparisons in parallel
      const [artistRes, rankingsRes, comparisonsRes] = await Promise.all([
        supabase
          .from("show_artists")
          .select("artist_name, artist_image_url, show_id, is_headliner")
          .eq("is_headliner", true)
          .not("artist_image_url", "is", null)
          .in("show_id", showIds),
        supabase
          .from("show_rankings")
          .select("show_id, user_id, comparisons_count")
          .in("show_id", showIds),
        supabase
          .from("show_comparisons")
          .select("show1_id, show2_id, winner_id")
          .or(`show1_id.in.(${showIds.join(",")}),show2_id.in.(${showIds.join(",")})`)
      ]);

      if (cancelled) { setIsLoading(false); return; }

      const artistRows = artistRes.data ?? [];
      const rankingRows = rankingsRes.data ?? [];
      const comparisonRows = comparisonsRes.data ?? [];

      // Build per-show ELO stats
      const showWins = new Map<string, number>();
      const showAppearances = new Map<string, number>();
      const showIdSet = new Set(showIds);

      for (const c of comparisonRows) {
        if (showIdSet.has(c.show1_id)) {
          showAppearances.set(c.show1_id, (showAppearances.get(c.show1_id) ?? 0) + 1);
          if (c.winner_id === c.show1_id) showWins.set(c.show1_id, (showWins.get(c.show1_id) ?? 0) + 1);
        }
        if (showIdSet.has(c.show2_id)) {
          showAppearances.set(c.show2_id, (showAppearances.get(c.show2_id) ?? 0) + 1);
          if (c.winner_id === c.show2_id) showWins.set(c.show2_id, (showWins.get(c.show2_id) ?? 0) + 1);
        }
      }

      // Per-show ranked user count
      const showRankedUsers = new Map<string, Set<string>>();
      for (const r of rankingRows) {
        if (r.comparisons_count > 0) {
          if (!showRankedUsers.has(r.show_id)) showRankedUsers.set(r.show_id, new Set());
          showRankedUsers.get(r.show_id)!.add(r.user_id);
        }
      }

      if (showType === "set") {
        const artistAgg = new Map<string, {
          imageUrl: string | null;
          userIds: Set<string>;
          showIds: string[];
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
              showIds: [],
              latestShow: { venueName: show.venue_name, showDate: show.show_date, date: new Date(show.show_date).getTime() },
            });
          }
          const agg = artistAgg.get(key)!;
          agg.userIds.add(show.user_id);
          agg.showIds.push(show.id);
          if (row.artist_image_url?.includes("scdn.co")) agg.imageUrl = row.artist_image_url;
          const d = new Date(show.show_date).getTime();
          if (d > agg.latestShow.date) {
            agg.latestShow = { venueName: show.venue_name, showDate: show.show_date, date: d };
          }
        }

        const sorted: PopularItem[] = [...artistAgg.entries()]
          .map(([key, agg]) => {
            // Aggregate ELO across all shows for this artist
            let totalWins = 0, totalAppearances = 0, totalMatchups = 0;
            const rankedUserSet = new Set<string>();
            for (const sid of agg.showIds) {
              totalWins += showWins.get(sid) ?? 0;
              totalAppearances += showAppearances.get(sid) ?? 0;
              totalMatchups += showAppearances.get(sid) ?? 0;
              const ru = showRankedUsers.get(sid);
              if (ru) ru.forEach(u => rankedUserSet.add(u));
            }
            const winRate = totalAppearances > 0 ? Math.round((totalWins / totalAppearances) * 100) : null;

            return {
              type: "artist" as const,
              artistName: artistRows.find(a => a.artist_name.toLowerCase() === key)?.artist_name ?? key,
              artistImageUrl: agg.imageUrl,
              userCount: agg.userIds.size,
              sampleVenueName: agg.latestShow.venueName,
              sampleShowDate: agg.latestShow.showDate,
              showType: showType,
              winRate,
              matchupCount: totalMatchups,
              userCountRanked: rankedUserSet.size,
            };
          })
          .filter(a => a.artistImageUrl)
          .sort((a, b) => {
            // Sort by win rate first (items with data rank higher), then user count
            if (a.winRate !== null && b.winRate !== null) return b.winRate - a.winRate || b.userCount - a.userCount;
            if (a.winRate !== null) return -1;
            if (b.winRate !== null) return 1;
            return b.userCount - a.userCount || a.artistName.localeCompare(b.artistName);
          })
          .slice(0, 15);

        if (!cancelled) {
          setItems(sorted);
          setTotalUsers(new Set(showRows.map(s => s.user_id)).size);
          setIsLoading(false);
        }
      } else {
        const artistsByShow = new Map<string, typeof artistRows>();
        for (const row of artistRows) {
          if (!artistsByShow.has(row.show_id)) artistsByShow.set(row.show_id, []);
          artistsByShow.get(row.show_id)!.push(row);
        }

        const eventAgg = new Map<string, {
          eventName: string; venueName: string; imageUrl: string | null;
          userIds: Set<string>; artists: Set<string>; latestDate: string | null;
          showIds: string[];
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
              showIds: [],
            });
          }
          const agg = eventAgg.get(key)!;
          agg.userIds.add(show.user_id);
          agg.showIds.push(show.id);
          for (const a of (artistsByShow.get(show.id) ?? [])) agg.artists.add(a.artist_name);
          const betterImg = (artistsByShow.get(show.id) ?? []).find(a => a.artist_image_url?.includes("scdn.co"))?.artist_image_url;
          if (betterImg) agg.imageUrl = betterImg;
          if (!agg.latestDate || show.show_date > agg.latestDate) agg.latestDate = show.show_date;
        }

        const sorted: PopularItem[] = [...eventAgg.values()]
          .filter(e => e.imageUrl)
          .map(e => {
            let totalWins = 0, totalAppearances = 0, totalMatchups = 0;
            const rankedUserSet = new Set<string>();
            for (const sid of e.showIds) {
              totalWins += showWins.get(sid) ?? 0;
              totalAppearances += showAppearances.get(sid) ?? 0;
              totalMatchups += showAppearances.get(sid) ?? 0;
              const ru = showRankedUsers.get(sid);
              if (ru) ru.forEach(u => rankedUserSet.add(u));
            }
            const winRate = totalAppearances > 0 ? Math.round((totalWins / totalAppearances) * 100) : null;

            return {
              type: "event" as const,
              eventName: e.eventName, venueName: e.venueName, imageUrl: e.imageUrl,
              userCount: e.userIds.size, topArtists: [...e.artists].slice(0, 4),
              sampleShowDate: e.latestDate, showType: showType,
              winRate,
              matchupCount: totalMatchups,
              userCountRanked: rankedUserSet.size,
            };
          })
          .sort((a, b) => {
            if (a.winRate !== null && b.winRate !== null) return b.winRate - a.winRate || b.userCount - a.userCount;
            if (a.winRate !== null) return -1;
            if (b.winRate !== null) return 1;
            return b.userCount - a.userCount || a.eventName.localeCompare(b.eventName);
          })
          .slice(0, 15);

        if (!cancelled) {
          setItems(sorted);
          setTotalUsers(new Set(showRows.map(s => s.user_id)).size);
          setIsLoading(false);
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [enabled, showType, geoScope, overrideLat, overrideLng, overrideCity]);

  return { items, totalUsers, isLoading, hasLocation, cityName, countryName };
}
