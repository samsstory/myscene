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

      // Trigger cache refresh (edge function checks freshness internally)
      // Extract state from home_city if possible (e.g. "Los Angeles, CA" → "California")
      await supabase.functions.invoke("fetch-edmtrain", {
        body: {
          latitude: profile.home_latitude,
          longitude: profile.home_longitude,
          state: null, // The Nearby Events API works with just lat/lng
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
