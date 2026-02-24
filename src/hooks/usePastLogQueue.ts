import { useState, useCallback, useRef, useMemo } from "react";
import { isAfter, parseISO, startOfToday } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { UpcomingShow } from "@/hooks/usePlanUpcomingShow";
import type { QuickAddPrefill } from "@/components/QuickAddSheet";
import { isUserUploadedImage, resolveArtistImage } from "@/lib/artist-image-utils";

async function prefillFromShow(show: UpcomingShow): Promise<QuickAddPrefill> {
  let imageUrl = show.artist_image_url;
  if (isUserUploadedImage(imageUrl)) {
    imageUrl = (await resolveArtistImage(show.artist_name)) ?? null;
  }
  return {
    artistName: show.artist_name,
    artistImageUrl: imageUrl,
    venueName: show.venue_name,
    venueLocation: show.venue_location,
    showDate: show.show_date,
    showType: show.raw_input === "festival" ? "festival" : "set",
  };
}

export function usePastLogQueue(upcomingShows: UpcomingShow[], refetch: () => void) {
  const [pastLogPrefill, setPastLogPrefill] = useState<QuickAddPrefill | null>(null);
  const [pastLogOpen, setPastLogOpen] = useState(false);
  const pastLogQueueRef = useRef<UpcomingShow[]>([]);
  const [pastLogPosition, setPastLogPosition] = useState(1);
  const [pastLogTotal, setPastLogTotal] = useState(0);

  // Past (unlogged) upcoming shows
  const pastShows = useMemo(() => {
    const today = startOfToday();
    const norm = (s: string) => s.trim().toLowerCase();
    const seen = new Map<string, UpcomingShow>();
    for (const show of upcomingShows) {
      const key = `${norm(show.artist_name)}|${show.show_date ?? ""}`;
      if (seen.has(key)) continue;
      if (!show.show_date) continue;
      try {
        if (isAfter(today, parseISO(show.show_date))) seen.set(key, show);
      } catch { /* skip */ }
    }
    return Array.from(seen.values());
  }, [upcomingShows]);

  const advanceQueue = useCallback(async () => {
    const next = pastLogQueueRef.current.shift();
    if (next) {
      setPastLogPrefill(await prefillFromShow(next));
      setPastLogPosition((p) => p + 1);
      setPastLogOpen(false);
      setTimeout(() => setPastLogOpen(true), 300);
    } else {
      toast.success("All past shows logged! 🎉");
      setPastLogOpen(false);
    }
  }, []);

  const startPastLogQueue = useCallback(async () => {
    if (pastShows.length === 0) return;
    pastLogQueueRef.current = [...pastShows];
    const first = pastLogQueueRef.current.shift()!;
    setPastLogTotal(pastShows.length);
    setPastLogPosition(1);
    setPastLogPrefill(await prefillFromShow(first));
    setPastLogOpen(true);
  }, [pastShows]);

  const handlePastLogShowAdded = useCallback(async () => {
    const justLogged = pastShows.find(
      (s) => s.artist_name === pastLogPrefill?.artistName && s.show_date === pastLogPrefill?.showDate
    );
    if (justLogged) {
      await supabase.from("upcoming_shows" as any).delete().eq("id", justLogged.id);
      refetch();
    }
    advanceQueue();
  }, [pastShows, pastLogPrefill, refetch, advanceQueue]);

  const handleNeverMadeIt = useCallback(async () => {
    const show = pastShows.find(
      (s) => s.artist_name === pastLogPrefill?.artistName && s.show_date === pastLogPrefill?.showDate
    );
    if (show) {
      await supabase.from("upcoming_shows" as any).delete().eq("id", show.id);
      refetch();
    }
    advanceQueue();
  }, [pastShows, pastLogPrefill, refetch, advanceQueue]);

  const handleSkipForNow = useCallback(() => {
    advanceQueue();
  }, [advanceQueue]);

  return {
    pastShows,
    pastShowsCount: pastShows.length,
    pastLogOpen,
    setPastLogOpen,
    pastLogPrefill,
    pastLogPosition,
    pastLogTotal,
    startPastLogQueue,
    handlePastLogShowAdded,
    handleNeverMadeIt,
    handleSkipForNow,
  };
}
