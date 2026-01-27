import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PhotoSelectStep from "./bulk-upload/PhotoSelectStep";
import BulkReviewStep from "./bulk-upload/BulkReviewStep";
import BulkSuccessStep from "./bulk-upload/BulkSuccessStep";
import { PhotoOverlayEditor } from "./PhotoOverlayEditor";
import { PhotoWithExif, cleanupPhotoUrls } from "@/lib/exif-utils";
import { ReviewedShow } from "./bulk-upload/PhotoReviewCard";
import { useBulkShowUpload, AddedShowData } from "@/hooks/useBulkShowUpload";

interface BulkUploadFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToFeed?: () => void;
  onNavigateToRank?: () => void;
  onShareShow?: (show: AddedShowData) => void;
}

type Step = 'select' | 'review' | 'success' | 'editor';

const BulkUploadFlow = ({ open, onOpenChange, onNavigateToFeed, onNavigateToRank, onShareShow }: BulkUploadFlowProps) => {
  const [step, setStep] = useState<Step>('select');
  const [photos, setPhotos] = useState<PhotoWithExif[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const [addedShows, setAddedShows] = useState<AddedShowData[]>([]);
  const [editorShow, setEditorShow] = useState<AddedShowData | null>(null);
  const { uploadShows, isUploading } = useBulkShowUpload();

  const handleClose = () => {
    // Cleanup photo URLs
    cleanupPhotoUrls(photos);
    // Reset state
    setStep('select');
    setPhotos([]);
    setAddedCount(0);
    setAddedShows([]);
    setEditorShow(null);
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
      setAddedShows(result.addedShows);
      setStep('success');
    }
  };

  const handleAddMore = () => {
    // Cleanup current photos
    cleanupPhotoUrls(photos);
    setPhotos([]);
    setAddedShows([]);
    setEditorShow(null);
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
    } else if (step === 'editor') {
      setEditorShow(null);
      setStep('success');
    }
  };

  const handleOpenEditor = (show: AddedShowData) => {
    setEditorShow(show);
    setStep('editor');
  };

  const getTitle = () => {
    switch (step) {
      case 'select':
        return 'Add from Photos';
      case 'review':
        return 'Add Shows';
      case 'success':
        return 'Success!';
      case 'editor':
        return 'Create Share Image';
      default:
        return 'Add Shows';
    }
  };

  // Normalize show data for PhotoOverlayEditor
  const normalizedEditorShow = editorShow ? {
    id: editorShow.id,
    artists: editorShow.artists.map(a => ({
      name: a.name,
      is_headliner: 'isHeadliner' in a ? a.isHeadliner : ('is_headliner' in a ? (a as any).is_headliner : false),
    })),
    venue_name: editorShow.venue.name,
    show_date: editorShow.date,
    rating: editorShow.rating ?? 0,
    photo_url: editorShow.photo_url,
  } : null;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          {(step === 'review' || step === 'editor') && (
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
            addedShows={addedShows}
            onAddMore={handleAddMore}
            onDone={handleClose}
            onCreateReviewPhoto={handleOpenEditor}
            onRank={() => {
              handleClose();
              onNavigateToRank?.();
            }}
          />
        )}

        {step === 'editor' && normalizedEditorShow && (
          <PhotoOverlayEditor
            show={normalizedEditorShow}
            onClose={() => {
              setEditorShow(null);
              setStep('success');
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadFlow;
