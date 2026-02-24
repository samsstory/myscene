import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParsedUpcomingEvent {
  artist_name: string;
  event_name: string;
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
  event_name: string | null;
  venue_name: string | null;
  venue_location: string | null;
  show_date: string | null;
  ticket_url: string | null;
  artist_image_url: string | null;
  rsvp_status: "going" | "maybe" | "not_going";
  created_at: string;
  raw_input: string | null;
}

export interface SaveUpcomingShowData {
  artist_name: string;
  event_name?: string;
  venue_name?: string;
  venue_location?: string;
  show_date?: string;
  ticket_url?: string;
  artist_image_url?: string;
  raw_input?: string;
  rsvp_status?: string;
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

  /** After saving, checks if any followed friends are going to the same show */
  const checkSharedShow = useCallback(async (
    userId: string,
    artistName: string,
    showDate: string,
  ): Promise<void> => {
    try {
      const { data: followingRows } = await supabase
        .from("followers")
        .select("following_id")
        .eq("follower_id", userId);

      const followingIds = (followingRows ?? []).map((r: any) => r.following_id as string);
      if (followingIds.length === 0) return;

      const { data: matches } = await supabase
        .from("upcoming_shows" as any)
        .select("created_by_user_id, artist_name")
        .in("created_by_user_id", followingIds)
        .ilike("artist_name", artistName)
        .eq("show_date", showDate);

      if (!matches || (matches as any[]).length === 0) return;

      const matchedUserIds = [...new Set((matches as any[]).map((m: any) => m.created_by_user_id as string))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", matchedUserIds);

      if (!profiles || profiles.length === 0) return;

      const friendNames = profiles.map((p: any) =>
        p.username ? `@${p.username}` : (p.full_name ?? "A friend")
      );

      const nameStr =
        friendNames.length === 1
          ? friendNames[0]
          : friendNames.length === 2
          ? `${friendNames[0]} & ${friendNames[1]}`
          : `${friendNames[0]} & ${friendNames.length - 1} others`;

      toast(`${nameStr} is also going! 🎉`, {
        description: `You're both going to ${artistName}`,
        icon: "👥",
        duration: 6000,
      });

    } catch {
      // silent — detection failure should never block the save flow
    }
  }, []);

  const saveUpcomingShow = useCallback(async (data: SaveUpcomingShowData): Promise<boolean> => {
    setIsSaving(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // ── Duplicate prevention ──────────────────────────────────────────
      // Check if user already has an upcoming show with same date + (artist OR venue)
      if (data.show_date) {
        const { data: existing } = await supabase
          .from("upcoming_shows" as any)
          .select("id, artist_name, venue_name")
          .eq("created_by_user_id", user.id)
          .eq("show_date", data.show_date);

        const norm = (s?: string | null) => (s ?? "").trim().toLowerCase();
        const isDupe = (existing as any[] ?? []).some((row: any) =>
          norm(row.artist_name) === norm(data.artist_name) ||
          (norm(row.venue_name) && norm(data.venue_name) && norm(row.venue_name) === norm(data.venue_name))
        );

        if (isDupe) {
          toast.info("This show is already on your calendar", { icon: "📅" });
          setIsSaving(false);
          return false;
        }
      }

      const { error: insertError } = await supabase
        .from("upcoming_shows" as any)
        .insert({
          created_by_user_id: user.id,
          artist_name: data.artist_name,
          event_name: data.event_name || null,
          venue_name: data.venue_name || null,
          venue_location: data.venue_location || null,
          show_date: data.show_date || null,
          ticket_url: data.ticket_url || null,
          artist_image_url: data.artist_image_url || null,
          raw_input: data.raw_input || null,
          rsvp_status: data.rsvp_status || "going",
        });

      if (insertError) throw insertError;

      // Check if any followed friends are going to the same show
      if (data.artist_name && data.show_date) {
        const sharedFound = await (async () => {
          const { data: followingRows } = await supabase
            .from("followers")
            .select("following_id")
            .eq("follower_id", user.id);
          const followingIds = (followingRows ?? []).map((r: any) => r.following_id as string);
          if (followingIds.length === 0) return false;

          const { data: matches } = await supabase
            .from("upcoming_shows" as any)
            .select("created_by_user_id")
            .in("created_by_user_id", followingIds)
            .ilike("artist_name", data.artist_name)
            .eq("show_date", data.show_date!);

          return !!(matches && (matches as any[]).length > 0);
        })().catch(() => false);

        if (sharedFound) {
          // Fire rich "friend is also going" toast (non-blocking)
          checkSharedShow(user.id, data.artist_name, data.show_date);
        } else {
          toast.success(`${data.artist_name} added to your calendar`, { icon: "🎶" });
        }
      } else {
        toast.success(`${data.artist_name} added to your calendar`, { icon: "🎶" });
      }

      await fetchUpcomingShows();
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save show";
      toast.error(msg);
      return false;
    } finally {
      setIsSaving(false);
    }
  }, [fetchUpcomingShows, checkSharedShow]);

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
