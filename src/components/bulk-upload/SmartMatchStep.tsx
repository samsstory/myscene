import { useEffect, useState } from "react";
import { MapPin, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PhotoWithExif, VenueSuggestion } from "@/lib/exif-utils";
import { useVenueFromLocation } from "@/hooks/useVenueFromLocation";
import { format } from "date-fns";

interface SmartMatchStepProps {
  photo: PhotoWithExif;
  onConfirm: (venue: VenueSuggestion) => void;
  onReject: () => void;
}

function extractCity(address: string): string | null {
  const parts = address.split(",").map((s) => s.trim());
  if (parts.length >= 2) return parts[parts.length - 2];
  return parts[0] || null;
}

const SmartMatchStep = ({ photo, onConfirm, onReject }: SmartMatchStepProps) => {
  const { matchVenue } = useVenueFromLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [venue, setVenue] = useState<VenueSuggestion | null>(null);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (!photo.exifData.gps) {
        if (!cancelled) onReject();
        return;
      }
      setIsLoading(true);
      try {
        const result = await matchVenue(
          photo.exifData.gps.latitude,
          photo.exifData.gps.longitude
        );
        if (cancelled) return;
        if (result.primaryVenue) {
          setVenue(result.primaryVenue);
          setIsLoading(false);
        } else {
          onReject();
        }
      } catch {
        if (!cancelled) onReject();
      }
    };
    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dateLabel = photo.exifData.date
    ? format(photo.exifData.date, "MMM d, yyyy")
    : null;

  const city = venue ? extractCity(venue.address) : null;

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="w-full aspect-[4/3] rounded-2xl" />
        <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5 space-y-3">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-11 w-full rounded-xl mt-2" />
        </div>
      </div>
    );
  }

  if (!venue) return null;

  return (
    <div className="space-y-4">
      {/* Photo */}
      <div className="rounded-2xl overflow-hidden shadow-lg">
        <img
          src={photo.previewUrl}
          alt="Your photo"
          className="w-full object-cover max-h-[45vh]"
        />
      </div>

      {/* Suggestion card */}
      <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl p-5 space-y-4">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-white/50 text-sm">
            <MapPin className="h-3.5 w-3.5" />
            <span>Was this at</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {venue.name}
          </h2>
          {(dateLabel || city) && (
            <p className="text-sm text-white/40">
              {[dateLabel, city].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <Button
          onClick={() => onConfirm(venue)}
          className="w-full h-11 rounded-xl font-semibold text-white bg-gradient-to-br from-primary via-primary to-[hsl(250,80%,60%)] shadow-[0_0_20px_hsl(189_94%_55%/0.3)] hover:shadow-[0_0_30px_hsl(189_94%_55%/0.45)] transition-all hover:scale-[1.02] active:scale-95 border border-white/10"
        >
          Yes, that's right
        </Button>

        <button
          onClick={onReject}
          className="w-full text-sm text-white/40 hover:text-white/60 transition-colors py-1"
        >
          No, let me search…
        </button>
      </div>
    </div>
  );
};

export default SmartMatchStep;
