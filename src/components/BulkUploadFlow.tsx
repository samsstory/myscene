import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import PhotoSelectStep from "./bulk-upload/PhotoSelectStep";
import BulkReviewStep from "./bulk-upload/BulkReviewStep";
import BulkSuccessStep from "./bulk-upload/BulkSuccessStep";
import SmartMatchStep from "./bulk-upload/SmartMatchStep";
import { PhotoOverlayEditor } from "./PhotoOverlayEditor";
import { PhotoWithExif, VenueSuggestion, cleanupPhotoUrls } from "@/lib/exif-utils";
import { ReviewedShow } from "./bulk-upload/PhotoReviewCard";
import { useBulkShowUpload, AddedShowData } from "@/hooks/useBulkShowUpload";

interface BulkUploadFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToFeed?: () => void;
  onNavigateToRank?: () => void;
  onShareShow?: (show: AddedShowData) => void;
  onAddManually?: () => void;
}

type Step = 'select' | 'smart-match' | 'review' | 'success' | 'editor';

const BulkUploadFlow = ({ open, onOpenChange, onNavigateToFeed, onNavigateToRank, onShareShow, onAddManually }: BulkUploadFlowProps) => {
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

  const handleDialogOpenChange = (nextOpen: boolean) => {
    // Allow the parent to open the dialog; only run cleanup when closing.
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    handleClose();
  };

  const handlePhotosSelected = (selectedPhotos: PhotoWithExif[]) => {
    setPhotos(selectedPhotos);
    // Single photo with GPS → smart match step
    if (selectedPhotos.length === 1 && selectedPhotos[0].exifData.gps) {
      setStep('smart-match');
    } else {
      setStep('review');
    }
  };

  const handleSmartMatchConfirm = (venue: VenueSuggestion) => {
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        suggestedVenue: venue,
        venueMatchStatus: 'found' as const,
      }))
    );
    setStep('review');
  };

  const handleSmartMatchReject = () => {
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        suggestedVenue: undefined,
        alternativeVenues: undefined,
        venueMatchStatus: 'not_found' as const,
      }))
    );
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
    if (step === 'smart-match') {
      setStep('select');
    } else if (step === 'review') {
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
        return 'Add a Show';
      case 'smart-match':
        return 'We Found It';
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

  const handleAddManually = () => {
    handleClose();
    onAddManually?.();
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

  // SVG noise texture for tactile feel
  const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto pb-8 top-1/4 translate-y-0" aria-describedby={undefined}>
        <div className="relative min-h-[100px]">
          {/* Mesh gradient background - Scene aesthetic */}
          <div className="absolute inset-0 overflow-hidden rounded-lg pointer-events-none">
            <div 
              className="absolute inset-0 animate-pulse-glow"
              style={{ background: "radial-gradient(ellipse at 20% 10%, hsl(189 94% 55% / 0.06) 0%, transparent 50%)" }} 
            />
            <div 
              className="absolute inset-0"
              style={{ background: "radial-gradient(ellipse at 80% 90%, hsl(17 88% 60% / 0.06) 0%, transparent 50%)" }} 
            />
            <div 
              className="absolute inset-0 opacity-[0.03]"
              style={{ backgroundImage: noiseTexture }} 
            />
          </div>
        <div className="relative z-10">
          {/* Header */}
          <div className="flex items-center gap-3 mb-4">
            {(step === 'smart-match' || step === 'review' || step === 'editor') && (
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
            onAddManually={onAddManually ? handleAddManually : undefined}
          />
        )}

        {step === 'smart-match' && photos.length === 1 && (
          <SmartMatchStep
            photo={photos[0]}
            onConfirm={handleSmartMatchConfirm}
            onReject={handleSmartMatchReject}
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
        </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BulkUploadFlow;
