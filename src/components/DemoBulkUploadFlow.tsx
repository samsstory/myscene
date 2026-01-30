import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import PhotoSelectStep from "./bulk-upload/PhotoSelectStep";
import BulkReviewStep from "./bulk-upload/BulkReviewStep";
import { PhotoOverlayEditor } from "./PhotoOverlayEditor";
import { PhotoWithExif, cleanupPhotoUrls } from "@/lib/exif-utils";
import { ReviewedShow } from "./bulk-upload/PhotoReviewCard";
import { useDemoBulkUpload, DemoAddedShowData } from "@/hooks/useDemoBulkUpload";
import { Badge } from "./ui/badge";

interface DemoBulkUploadFlowProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onNavigateToFeed?: () => void;
  onNavigateToRank?: () => void;
  onAddManually?: () => void;
}

type Step = 'select' | 'review' | 'success' | 'editor';

const DemoBulkUploadFlow = ({ open, onOpenChange, onNavigateToFeed, onNavigateToRank, onAddManually }: DemoBulkUploadFlowProps) => {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('select');
  const [photos, setPhotos] = useState<PhotoWithExif[]>([]);
  const [addedCount, setAddedCount] = useState(0);
  const [addedShows, setAddedShows] = useState<DemoAddedShowData[]>([]);
  const [editorShow, setEditorShow] = useState<DemoAddedShowData | null>(null);
  const { uploadShows, isUploading } = useDemoBulkUpload();

  const handleClose = () => {
    cleanupPhotoUrls(photos);
    setStep('select');
    setPhotos([]);
    setAddedCount(0);
    setAddedShows([]);
    setEditorShow(null);
    onOpenChange(false);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      onOpenChange(true);
      return;
    }
    handleClose();
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

  const handleOpenEditor = (show: DemoAddedShowData) => {
    setEditorShow(show);
    setStep('editor');
  };

  const handleSignUp = () => {
    handleClose();
    navigate('/auth');
  };

  const getTitle = () => {
    switch (step) {
      case 'select':
        return 'Add a Show';
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
      is_headliner: a.isHeadliner,
    })),
    venue_name: editorShow.venue.name,
    show_date: editorShow.date,
    rating: editorShow.rating ?? 0,
    photo_url: editorShow.photo_url,
  } : null;

  // SVG noise texture for tactile feel
  const noiseTexture = `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

  // Custom success step with sign-up CTA
  const renderDemoSuccessStep = () => {
    const firstShow = addedShows[0];
    const hasMultiple = addedShows.length > 1;

    return (
      <div className="text-center space-y-6 py-4">
        {/* Success header */}
        <div className="flex items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-2xl">🎉</span>
          </div>
          <h2 className="text-xl font-bold">
            {addedCount} show{addedCount !== 1 ? 's' : ''} added!
          </h2>
        </div>

        {/* Demo badge */}
        <Badge variant="secondary" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
          Demo Mode - Not Saved
        </Badge>

        {/* Single show preview */}
        {!hasMultiple && firstShow && (
          <div className="rounded-xl overflow-hidden bg-muted">
            {firstShow.photo_url ? (
              <div className="relative aspect-[4/3] w-full">
                <img 
                  src={firstShow.photo_url} 
                  alt="Show photo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-left text-white">
                  <p className="font-semibold text-lg leading-tight">
                    {firstShow.artists.map(a => a.name).join(', ')}
                  </p>
                  <p className="text-sm text-white/80">
                    {firstShow.venue.name}
                  </p>
                </div>
              </div>
            ) : (
              <div className="aspect-[4/3] w-full flex flex-col items-center justify-center gap-2 p-4 bg-muted/50">
                <span className="text-4xl">✦</span>
                <div className="text-center">
                  <p className="font-semibold">
                    {firstShow.artists.map(a => a.name).join(', ')}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {firstShow.venue.name}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Multiple shows grid */}
        {hasMultiple && (
          <div className="grid grid-cols-2 gap-3">
            {addedShows.map((show) => (
              <button 
                key={show.id}
                onClick={() => handleOpenEditor(show)}
                className="text-center space-y-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors w-full"
              >
                <div className="aspect-[4/5] rounded-lg overflow-hidden bg-muted">
                  {show.photo_url ? (
                    <img src={show.photo_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-muted">
                      <span className="text-2xl text-muted-foreground/60">✦</span>
                    </div>
                  )}
                </div>
                <p className="text-xs font-medium truncate">
                  {show.artists[0]?.name || "Show"}
                </p>
              </button>
            ))}
          </div>
        )}

        {/* Sign up CTA - Primary action */}
        <div className="space-y-3 pt-2">
          <Button 
            onClick={handleSignUp}
            className="w-full bg-gradient-to-r from-primary to-cyan-400 hover:opacity-90"
            size="lg"
          >
            <UserPlus className="h-4 w-4 mr-2" />
            Sign Up to Save Your Shows
          </Button>

          <p className="text-xs text-muted-foreground">
            Shows in demo mode won't be saved after you leave
          </p>
        </div>

        {/* Secondary actions */}
        <div className="flex gap-3 pt-2">
          <Button onClick={handleAddMore} variant="outline" className="flex-1">
            Add More
          </Button>
          <Button onClick={handleClose} variant="ghost" className="flex-1">
            Done
          </Button>
        </div>
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-md max-h-[85vh] overflow-y-auto pb-8 top-1/4 translate-y-0">
        <div className="relative">
          {/* Mesh gradient background */}
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
              {step === 'select' && (
                <Badge variant="outline" className="text-xs">Demo</Badge>
              )}
            </div>

            {/* Content based on step */}
            {step === 'select' && (
              <PhotoSelectStep
                onPhotosSelected={handlePhotosSelected}
                isProcessing={false}
                onAddManually={onAddManually}
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

            {step === 'success' && renderDemoSuccessStep()}

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

export default DemoBulkUploadFlow;
