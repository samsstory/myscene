import { useState, useCallback, useEffect } from "react";
import { PhotoWithExif } from "@/lib/exif-utils";
import PhotoReviewCard, { ReviewedShow } from "./PhotoReviewCard";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useVenueFromLocation } from "@/hooks/useVenueFromLocation";

interface BulkReviewStepProps {
  photos: PhotoWithExif[];
  onComplete: (shows: ReviewedShow[]) => void;
  onPhotoReplace: (photoId: string, newPhoto: PhotoWithExif) => void;
  onPhotoDelete: (photoId: string) => void;
  onPhotosUpdate: (photos: PhotoWithExif[]) => void;
  isSubmitting: boolean;
}

const BulkReviewStep = ({ 
  photos, 
  onComplete, 
  onPhotoReplace, 
  onPhotoDelete, 
  onPhotosUpdate,
  isSubmitting 
}: BulkReviewStepProps) => {
  const [reviewedShows, setReviewedShows] = useState<Map<string, ReviewedShow>>(new Map());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const { matchVenuesForPhotos, isMatching } = useVenueFromLocation();

  // Auto-match venues on mount for photos with GPS data
  useEffect(() => {
    const photosNeedingMatch = photos.filter(
      p => p.exifData.gps && !p.venueMatchStatus
    );

    if (photosNeedingMatch.length > 0) {
      // Mark as pending
      const pendingPhotos = photos.map(p => ({
        ...p,
        venueMatchStatus: p.exifData.gps && !p.venueMatchStatus 
          ? 'pending' as const 
          : p.venueMatchStatus
      }));
      onPhotosUpdate(pendingPhotos);

      // Perform matching
      matchVenuesForPhotos(photos).then(updatedPhotos => {
        onPhotosUpdate(updatedPhotos);
      });
    }
  }, []); // Only run on mount

  // Auto-expand the first incomplete card on mount or when photos change
  useEffect(() => {
    if (photos.length > 0 && !expandedId) {
      const firstIncomplete = photos.find(p => {
        const reviewed = reviewedShows.get(p.id);
        return !reviewed?.isValid;
      });
      setExpandedId(firstIncomplete?.id || photos[0].id);
    }
  }, [photos]);

  // Handle photo replacement - trigger venue matching for the new photo
  const handlePhotoReplace = useCallback(async (photoId: string, newPhoto: PhotoWithExif) => {
    onPhotoReplace(photoId, newPhoto);
    
    // If new photo has GPS, match venue
    if (newPhoto.exifData.gps) {
      const [matchedPhoto] = await matchVenuesForPhotos([newPhoto]);
      onPhotoReplace(photoId, matchedPhoto);
    }
  }, [onPhotoReplace, matchVenuesForPhotos]);

  const handleUpdate = useCallback((data: ReviewedShow) => {
    setReviewedShows(prev => {
      const next = new Map(prev);
      next.set(data.photoId, data);
      return next;
    });
  }, []);

  const handleToggle = (photoId: string) => {
    setExpandedId(prev => prev === photoId ? null : photoId);
  };

  const validShows = Array.from(reviewedShows.values()).filter(show => show.isValid);

  const handleAddAll = () => {
    onComplete(validShows);
  };

  return (
    <div className="space-y-4">
      {/* Instruction + Progress */}
      <div className="text-center space-y-2">
        <p className="text-sm text-muted-foreground">
          {isMatching 
            ? "Finding venues from photo locations..."
            : "Add artist for each photo. Venue and date are optional."
          }
        </p>
        <p className={cn(
          "text-sm font-medium",
          validShows.length > 0 ? "text-primary" : "text-muted-foreground"
        )}>
          {validShows.length} of {photos.length} ready
        </p>
      </div>

      {/* Review cards */}
      <div className="space-y-2 max-h-[60vh] overflow-y-auto pr-1">
        {photos.map((photo, index) => (
          <PhotoReviewCard
            key={photo.id}
            photo={photo}
            index={index}
            total={photos.length}
            onUpdate={handleUpdate}
            onPhotoReplace={handlePhotoReplace}
            onDelete={onPhotoDelete}
            initialData={reviewedShows.get(photo.id)}
            isExpanded={expandedId === photo.id}
            onToggle={() => handleToggle(photo.id)}
          />
        ))}
      </div>

      {/* Submit button */}
      <Button
        onClick={handleAddAll}
        disabled={validShows.length === 0 || isSubmitting || isMatching}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Adding shows...
          </>
        ) : isMatching ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Matching venues...
          </>
        ) : (
          <>Add {validShows.length} show{validShows.length !== 1 ? 's' : ''}</>
        )}
      </Button>
    </div>
  );
};

export default BulkReviewStep;
