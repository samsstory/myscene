import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface EdmtrainEvent {
  id: number;
  edmtrain_id: number;
  event_name: string | null;
  event_link: string;
  event_date: string;
  festival_ind: boolean;
  ages: string | null;
  venue_name: string | null;
  venue_location: string | null;
  venue_latitude: number | null;
  venue_longitude: number | null;
  artists: { id: number; name: string; link: string; b2b: boolean }[];
  artist_image_url: string | null;
}

interface UseEdmtrainEventsOptions {
  enabled?: boolean;
  /** Override location instead of using profile home city */
  overrideLat?: number | null;
  overrideLng?: number | null;
  overrideCity?: string | null;
}

// State abbreviation map for Edmtrain API
const stateAbbrevToFull: Record<string, string> = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi", MO: "Missouri",
  MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire", NJ: "New Jersey",
  NM: "New Mexico", NY: "New York", NC: "North Carolina", ND: "North Dakota", OH: "Ohio",
  OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania", RI: "Rhode Island", SC: "South Carolina",
  SD: "South Dakota", TN: "Tennessee", TX: "Texas", UT: "Utah", VT: "Vermont",
  VA: "Virginia", WA: "Washington", WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
  DC: "District of Columbia",
};

const countryNames = ["united states", "usa", "us", "canada", "uk", "united kingdom", "spain", "germany", "france", "australia", "mexico"];

function extractState(cityStr: string): string | null {
  const parts = cityStr.split(",").map((p) => p.trim());
  for (let i = parts.length - 1; i >= 0; i--) {
    const part = parts[i].trim();
    if (countryNames.includes(part.toLowerCase())) continue;
    if (stateAbbrevToFull[part.toUpperCase()]) return stateAbbrevToFull[part.toUpperCase()];
    const fullMatch = Object.values(stateAbbrevToFull).find(s => s.toLowerCase() === part.toLowerCase());
    if (fullMatch) return fullMatch;
  }
  return null;
}

export function useEdmtrainEvents(opts: UseEdmtrainEventsOptions = {}) {
  const { enabled = true, overrideLat, overrideLng, overrideCity } = opts;
  const [events, setEvents] = useState<EdmtrainEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasOverride = overrideLat != null && overrideLng != null;

  const fetchEvents = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      let lat: number, lng: number, cityStr: string;

      if (hasOverride) {
        lat = overrideLat!;
        lng = overrideLng!;
        cityStr = overrideCity || "";
      } else {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from("profiles")
          .select("home_latitude, home_longitude, home_city")
          .eq("id", user.id)
          .single();

        if (!profile?.home_latitude || !profile?.home_longitude) {
          setEvents([]);
          return;
        }
        lat = Number(profile.home_latitude);
        lng = Number(profile.home_longitude);
        cityStr = profile.home_city || "";
      }

      const state = extractState(cityStr);
      if (!state) {
        console.warn("Could not determine state from city:", cityStr);
        setEvents([]);
        return;
      }

      // Trigger cache refresh
      await supabase.functions.invoke("fetch-edmtrain", {
        body: { latitude: lat, longitude: lng, state },
      });

      // Read cached events
      const locationKey = `lat:${lat.toFixed(1)},lng:${lng.toFixed(1)}`;
      const today = new Date().toISOString().split("T")[0];

      const { data: cached, error: queryError } = await supabase
        .from("edmtrain_events")
        .select("*")
        .eq("location_key", locationKey)
        .gte("event_date", today)
        .order("event_date", { ascending: true });

      if (queryError) throw queryError;

      const mapped: EdmtrainEvent[] = (cached || []).map((row: any) => ({
        id: row.id,
        edmtrain_id: row.edmtrain_id,
        event_name: row.event_name,
        event_link: row.event_link,
        event_date: row.event_date,
        festival_ind: row.festival_ind,
        ages: row.ages,
        venue_name: row.venue_name,
        venue_location: row.venue_location,
        venue_latitude: row.venue_latitude,
        venue_longitude: row.venue_longitude,
        artists: typeof row.artists === "string" ? JSON.parse(row.artists) : (row.artists || []),
        artist_image_url: row.artist_image_url || null,
      }));

      setEvents(mapped);
    } catch (err: any) {
      console.error("useEdmtrainEvents error:", err);
      setError(err.message || "Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  }, [enabled, hasOverride, overrideLat, overrideLng, overrideCity]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, isLoading, error, refetch: fetchEvents };
}
