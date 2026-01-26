import { useState, useCallback, useEffect } from "react";
import { PhotoWithExif } from "@/lib/exif-utils";
import PhotoReviewCard, { ReviewedShow } from "./PhotoReviewCard";
import { Button } from "@/components/ui/button";
import { Loader2, CheckCircle2 } from "lucide-react";

interface BulkReviewStepProps {
  photos: PhotoWithExif[];
  onComplete: (shows: ReviewedShow[]) => void;
  onPhotoReplace: (photoId: string, newPhoto: PhotoWithExif) => void;
  onPhotoDelete: (photoId: string) => void;
  isSubmitting: boolean;
}

const BulkReviewStep = ({ photos, onComplete, onPhotoReplace, onPhotoDelete, isSubmitting }: BulkReviewStepProps) => {
  const [reviewedShows, setReviewedShows] = useState<Map<string, ReviewedShow>>(new Map());
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
      {/* Header */}
      <div className="text-center space-y-1">
        <h2 className="text-lg font-semibold">Review Your Shows</h2>
        <p className="text-sm text-muted-foreground">
          Add artist info for each photo. Venue is optional.
        </p>
      </div>

      {/* Progress indicator */}
      <div className="flex items-center justify-center gap-2 text-sm">
        <CheckCircle2 className={validShows.length > 0 ? "h-4 w-4 text-primary" : "h-4 w-4 text-muted-foreground"} />
        <span className={validShows.length > 0 ? "text-primary font-medium" : "text-muted-foreground"}>
          {validShows.length} of {photos.length} ready to add
        </span>
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
            onPhotoReplace={onPhotoReplace}
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
        disabled={validShows.length === 0 || isSubmitting}
        className="w-full"
        size="lg"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Adding shows...
          </>
        ) : (
          <>Add {validShows.length} show{validShows.length !== 1 ? 's' : ''}</>
        )}
      </Button>
    </div>
  );
};

export default BulkReviewStep;
