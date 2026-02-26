import { useState, useRef } from "react";
import { Camera, ImagePlus, X, Loader2, Tent, ChevronRight, ClipboardList, Search, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoWithExif, processPhotosWithExif } from "@/lib/exif-utils";
import { motion } from "framer-motion";

interface PhotoSelectStepProps {
  onPhotosSelected: (photos: PhotoWithExif[]) => void;
  isProcessing: boolean;
  onAddManually?: () => void;
  onPasteList?: () => void;
  onFromLineup?: () => void;
  onEmailImport?: () => void;
}

const PhotoSelectStep = ({
  onPhotosSelected,
  isProcessing,
  onAddManually,
  onPasteList,
  onFromLineup,
  onEmailImport,
}: PhotoSelectStepProps) => {
  const [selectedPhotos, setSelectedPhotos] = useState<PhotoWithExif[]>([]);
  const [processing, setProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    setProcessing(true);
    try {
      const filesArray = Array.from(files);
      const processedPhotos = await processPhotosWithExif(filesArray);
      setSelectedPhotos(prev => [...prev, ...processedPhotos]);
    } catch (error) {
      console.error('Error processing photos:', error);
    } finally {
      setProcessing(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = (photoId: string) => {
    setSelectedPhotos(prev => {
      const photo = prev.find(p => p.id === photoId);
      if (photo) {
        URL.revokeObjectURL(photo.previewUrl);
      }
      return prev.filter(p => p.id !== photoId);
    });
  };

  const handleContinue = () => {
    onPhotosSelected(selectedPhotos);
  };

  return (
    <div className="space-y-5 pb-4">
      {/* Photo Grid (when photos are selected) */}
      {selectedPhotos.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {selectedPhotos.map(photo => (
            <div key={photo.id} className="relative aspect-square group">
              <img src={photo.previewUrl} alt="Selected photo" className="w-full h-full object-cover rounded-lg" />
              <button onClick={() => handleRemovePhoto(photo.id)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-4 w-4 text-white" />
              </button>
              {photo.exifData.hasExif ? (
                <div className="absolute bottom-1 left-1 right-1 bg-black/60 rounded px-1 py-0.5 text-[10px] text-white truncate">
                  {photo.exifData.date?.toLocaleDateString()}
                </div>
              ) : (
                <div className="absolute bottom-1 left-1 right-1 bg-amber-500/80 rounded px-1 py-0.5 text-[10px] text-white truncate text-center">
                  No date
                </div>
              )}
            </div>
          ))}
          <button onClick={() => fileInputRef.current?.click()} disabled={processing} className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors">
            {processing ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : (
              <>
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add</span>
              </>
            )}
          </button>
        </div>
      )}

      {/* Unified Method Picker (initial state) */}
      {selectedPhotos.length === 0 && (
        <div className="space-y-5">
          {/* Photo Upload Box */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={processing}
            className="w-full h-48 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            {processing ? (
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            ) : (
              <>
                <Camera className="h-10 w-10 text-muted-foreground" />
                <div className="space-y-1 px-6">
                  <span className="text-sm text-muted-foreground block">Tap to browse your photo library</span>
                  <span className="text-xs text-muted-foreground/70 block">We'll grab date and location from metadata, you add the artist</span>
                </div>
              </>
            )}
          </button>

          {/* "or" divider */}
          <div className="relative flex items-center">
            <div className="flex-1 border-t border-white/10" />
            <span className="px-3 text-xs text-white/30">or</span>
            <div className="flex-1 border-t border-white/10" />
          </div>

          {/* Add from Lineup card */}
          {onFromLineup && (
            <motion.button
              onClick={onFromLineup}
              whileTap={{ scale: 0.97 }}
              className="w-full min-h-[120px] rounded-xl bg-white/[0.05] border border-white/[0.09] backdrop-blur-sm p-4 flex items-center gap-4 text-left hover:bg-white/[0.08] transition-colors"
            >
              <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-cyan-500/80 to-purple-500/80 flex items-center justify-center flex-shrink-0">
                <Tent className="h-6 w-6 text-white" />
              </div>
              <div className="flex-1 min-w-0 space-y-1">
                <span className="text-lg font-semibold text-foreground block">Add from Lineup</span>
                <span className="text-sm text-muted-foreground/70 block leading-snug">
                  Upload a festival poster or search our database — tap the artists you saw to add them all at once
                </span>
              </div>
              <ChevronRight className="h-5 w-5 text-muted-foreground/40 flex-shrink-0" />
            </motion.button>
          )}

          {/* "Other ways to add" divider */}
          {(onPasteList || onAddManually) && (
            <div className="border-t border-white/10 pt-4 mt-1">
              <span className="text-xs text-white/40 uppercase tracking-wider">Other ways to add</span>
              <div className="mt-3 space-y-1">
                {onPasteList && (
                  <button
                    onClick={onPasteList}
                    className="w-full flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors py-2"
                  >
                    <ClipboardList className="h-4 w-4 flex-shrink-0" />
                    Paste a list from Notes
                  </button>
                )}
                {onAddManually && (
                  <button
                    onClick={onAddManually}
                    className="w-full flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors py-2"
                  >
                    <Search className="h-4 w-4 flex-shrink-0" />
                    Search manually
                  </button>
                )}
                {onEmailImport ? (
                  <button
                    onClick={onEmailImport}
                    className="w-full flex items-center gap-3 text-sm text-muted-foreground hover:text-primary transition-colors py-2"
                  >
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    Find in My Email
                  </button>
                ) : (
                  <button
                    disabled
                    className="w-full flex items-center gap-3 text-sm text-muted-foreground/40 py-2 cursor-not-allowed"
                  >
                    <Mail className="h-4 w-4 flex-shrink-0" />
                    Find in My Email
                    <span className="ml-auto text-[10px] uppercase tracking-wider font-semibold bg-white/[0.08] text-muted-foreground/50 px-1.5 py-0.5 rounded-full">
                      Coming Soon
                    </span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />

      {/* Continue button */}
      {selectedPhotos.length > 0 && (
        <Button onClick={handleContinue} disabled={isProcessing} className="w-full" size="lg">
          {isProcessing ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </>
          ) : (
            <>Continue with {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''}</>
          )}
        </Button>
      )}
    </div>
  );
};

export default PhotoSelectStep;
