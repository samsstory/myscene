import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface ParsedEmailShow {
  artist: string;
  venue: string;
  date: string | null;
  confidence: "high" | "medium" | "low";
  venueLocation?: string;
}

export interface PendingImport {
  id: string;
  parsed_shows: ParsedEmailShow[];
  email_subject: string | null;
  email_from: string | null;
  confidence: string | null;
  created_at: string;
}

export function usePendingEmailImports() {
  const [pendingImports, setPendingImports] = useState<PendingImport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [confirmedIndices, setConfirmedIndices] = useState<Map<string, Set<number>>>(new Map());

  const fetchPending = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setIsLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("pending_email_imports")
      .select("id, parsed_shows, email_subject, email_from, confidence, created_at")
      .eq("status", "pending")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      const mapped: PendingImport[] = data.map((row) => ({
        ...row,
        parsed_shows: Array.isArray(row.parsed_shows)
          ? (row.parsed_shows as unknown as ParsedEmailShow[])
          : [],
      }));
      setPendingImports(mapped);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { fetchPending(); }, [fetchPending]);

  /** Build dedup keys from existing shows */
  const buildExistingKeys = useCallback(async (userId: string): Promise<Set<string>> => {
    const { data: existingShows } = await supabase
      .from("shows")
      .select("id, show_date, venue_name, show_artists(artist_name)")
      .eq("user_id", userId);

    const keys = new Set<string>();
    (existingShows || []).forEach((s: Record<string, unknown>) => {
      const artists = (
        (s.show_artists as { artist_name: string }[]) || []
      )
        .map((a) => a.artist_name.toLowerCase())
        .sort();
      const key = `${s.show_date}|${(s.venue_name as string).toLowerCase()}|${artists.join(",")}`;
      keys.add(key);
    });
    return keys;
  }, []);

  const confirmShow = useCallback(
    async (importId: string, showIndex: number, show: ParsedEmailShow) => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) return false;
      const userId = session.user.id;

      const existingKeys = await buildExistingKeys(userId);

      const showDate = show.date || new Date().toISOString().split("T")[0];
      const venueName = show.venue || "Unknown Venue";
      const artistKey = show.artist.toLowerCase().trim();
      const dupeKey = `${showDate}|${venueName.toLowerCase()}|${artistKey}`;

      if (existingKeys.has(dupeKey)) {
        toast.info("Already in your collection — skipped duplicate");
        setConfirmedIndices((prev) => {
          const next = new Map(prev);
          const set = new Set(next.get(importId) || []);
          set.add(showIndex);
          next.set(importId, set);
          return next;
        });
        return false;
      }

      const datePrecision = show.date ? "exact" : "unknown";

      const { data: newShow, error: showError } = await supabase
        .from("shows")
        .insert({
          user_id: userId,
          venue_name: venueName,
          venue_location: show.venueLocation || null,
          show_date: showDate,
          date_precision: datePrecision,
          show_type: "set",
          rating: null,
          photo_url: null,
          photo_declined: true,
        })
        .select("id")
        .single();

      if (showError || !newShow) {
        toast.error("Failed to add show");
        return false;
      }

      await supabase.from("show_artists").insert({
        show_id: newShow.id,
        artist_name: show.artist,
        is_headliner: true,
        is_b2b: false,
      });

      setConfirmedIndices((prev) => {
        const next = new Map(prev);
        const set = new Set(next.get(importId) || []);
        set.add(showIndex);
        next.set(importId, set);
        return next;
      });

      toast.success(`Added ${show.artist}`);
      return true;
    },
    [buildExistingKeys],
  );

  const confirmAll = useCallback(
    async (importId: string) => {
      const imp = pendingImports.find((i) => i.id === importId);
      if (!imp) return;

      let addedCount = 0;
      const already = confirmedIndices.get(importId) || new Set();

      for (let i = 0; i < imp.parsed_shows.length; i++) {
        if (already.has(i)) continue;
        const ok = await confirmShow(importId, i, imp.parsed_shows[i]);
        if (ok) addedCount++;
      }

      await supabase
        .from("pending_email_imports")
        .update({ status: "confirmed", processed_at: new Date().toISOString() })
        .eq("id", importId);

      setPendingImports((prev) => prev.filter((i) => i.id !== importId));
      if (addedCount > 0) {
        toast.success(`Added ${addedCount} show${addedCount !== 1 ? "s" : ""} from email`);
      }
    },
    [pendingImports, confirmedIndices, confirmShow],
  );

  const dismissImport = useCallback(async (importId: string) => {
    await supabase
      .from("pending_email_imports")
      .update({ status: "dismissed", processed_at: new Date().toISOString() })
      .eq("id", importId);

    setPendingImports((prev) => prev.filter((i) => i.id !== importId));
  }, []);

  const pendingCount = pendingImports.reduce((sum, i) => sum + i.parsed_shows.length, 0);

  return {
    pendingImports,
    pendingCount,
    isLoading,
    confirmedIndices,
    confirmShow,
    confirmAll,
    dismissImport,
    refetch: fetchPending,
  };
}
