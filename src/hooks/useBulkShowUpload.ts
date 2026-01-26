import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ReviewedShow } from "@/components/bulk-upload/PhotoReviewCard";
import { toast } from "sonner";

export interface AddedShowData {
  id: string;
  artists: { name: string; isHeadliner: boolean }[];
  venue: { name: string; location: string };
  date: string;
  rating: number;
  photo_url: string | null;
  artistPerformance?: number | null;
  sound?: number | null;
  lighting?: number | null;
  crowd?: number | null;
  venueVibe?: number | null;
  notes?: string | null;
}

interface UploadResult {
  success: boolean;
  addedCount: number;
  failedCount: number;
  addedShows: AddedShowData[];
}

// Compress image before upload
async function compressImage(file: File, maxWidth = 1200, quality = 0.8): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      let { width, height } = img;
      
      if (width > maxWidth) {
        height = (height * maxWidth) / width;
        width = maxWidth;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      ctx?.drawImage(img, 0, 0, width, height);
      
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to compress image'));
          }
        },
        'image/jpeg',
        quality
      );
    };
    
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = URL.createObjectURL(file);
  });
}

export function useBulkShowUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });

  const uploadShows = async (shows: ReviewedShow[]): Promise<UploadResult> => {
    setIsUploading(true);
    setProgress({ current: 0, total: shows.length });

    let addedCount = 0;
    let failedCount = 0;
    const addedShows: AddedShowData[] = [];

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        throw new Error("Not authenticated");
      }
      const userId = session.user.id;

      for (let i = 0; i < shows.length; i++) {
        const show = shows[i];
        setProgress({ current: i + 1, total: shows.length });

        try {
          // 1. Handle venue creation/lookup
          let venueIdToUse: string | null = null;
          
          if (show.venue.trim()) {
            if (show.venueId && !show.venueId.startsWith('manual-')) {
              // Existing venue
              venueIdToUse = show.venueId;
            } else {
              // Create new venue
              const { data: newVenue, error: venueError } = await supabase
                .from('venues')
                .insert({
                  name: show.venue,
                  location: show.venueLocation || null,
                })
                .select('id')
                .single();

              if (!venueError && newVenue) {
                venueIdToUse = newVenue.id;
              }
            }
          }

          // 2. Compress and upload photo
          const compressedBlob = await compressImage(show.file);
          const fileName = `${userId}/${Date.now()}-${Math.random().toString(36).substr(2, 9)}.jpg`;
          
          const { error: uploadError } = await supabase.storage
            .from('show-photos')
            .upload(fileName, compressedBlob, {
              contentType: 'image/jpeg',
              upsert: false,
            });

          if (uploadError) {
            console.error('Photo upload error:', uploadError);
            throw new Error('Failed to upload photo');
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('show-photos')
            .getPublicUrl(fileName);

          // 3. Create show record - construct date based on precision
          let showDate: string;
          let dbDatePrecision: string;

          if (show.datePrecision === "exact" && show.date) {
            showDate = show.date.toISOString().split('T')[0];
            dbDatePrecision = "exact";
          } else if (show.datePrecision === "approximate" && show.selectedYear) {
            const month = show.selectedMonth || "01";
            showDate = `${show.selectedYear}-${month}-01`;
            dbDatePrecision = "approximate";
          } else if (show.datePrecision === "unknown" && show.selectedYear) {
            showDate = `${show.selectedYear}-01-01`;
            dbDatePrecision = "unknown";
          } else {
            // Fallback to today if nothing specified
            showDate = new Date().toISOString().split('T')[0];
            dbDatePrecision = "unknown";
          }
          
          const { data: newShow, error: showError } = await supabase
            .from('shows')
            .insert({
              user_id: userId,
              venue_name: show.venue || 'Unknown Venue',
              venue_location: show.venueLocation || null,
              venue_id: venueIdToUse,
              show_date: showDate,
              date_precision: dbDatePrecision,
              rating: null, // No default rating - use ELO system
              photo_url: publicUrl,
              // Optional ratings from bulk upload
              artist_performance: show.artistPerformance,
              sound: show.sound,
              lighting: show.lighting,
              crowd: show.crowd,
              venue_vibe: show.venueVibe,
              notes: show.notes || null,
            })
            .select('id')
            .single();

          if (showError) {
            throw showError;
          }

          // 4. Create artist records for all artists
          if (show.artists.length > 0) {
            const artistInserts = show.artists.map(artist => ({
              show_id: newShow.id,
              artist_name: artist.name,
              is_headliner: artist.isHeadliner,
            }));

            const { error: artistError } = await supabase
              .from('show_artists')
              .insert(artistInserts);

            if (artistError) {
              console.error('Artist insert error:', artistError);
            }
          }

          // 5. Update user_venues if venue exists
          if (venueIdToUse) {
            await supabase
              .from('user_venues')
              .upsert({
                user_id: userId,
                venue_id: venueIdToUse,
                show_count: 1,
                last_show_date: showDate,
              }, {
                onConflict: 'user_id,venue_id',
                ignoreDuplicates: false,
              });
          }

          // 6. Track added show data for success screen
          addedShows.push({
            id: newShow.id,
            artists: show.artists.map(a => ({ name: a.name, isHeadliner: a.isHeadliner })),
            venue: { name: show.venue || 'Unknown Venue', location: show.venueLocation || '' },
            date: showDate,
            rating: 3,
            photo_url: publicUrl,
            artistPerformance: show.artistPerformance,
            sound: show.sound,
            lighting: show.lighting,
            crowd: show.crowd,
            venueVibe: show.venueVibe,
            notes: show.notes,
          });

          addedCount++;
        } catch (error) {
          console.error('Error adding show:', error);
          failedCount++;
        }
      }

      if (addedCount > 0) {
        toast.success(`Added ${addedCount} show${addedCount !== 1 ? 's' : ''} to your collection!`);
      }
      
      if (failedCount > 0) {
        toast.error(`Failed to add ${failedCount} show${failedCount !== 1 ? 's' : ''}`);
      }

      return { success: addedCount > 0, addedCount, failedCount, addedShows };
    } catch (error) {
      console.error('Bulk upload error:', error);
      toast.error("Failed to upload shows");
      return { success: false, addedCount, failedCount: shows.length - addedCount, addedShows };
    } finally {
      setIsUploading(false);
      setProgress({ current: 0, total: 0 });
    }
  };

  return {
    uploadShows,
    isUploading,
    progress,
  };
}
