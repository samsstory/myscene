import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AddedShowData } from "./useBulkShowUpload";

interface ReviewedTextShow {
  id: string;
  artists: { name: string; isHeadliner: boolean; imageUrl?: string; spotifyId?: string }[];
  venue: string;
  venueId: string | null;
  venueLocation: string;
  date: Date | null;
  datePrecision: "exact" | "approximate" | "unknown";
  selectedMonth: string;
  selectedYear: string;
  isValid: boolean;
  isB2b?: boolean;
}

interface UploadResult {
  success: boolean;
  addedCount: number;
  failedCount: number;
  addedShows: AddedShowData[];
}

export function useTextImportUpload() {
  const [isUploading, setIsUploading] = useState(false);

  const uploadShows = async (shows: ReviewedTextShow[]): Promise<UploadResult> => {
    setIsUploading(true);
    let addedCount = 0;
    let failedCount = 0;
    const addedShows: AddedShowData[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error("Not authenticated");
      const userId = session.user.id;

      for (const show of shows) {
        try {
          // 1. Venue
          let venueIdToUse: string | null = null;
          if (show.venue.trim()) {
            if (show.venueId) {
              venueIdToUse = show.venueId;
            } else {
              const { data: newVenue } = await supabase
                .from('venues')
                .insert({ name: show.venue, location: show.venueLocation || null })
                .select('id')
                .single();
              if (newVenue) venueIdToUse = newVenue.id;
            }
          }

          // 2. Date
          let showDate: string;
          let dbDatePrecision: string;

          if (show.datePrecision === "exact" && show.date) {
            showDate = show.date.toISOString().split('T')[0];
            dbDatePrecision = "exact";
          } else if (show.datePrecision === "approximate" && show.selectedYear) {
            const month = show.selectedMonth || "01";
            showDate = `${show.selectedYear}-${month}-01`;
            dbDatePrecision = "approximate";
          } else if (show.selectedYear) {
            showDate = `${show.selectedYear}-01-01`;
            dbDatePrecision = "unknown";
          } else {
            showDate = new Date().toISOString().split('T')[0];
            dbDatePrecision = "unknown";
          }

          // 3. Create show — use 'b2b' show_type if flagged
          const showType = show.isB2b ? 'b2b' : 'set';
          const { data: newShow, error: showError } = await supabase
            .from('shows')
            .insert({
              user_id: userId,
              venue_name: show.venue || 'Unknown Venue',
              venue_location: show.venueLocation || null,
              venue_id: venueIdToUse,
              show_date: showDate,
              date_precision: dbDatePrecision,
              show_type: showType,
              rating: null,
              photo_url: null,
              photo_declined: true,
            })
            .select('id')
            .single();

          if (showError) throw showError;

          // 4. Artists — mark is_b2b for B2B shows
          if (show.artists.length > 0) {
            const artistInserts = show.artists.map(a => ({
              show_id: newShow.id,
              artist_name: a.name,
              is_headliner: a.isHeadliner,
              is_b2b: show.isB2b ?? false,
              artist_image_url: a.imageUrl || null,
              spotify_artist_id: a.spotifyId || null,
            }));
            await supabase.from('show_artists').insert(artistInserts);
          }

          // 5. Update user_venues
          if (venueIdToUse) {
            await supabase.from('user_venues').upsert({
              user_id: userId,
              venue_id: venueIdToUse,
              show_count: 1,
              last_show_date: showDate,
            }, { onConflict: 'user_id,venue_id', ignoreDuplicates: false });
          }

          addedShows.push({
            id: newShow.id,
            artists: show.artists.map(a => ({ name: a.name, isHeadliner: a.isHeadliner })),
            venue: { name: show.venue || 'Unknown Venue', location: show.venueLocation || '' },
            date: showDate,
            rating: 0,
            photo_url: null,
          });
          addedCount++;
        } catch (error) {
          console.error('Error adding show:', error);
          failedCount++;
        }
      }

      if (addedCount > 0) toast.success(`Added ${addedCount} show${addedCount !== 1 ? 's' : ''}!`);
      if (failedCount > 0) toast.error(`Failed to add ${failedCount} show${failedCount !== 1 ? 's' : ''}`);

      return { success: addedCount > 0, addedCount, failedCount, addedShows };
    } catch (error) {
      console.error('Text import upload error:', error);
      toast.error("Failed to save shows");
      return { success: false, addedCount, failedCount: shows.length - addedCount, addedShows };
    } finally {
      setIsUploading(false);
    }
  };

  return { uploadShows, isUploading };
}
