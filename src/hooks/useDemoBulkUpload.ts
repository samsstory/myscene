import { useState } from "react";
import { ReviewedShow } from "@/components/bulk-upload/PhotoReviewCard";
import { toast } from "sonner";
import { useDemoMode, DemoLocalShow } from "@/contexts/DemoContext";

export interface DemoAddedShowData {
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

interface DemoUploadResult {
  success: boolean;
  addedCount: number;
  failedCount: number;
  addedShows: DemoAddedShowData[];
}

export function useDemoBulkUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const { addDemoShows, getDemoShowCount } = useDemoMode();

  const uploadShows = async (shows: ReviewedShow[]): Promise<DemoUploadResult> => {
    setIsUploading(true);
    setProgress({ current: 0, total: shows.length });

    const addedShows: DemoAddedShowData[] = [];
    const demoLocalShows: DemoLocalShow[] = [];
    let failedCount = 0;

    // Check limit
    const currentCount = getDemoShowCount();
    const maxAllowed = 5;
    const slotsRemaining = maxAllowed - currentCount;

    if (slotsRemaining <= 0) {
      toast.error("Demo limit reached! Sign up to add unlimited shows.");
      setIsUploading(false);
      return { success: false, addedCount: 0, failedCount: shows.length, addedShows: [] };
    }

    const showsToProcess = shows.slice(0, slotsRemaining);
    if (showsToProcess.length < shows.length) {
      toast.info(`Only adding ${showsToProcess.length} of ${shows.length} shows (demo limit)`);
    }

    // Simulate processing with slight delay for realistic UX
    for (let i = 0; i < showsToProcess.length; i++) {
      const show = showsToProcess[i];
      setProgress({ current: i + 1, total: showsToProcess.length });

      try {
        // Small delay to feel authentic
        await new Promise(resolve => setTimeout(resolve, 150));

        // Generate local ID
        const localId = `demo-${crypto.randomUUID()}`;

        // Create blob URL from file (instead of uploading to Supabase)
        const photoUrl = URL.createObjectURL(show.file);

        // Construct date based on precision
        let showDate: string;
        if (show.datePrecision === "exact" && show.date) {
          showDate = show.date.toISOString().split('T')[0];
        } else if (show.datePrecision === "approximate" && show.selectedYear) {
          const month = show.selectedMonth || "01";
          showDate = `${show.selectedYear}-${month}-01`;
        } else if (show.datePrecision === "unknown" && show.selectedYear) {
          showDate = `${show.selectedYear}-01-01`;
        } else {
          showDate = new Date().toISOString().split('T')[0];
        }

        // Build show data for success screen
        const addedShowData: DemoAddedShowData = {
          id: localId,
          artists: show.artists.map(a => ({ name: a.name, isHeadliner: a.isHeadliner })),
          venue: { name: show.venue || 'Unknown Venue', location: show.venueLocation || '' },
          date: showDate,
          rating: 3, // Default rating
          photo_url: photoUrl,
          artistPerformance: show.artistPerformance,
          sound: show.sound,
          lighting: show.lighting,
          crowd: show.crowd,
          venueVibe: show.venueVibe,
          notes: show.notes,
        };
        addedShows.push(addedShowData);

        // Build show for context state
        const demoShow: DemoLocalShow = {
          id: localId,
          artists: show.artists.map(a => ({ name: a.name, isHeadliner: a.isHeadliner })),
          venue: { name: show.venue || 'Unknown Venue', location: show.venueLocation || '' },
          date: showDate,
          rating: 3,
          datePrecision: show.datePrecision,
          tags: [],
          notes: show.notes,
          venueId: show.venueId || null,
          photo_url: photoUrl,
          isLocalDemo: true,
        };
        demoLocalShows.push(demoShow);

      } catch (error) {
        console.error('Error processing demo show:', error);
        failedCount++;
      }
    }

    // Add all shows to context at once
    if (demoLocalShows.length > 0) {
      addDemoShows(demoLocalShows);
      toast.success(`Added ${demoLocalShows.length} show${demoLocalShows.length !== 1 ? 's' : ''} to your demo collection!`);
    }

    if (failedCount > 0) {
      toast.error(`Failed to process ${failedCount} show${failedCount !== 1 ? 's' : ''}`);
    }

    setIsUploading(false);
    setProgress({ current: 0, total: 0 });

    return {
      success: addedShows.length > 0,
      addedCount: addedShows.length,
      failedCount,
      addedShows,
    };
  };

  return {
    uploadShows,
    isUploading,
    progress,
  };
}
