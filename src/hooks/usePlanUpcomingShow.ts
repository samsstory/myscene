import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParsedUpcomingEvent {
  artist_name: string;
  venue_name: string;
  venue_location: string;
  show_date: string;
  ticket_url: string;
  confidence: "high" | "medium" | "low";
  artist_image_url: string | null;
}

export interface UpcomingShow {
  id: string;
  artist_name: string;
  venue_name: string | null;
  venue_location: string | null;
  show_date: string | null;
  ticket_url: string | null;
  artist_image_url: string | null;
  rsvp_status: "going" | "maybe" | "not_going";
  created_at: string;
}

export interface SaveUpcomingShowData {
  artist_name: string;
  venue_name?: string;
  venue_location?: string;
  show_date?: string;
  ticket_url?: string;
  artist_image_url?: string;
  raw_input?: string;
}

export function usePlanUpcomingShow() {
  const [upcomingShows, setUpcomingShows] = useState<UpcomingShow[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [parsedResult, setParsedResult] = useState<ParsedUpcomingEvent[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchUpcomingShows = useCallback(async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setUpcomingShows([]);
        setIsLoading(false);
        return;
      }

      const { data, error: fetchError } = await supabase
        .from("upcoming_shows" as any)
        .select("*")
        .eq("created_by_user_id", user.id)
        .order("show_date", { ascending: true, nullsFirst: false });

      if (fetchError) throw fetchError;
      setUpcomingShows((data || []) as unknown as UpcomingShow[]);
    } catch (err) {
      console.error("Error fetching upcoming shows:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUpcomingShows();

    const channel = supabase
      .channel("upcoming_shows_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "upcoming_shows" },
        () => { fetchUpcomingShows(); }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchUpcomingShows]);

  const parseInput = useCallback(async (text: string): Promise<ParsedUpcomingEvent[] | null> => {
    setIsParsing(true);
    setError(null);
    setParsedResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("parse-upcoming-show", {
        body: { input: text },
      });

      if (fnError) throw fnError;

      if (data?.error) {
        if (data.error.includes("Rate limit")) {
          toast.error("Rate limit hit — try again in a moment");
        } else if (data.error.includes("credits")) {
          toast.error("AI credits exhausted");
        } else {
          toast.error(data.error);
        }
        setError(data.error);
        return null;
      }

      const events: ParsedUpcomingEvent[] = data?.events || [];
      if (events.length === 0) {
        toast.error("Couldn't extract event details — try adding more info");
        setError("No events found");
        return null;
      }

      setParsedResult(events);
      return events;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to parse input";
      setError(msg);
      toast.error(msg);
      return null;
    } finally {
      setIsParsing(false);
    }
  }, []);

  const saveUpcomingShow = useCallback(async (data: SaveUpcomingShowData): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error: insertError } = await supabase
        .from("upcoming_shows" as any)
        .insert({
          created_by_user_id: user.id,
          artist_name: data.artist_name,
          venue_name: data.venue_name || null,
          venue_location: data.venue_location || null,
          show_date: data.show_date || null,
          ticket_url: data.ticket_url || null,
          artist_image_url: data.artist_image_url || null,
          raw_input: data.raw_input || null,
        });

      if (insertError) throw insertError;

      toast.success(`${data.artist_name} added to upcoming shows`);
      await fetchUpcomingShows();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save show";
      toast.error(msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [fetchUpcomingShows]);

  const deleteUpcomingShow = useCallback(async (id: string): Promise<void> => {
    try {
      const { error: deleteError } = await supabase
        .from("upcoming_shows" as any)
        .delete()
        .eq("id", id);

      if (deleteError) throw deleteError;
      await fetchUpcomingShows();
    } catch (err) {
      toast.error("Failed to remove upcoming show");
    }
  }, [fetchUpcomingShows]);

  const updateRsvpStatus = useCallback(async (id: string, status: "going" | "maybe" | "not_going"): Promise<void> => {
    try {
      const { error } = await supabase
        .from("upcoming_shows" as any)
        .update({ rsvp_status: status })
        .eq("id", id);

      if (error) throw error;
      await fetchUpcomingShows();
    } catch (err) {
      toast.error("Failed to update RSVP status");
    }
  }, [fetchUpcomingShows]);

  const clearParsedResult = useCallback(() => {
    setParsedResult(null);
    setError(null);
  }, []);

  return {
    upcomingShows,
    isLoading,
    isParsing,
    isSaving,
    parsedResult,
    error,
    parseInput,
    saveUpcomingShow,
    deleteUpcomingShow,
    updateRsvpStatus,
    clearParsedResult,
    refetch: fetchUpcomingShows,
  };
}
