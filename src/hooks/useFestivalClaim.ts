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

      // 1. Look up canonical artist images
      const { data: knownArtists } = await supabase
        .from("artists")
        .select("name, image_url, id")
        .in("name", newArtists);

      const artistImageMap = new Map<string, { image_url: string | null; id: string }>();
      (knownArtists || []).forEach((a) => {
        artistImageMap.set(a.name.toLowerCase(), { image_url: a.image_url, id: a.id });
      });

      // 2. Create parent festival record
      const { data: parent, error: parentError } = await supabase
        .from("shows")
        .insert({ ...shared, show_type: "festival" })
        .select("id")
        .single();

      if (parentError || !parent) throw parentError;

      // 3. Create child set records linked to parent
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

      // 4. Insert show_artists with images from canonical artists table
      const buildArtistRow = (showId: string, name: string, isHeadliner: boolean) => {
        const match = artistImageMap.get(name.toLowerCase());
        return {
          show_id: showId,
          artist_name: name,
          is_headliner: isHeadliner,
          artist_image_url: match?.image_url || null,
          artist_id: match?.id || null,
        };
      };

      const artistRows = [
        ...newArtists.map((name, i) => buildArtistRow(parent.id, name, i === 0)),
        ...insertedSets.map((set, i) => buildArtistRow(set.id, newArtists[i], true)),
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
