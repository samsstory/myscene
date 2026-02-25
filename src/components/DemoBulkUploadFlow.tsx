import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ArrowLeft, UserPlus, Plus } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import PhotoSelectStep from "./bulk-upload/PhotoSelectStep";
import BulkReviewStep from "./bulk-upload/BulkReviewStep";
import { PhotoOverlayEditor } from "./PhotoOverlayEditor";
import { PhotoWithExif, cleanupPhotoUrls } from "@/lib/exif-utils";
import { ReviewedShow } from "./bulk-upload/PhotoReviewCard";
import { useDemoBulkUpload, DemoAddedShowData } from "@/hooks/useDemoBulkUpload";
import { Badge } from "./ui/badge";
import {
  staggerContainer,
  fadeUp,
  fireConfetti,
  SuccessRing,
  ActionButton,
  avatarPop,
} from "@/components/success/SuccessPrimitives";

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
      fireConfetti();
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
      <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-6 py-4 relative">
        {/* ── Animated header ── */}
        <motion.div variants={fadeUp} className="space-y-3">
          <SuccessRing />
          <motion.div variants={fadeUp}>
            <h2 className="text-2xl font-bold tracking-tight" style={{ textShadow: "0 0 24px hsl(189 94% 55% / 0.25)" }}>
              {addedCount} show{addedCount !== 1 ? "s" : ""} added!
            </h2>
          </motion.div>
        </motion.div>

        <motion.div variants={fadeUp}>
          <Badge variant="secondary" className="bg-amber-500/20 text-amber-200 border-amber-500/30">
            Demo Mode - Not Saved
          </Badge>
        </motion.div>

        {/* ── Single show hero ── */}
        {!hasMultiple && firstShow && (
          <motion.div variants={fadeUp} className="rounded-2xl overflow-hidden ring-1 ring-white/[0.06]">
            {firstShow.photo_url ? (
              <div className="relative aspect-[4/3] w-full">
                <img src={firstShow.photo_url} alt="Show photo" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                <div className="absolute bottom-4 left-4 right-4 text-left text-white">
                  <p className="font-bold text-lg leading-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
                    {firstShow.artists.map(a => a.name).join(", ")}
                  </p>
                  <p className="text-sm text-white/75 mt-0.5">{firstShow.venue.name}</p>
                </div>
              </div>
            ) : (
              <div className="aspect-[4/3] w-full flex flex-col items-center justify-center gap-3 p-4 bg-white/[0.03]">
                <span className="text-5xl select-none" style={{ textShadow: "0 0 20px hsl(189 94% 55% / 0.4)" }}>✦</span>
                <div className="text-center">
                  <p className="font-bold text-lg">{firstShow.artists.map(a => a.name).join(", ")}</p>
                  <p className="text-sm text-muted-foreground">{firstShow.venue.name}</p>
                </div>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Multi show grid ── */}
        {hasMultiple && (
          <motion.div variants={fadeUp} className="space-y-2">
            <motion.div variants={staggerContainer} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
              {addedShows.map((show, i) => (
                <motion.button
                  key={show.id}
                  variants={avatarPop(i)}
                  onClick={() => handleOpenEditor(show)}
                  className="text-center space-y-1.5 p-2 rounded-xl hover:bg-white/[0.04] transition-colors w-full group"
                >
                  <div className="aspect-[4/5] rounded-xl overflow-hidden bg-muted ring-1 ring-white/[0.06] group-hover:ring-primary/30 transition-all duration-300">
                    {show.photo_url ? (
                      <img src={show.photo_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-white/[0.03]">
                        <span className="text-2xl text-muted-foreground/40 select-none" style={{ textShadow: "0 0 12px hsl(189 94% 55% / 0.3)" }}>✦</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs font-medium truncate text-foreground/80">
                    {show.artists[0]?.name || "Show"}
                  </p>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* ── Actions ── */}
        <motion.div variants={fadeUp} className="space-y-2.5 pt-1">
          <ActionButton onClick={handleSignUp} icon={UserPlus} label="Sign Up to Save Your Shows" variant="primary" />
          <p className="text-xs text-muted-foreground">
            Shows in demo mode won't be saved after you leave
          </p>
        </motion.div>

        <motion.div variants={fadeUp} className="flex gap-2 pt-2">
          <button onClick={handleAddMore} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.04]">
            <Plus className="h-3.5 w-3.5" />
            Add More
          </button>
          <button onClick={handleClose} className="flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.04]">
            Done
          </button>
        </motion.div>
      </motion.div>
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
