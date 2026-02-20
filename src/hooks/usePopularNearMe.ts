import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { PopularArtist } from "@/hooks/usePopularShows";

const MILES_TO_KM = 1.60934;
const RADIUS_MILES = 50;
const RADIUS_KM = RADIUS_MILES * MILES_TO_KM;

/** Haversine distance in km between two lat/lng points */
function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Like usePopularShows but filtered to venues within 50 miles of the
 * current user's home coordinates (from their profile).
 */
export function usePopularNearMe(enabled: boolean) {
  const [artists, setArtists] = useState<PopularArtist[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [hasLocation, setHasLocation] = useState<boolean | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    setIsLoading(true);

    async function load() {
      // 1. Get current user's home coordinates
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

      // 2. Get venues with coordinates
      const { data: venues } = await supabase
        .from("venues")
        .select("id, latitude, longitude")
        .not("latitude", "is", null)
        .not("longitude", "is", null);

      if (cancelled || !venues) { setIsLoading(false); return; }

      // Filter venues within radius
      const nearbyVenueIds = new Set(
        venues
          .filter(v => haversineKm(homeLat, homeLng, Number(v.latitude), Number(v.longitude)) <= RADIUS_KM)
          .map(v => v.id)
      );

      if (nearbyVenueIds.size === 0) {
        setArtists([]);
        setIsLoading(false);
        return;
      }

      // 3. Get shows at nearby venues
      const { data: showRows } = await supabase
        .from("shows")
        .select("id, user_id, venue_name, show_date, venue_id")
        .in("venue_id", [...nearbyVenueIds]);

      if (cancelled || !showRows || showRows.length === 0) {
        setArtists([]);
        setIsLoading(false);
        return;
      }

      const showIds = showRows.map(s => s.id);
      const showMap = new Map(showRows.map(s => [s.id, s]));

      // 4. Get headliner artists for those shows
      const { data: artistRows } = await supabase
        .from("show_artists")
        .select("artist_name, artist_image_url, show_id, is_headliner")
        .eq("is_headliner", true)
        .not("artist_image_url", "is", null)
        .in("show_id", showIds);

      if (cancelled || !artistRows) { setIsLoading(false); return; }

      // 5. Aggregate same as usePopularShows
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

  return { artists, totalUsers, isLoading, hasLocation };
}
