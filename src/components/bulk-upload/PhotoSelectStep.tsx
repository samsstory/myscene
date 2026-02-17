import { useState, useRef } from "react";
import { Camera, ImagePlus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PhotoWithExif, processPhotosWithExif } from "@/lib/exif-utils";
interface PhotoSelectStepProps {
  onPhotosSelected: (photos: PhotoWithExif[]) => void;
  isProcessing: boolean;
  onAddManually?: () => void;
  onPasteList?: () => void;
}
const PhotoSelectStep = ({
  onPhotosSelected,
  isProcessing,
  onAddManually,
  onPasteList
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
      // Reset the input so same files can be selected again
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
  return <div className="space-y-6 pb-4">
      {/* Instructions */}
      <div className="text-center space-y-2 pt-2">
        <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <Camera className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-xl font-semibold">Add Multiple Shows At Once</h2>
        <p className="text-sm text-muted-foreground">
          Select 1, 5, or 50 — each photo becomes a show
        </p>
      </div>

      {/* Photo Grid */}
      {selectedPhotos.length > 0 && <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
          {selectedPhotos.map(photo => <div key={photo.id} className="relative aspect-square group">
              <img src={photo.previewUrl} alt="Selected photo" className="w-full h-full object-cover rounded-lg" />
              <button onClick={() => handleRemovePhoto(photo.id)} className="absolute top-1 right-1 h-6 w-6 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="h-4 w-4 text-white" />
              </button>
              {/* Date indicator */}
              {photo.exifData.hasExif ? <div className="absolute bottom-1 left-1 right-1 bg-black/60 rounded px-1 py-0.5 text-[10px] text-white truncate">
                  {photo.exifData.date?.toLocaleDateString()}
                </div> : <div className="absolute bottom-1 left-1 right-1 bg-amber-500/80 rounded px-1 py-0.5 text-[10px] text-white truncate text-center">
                  No date
                </div>}
            </div>)}
          
          {/* Add more button */}
          <button onClick={() => fileInputRef.current?.click()} disabled={processing} className="aspect-square rounded-lg border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-1 hover:border-primary hover:bg-primary/5 transition-colors">
            {processing ? <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /> : <>
                <ImagePlus className="h-6 w-6 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Add</span>
              </>}
          </button>
        </div>}

      {/* Initial add button */}
      {selectedPhotos.length === 0 && (
        <div className="space-y-4">
          <button 
            onClick={() => fileInputRef.current?.click()} 
            disabled={processing} 
            className="w-full h-48 rounded-xl border-2 border-dashed border-muted-foreground/30 flex flex-col items-center justify-center gap-3 hover:border-primary hover:bg-primary/5 transition-colors"
          >
            {processing ? (
              <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            ) : (
              <>
                <ImagePlus className="h-10 w-10 text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Tap to browse your photo library</span>
              </>
            )}
          </button>
          
          {/* Escape hatch for manual entry */}
          {onAddManually && (
            <button
              onClick={onAddManually}
              className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors py-2"
            >
              I don't have a photo
            </button>
          )}
          
          {/* Paste a list link */}
          {onPasteList && (
            <button
              onClick={onPasteList}
              className="w-full text-center text-sm text-muted-foreground hover:text-primary transition-colors py-1"
            >
              Paste a list instead
            </button>
          )}
        </div>
      )}

      {/* Hidden file input */}
      <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />

      {/* Continue button */}
      {selectedPhotos.length > 0 && <Button onClick={handleContinue} disabled={isProcessing} className="w-full" size="lg">
          {isProcessing ? <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Processing...
            </> : <>Continue with {selectedPhotos.length} photo{selectedPhotos.length !== 1 ? 's' : ''}</>}
        </Button>}
    </div>;
};
export default PhotoSelectStep;