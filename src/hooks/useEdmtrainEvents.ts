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
}

interface UseEdmtrainEventsOptions {
  enabled?: boolean;
}

export function useEdmtrainEvents(opts: UseEdmtrainEventsOptions = {}) {
  const { enabled = true } = opts;
  const [events, setEvents] = useState<EdmtrainEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!enabled) return;
    setIsLoading(true);
    setError(null);

    try {
      // Get user's home coordinates
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

      // Extract state from home_city (e.g. "Austin, TX" → "Texas", "Los Angeles, CA" → "California")
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

      let state: string | null = null;
      if (profile.home_city) {
        // Try to match various formats:
        // "Austin, TX" → "Texas"
        // "New York, New York, United States" → "New York"
        // "Los Angeles, California" → "California"
        const parts = profile.home_city.split(",").map((p: string) => p.trim());
        
        // Try each part from right to left, skipping country names
        const countryNames = ["united states", "usa", "us", "canada", "uk", "united kingdom", "spain", "germany", "france", "australia", "mexico"];
        
        for (let i = parts.length - 1; i >= 0; i--) {
          const part = parts[i].trim();
          const partUpper = part.toUpperCase();
          
          // Skip country names
          if (countryNames.includes(part.toLowerCase())) continue;
          
          // Check abbreviation
          if (stateAbbrevToFull[partUpper]) {
            state = stateAbbrevToFull[partUpper];
            break;
          }
          
          // Check full state name
          const fullMatch = Object.values(stateAbbrevToFull).find(
            s => s.toLowerCase() === part.toLowerCase()
          );
          if (fullMatch) {
            state = fullMatch;
            break;
          }
        }
      }

      if (!state) {
        console.warn("Could not determine state from home_city:", profile.home_city);
        setEvents([]);
        return;
      }

      // Trigger cache refresh (edge function checks freshness internally)
      await supabase.functions.invoke("fetch-edmtrain", {
        body: {
          latitude: profile.home_latitude,
          longitude: profile.home_longitude,
          state,
        },
      });

      // Read cached events
      const locationKey = `lat:${Number(profile.home_latitude).toFixed(1)},lng:${Number(profile.home_longitude).toFixed(1)}`;
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
      }));

      setEvents(mapped);
    } catch (err: any) {
      console.error("useEdmtrainEvents error:", err);
      setError(err.message || "Failed to fetch events");
    } finally {
      setIsLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, isLoading, error, refetch: fetchEvents };
}
