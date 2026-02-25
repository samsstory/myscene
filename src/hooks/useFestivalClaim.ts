import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AddedShowData } from "@/hooks/useBulkShowUpload";
import type { FestivalResult } from "@/components/festival-claim/FestivalSearchStep";
import { containsB2bDelimiter, splitB2bNames } from "@/lib/b2b-utils";

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

      // 1. Look up artist images — expand B2B names into individual artists for enrichment
      const individualNames = newArtists.flatMap((name) =>
        containsB2bDelimiter(name) ? splitB2bNames(name) : [name]
      );
      const uniqueNames = [...new Set(individualNames.map((n) => n.toLowerCase()))].map(
        (lower) => individualNames.find((n) => n.toLowerCase() === lower)!
      );

      const artistImageMap = new Map<string, { image_url: string | null; id: string | null }>();
      try {
        const resp = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/batch-artist-images`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
            },
            body: JSON.stringify({ names: uniqueNames }),
          }
        );
        if (resp.ok) {
          const { artists: resolved } = await resp.json();
          for (const [key, val] of Object.entries(resolved as Record<string, { image_url: string; spotify_id: string | null }>)) {
            artistImageMap.set(key.toLowerCase(), { image_url: val.image_url, id: null });
          }
        }
      } catch (err) {
        console.warn("batch-artist-images lookup failed, continuing without images:", err);
      }

      // 2. Create parent festival record
      const { data: parent, error: parentError } = await supabase
        .from("shows")
        .insert({ ...shared, show_type: "festival" })
        .select("id")
        .single();

      if (parentError || !parent) throw parentError;

      // 3. Create child records — detect B2B artists and create appropriate show types
      const childInserts: {
        artistNames: string[];
        isB2b: boolean;
      }[] = newArtists.map((name) => {
        if (containsB2bDelimiter(name)) {
          return { artistNames: splitB2bNames(name), isB2b: true };
        }
        return { artistNames: [name], isB2b: false };
      });

      const childRows = childInserts.map((entry) => ({
        ...shared,
        show_type: entry.isB2b ? ("b2b" as const) : ("set" as const),
        parent_show_id: parent.id,
      }));

      const { data: insertedSets, error: setError } = await supabase
        .from("shows")
        .insert(childRows)
        .select("id");

      if (setError || !insertedSets) throw setError;

      // 4. Insert show_artists with images — B2B shows get multiple artists
      const buildArtistRow = (showId: string, name: string, isHeadliner: boolean, isB2b: boolean) => {
        const match = artistImageMap.get(name.toLowerCase());
        return {
          show_id: showId,
          artist_name: name,
          is_headliner: isHeadliner,
          is_b2b: isB2b,
          artist_image_url: match?.image_url || null,
          artist_id: match?.id || null,
        };
      };

      const artistRows: ReturnType<typeof buildArtistRow>[] = [];

      // Parent festival gets all artists (first one as headliner)
      const allIndividualNames = childInserts.flatMap((entry) => entry.artistNames);
      allIndividualNames.forEach((name, i) => {
        artistRows.push(buildArtistRow(parent.id, name, i === 0, false));
      });

      // Each child set/b2b gets its own artists
      insertedSets.forEach((set, i) => {
        const entry = childInserts[i];
        entry.artistNames.forEach((name) => {
          artistRows.push(buildArtistRow(set.id, name, true, entry.isB2b));
        });
      });

      const { error: artistError } = await supabase
        .from("show_artists")
        .insert(artistRows);

      if (artistError) throw artistError;

      // Return only child records for success screen
      const addedShows: AddedShowData[] = insertedSets.map((set, i) => {
        const entry = childInserts[i];
        return {
          id: set.id,
          artists: entry.artistNames.map((name, j) => ({
            name,
            isHeadliner: true,
            image_url: artistImageMap.get(name.toLowerCase())?.image_url || null,
          })),
          venue: { name: venueName, location: venueLocation },
          date: showDate,
          rating: null,
          photo_url: null,
        };
      });

      const total = newArtists.length + 1; // children + festival parent
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
