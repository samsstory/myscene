import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PhotoSelectStep from "./bulk-upload/PhotoSelectStep";
import BulkReviewStep from "./bulk-upload/BulkReviewStep";
import BulkSuccessStep from "./bulk-upload/BulkSuccessStep";
import { PhotoWithExif, cleanupPhotoUrls } from "@/lib/exif-utils";
import { ReviewedShow } from "./bulk-upload/PhotoReviewCard";
import { useBulkShowUpload } from "@/hooks/useBulkShowUpload";

interface BulkUploadFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToFeed?: () => void;
  onNavigateToRank?: () => void;
}

type Step = 'select' | 'review' | 'success';

const BulkUploadFlow = ({ open, onOpenChange, onNavigateToFeed, onNavigateToRank }: BulkUploadFlowProps) => {
  const [step, setStep] = useState<Step>('select');
  const [photos, setPhotos] = useState<PhotoWithExif[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const { uploadShows, isUploading } = useBulkShowUpload();

  const handleClose = () => {
    // Cleanup photo URLs
    cleanupPhotoUrls(photos);
    // Reset state
    setStep('select');
    setPhotos([]);
    setAddedCount(0);
    onOpenChange(false);
  };

  const handlePhotosSelected = (selectedPhotos: PhotoWithExif[]) => {
    setPhotos(selectedPhotos);
    setStep('review');
  };

  const handleReviewComplete = async (shows: ReviewedShow[]) => {
    const result = await uploadShows(shows);
    if (result.success) {
      setAddedCount(result.addedCount);
      setStep('success');
    }
  };

  const handleAddMore = () => {
    // Cleanup current photos
    cleanupPhotoUrls(photos);
    setPhotos([]);
    setStep('select');
  };

  const handlePhotoReplace = (photoId: string, newPhoto: PhotoWithExif) => {
    setPhotos(prev => prev.map(p => p.id === photoId ? newPhoto : p));
  };

  const handlePhotoDelete = (photoId: string) => {
    setPhotos(prev => {
      const photoToDelete = prev.find(p => p.id === photoId);
      if (photoToDelete) {
        URL.revokeObjectURL(photoToDelete.previewUrl);
      }
      const remaining = prev.filter(p => p.id !== photoId);
      
      // If no photos left, go back to select step
      if (remaining.length === 0) {
        setStep('select');
      }
      
      return remaining;
    });
  };

  const handleBack = () => {
    if (step === 'review') {
      setStep('select');
    }
  };

  const getTitle = () => {
    switch (step) {
      case 'select':
        return 'Add from Photos';
      case 'review':
        return 'Add Shows';
      case 'success':
        return 'Success!';
      default:
        return 'Add Shows';
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {step === 'review' && (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <h1 className="text-lg font-semibold flex-1">{getTitle()}</h1>
        </div>

        {/* Content based on step */}
        {step === 'select' && (
          <PhotoSelectStep
            onPhotosSelected={handlePhotosSelected}
            isProcessing={false}
          />
        )}

        {step === 'review' && (
          <BulkReviewStep
            photos={photos}
            onComplete={handleReviewComplete}
            onPhotoReplace={handlePhotoReplace}
            onPhotoDelete={handlePhotoDelete}
            onPhotosUpdate={setPhotos}
            isSubmitting={isUploading}
          />
        )}

        {step === 'success' && (
          <BulkSuccessStep
            addedCount={addedCount}
            onAddMore={handleAddMore}
            onDone={handleClose}
            onViewFeed={() => {
              handleClose();
              onNavigateToFeed?.();
            }}
            onRank={() => {
              handleClose();
              onNavigateToRank?.();
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadFlow;
