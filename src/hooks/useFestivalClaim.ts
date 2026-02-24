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

      const shared = {
        user_id: user.id,
        show_date: showDate,
        venue_name: venueName,
        venue_location: venueLocation,
        venue_id: festival.venue_id,
        event_name: festival.event_name,
        date_precision: festival.date_start ? "exact" : "month",
      };

      // 1. Create parent festival record
      const { data: parent, error: parentError } = await supabase
        .from("shows")
        .insert({ ...shared, show_type: "festival" })
        .select("id")
        .single();

      if (parentError || !parent) throw parentError;

      // 2. Create child set records linked to parent
      const setRows = newArtists.map(() => ({
        ...shared,
        show_type: "set" as const,
        parent_show_id: parent.id,
      }));

      const { data: insertedSets, error: setError } = await supabase
        .from("shows")
        .insert(setRows)
        .select("id");

      if (setError || !insertedSets) throw setError;

      // 3. Insert show_artists — parent gets all artists, each child gets one
      const artistRows = [
        ...newArtists.map((name, i) => ({
          show_id: parent.id,
          artist_name: name,
          is_headliner: i === 0,
        })),
        ...insertedSets.map((set, i) => ({
          show_id: set.id,
          artist_name: newArtists[i],
          is_headliner: true,
        })),
      ];

      const { error: artistError } = await supabase
        .from("show_artists")
        .insert(artistRows);

      if (artistError) throw artistError;

      // Return all records (parent + sets) for success screen
      const allInserted = [parent, ...insertedSets];
      const addedShows: AddedShowData[] = allInserted.map((show, i) => ({
        id: show.id,
        artists: i === 0
          ? newArtists.map((name, j) => ({ name, isHeadliner: j === 0 }))
          : [{ name: newArtists[i - 1], isHeadliner: true }],
        venue: { name: venueName, location: venueLocation },
        date: showDate,
        rating: null,
        photo_url: null,
      }));

      const total = newArtists.length + 1; // sets + festival
      toast.success(`Added ${festival.event_name} + ${newArtists.length} set${newArtists.length !== 1 ? "s" : ""}`);
      return { success: true, addedCount: total, addedShows };
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
