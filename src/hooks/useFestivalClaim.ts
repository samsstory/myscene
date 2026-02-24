import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AddedShowData } from "@/hooks/useBulkShowUpload";
import type { FestivalResult } from "@/components/festival-claim/FestivalSearchStep";

export const useFestivalClaim = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const claimShows = async (
    selectedArtists: string[],
    festival: FestivalResult
  ): Promise<{ success: boolean; addedCount: number; addedShows: AddedShowData[] }> => {
    setIsSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const showDate = festival.date_start || `${festival.year}-01-01`;
      const venueName = festival.venue_name || festival.event_name;
      const venueLocation = festival.venue_location || null;

      // Check for existing shows on this date+venue to avoid duplicates
      const { data: existing } = await supabase
        .from("shows")
        .select("id, show_artists(artist_name)")
        .eq("user_id", user.id)
        .eq("show_date", showDate)
        .eq("venue_name", venueName);

      const existingArtists = new Set(
        (existing || []).flatMap((s: any) =>
          (s.show_artists || []).map((a: any) => a.artist_name.toLowerCase())
        )
      );

      const newArtists = selectedArtists.filter(
        (name) => !existingArtists.has(name.toLowerCase())
      );

      if (newArtists.length === 0) {
        toast.info("All selected artists are already logged for this festival");
        return { success: true, addedCount: 0, addedShows: [] };
      }

      // Insert one show per artist
      const showRows = newArtists.map((name) => ({
        user_id: user.id,
        show_date: showDate,
        venue_name: venueName,
        venue_location: venueLocation,
        venue_id: festival.venue_id,
        show_type: "set" as const,
        event_name: festival.event_name,
        date_precision: festival.date_start ? "exact" : "month",
      }));

      const { data: insertedShows, error: showError } = await supabase
        .from("shows")
        .insert(showRows)
        .select("id");

      if (showError || !insertedShows) throw showError;

      // Insert show_artists
      const artistRows = insertedShows.map((show, i) => ({
        show_id: show.id,
        artist_name: newArtists[i],
        is_headliner: true,
      }));

      const { error: artistError } = await supabase
        .from("show_artists")
        .insert(artistRows);

      if (artistError) throw artistError;

      const addedShows: AddedShowData[] = insertedShows.map((show, i) => ({
        id: show.id,
        artists: [{ name: newArtists[i], isHeadliner: true }],
        venue: { name: venueName, location: venueLocation },
        date: showDate,
        rating: null,
        photo_url: null,
      }));

      toast.success(`Added ${newArtists.length} show${newArtists.length !== 1 ? "s" : ""}`);
      return { success: true, addedCount: newArtists.length, addedShows };
    } catch (err: any) {
      console.error("Festival claim error:", err);
      toast.error("Failed to add shows");
      return { success: false, addedCount: 0, addedShows: [] };
    } finally {
      setIsSubmitting(false);
    }
  };

  return { claimShows, isSubmitting };
};
