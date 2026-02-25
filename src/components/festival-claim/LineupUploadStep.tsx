import { useState, useRef } from "react";
import { Camera, Loader2, AlertCircle, RotateCcw, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ExtractedLineup {
  event_name: string;
  year: number;
  date_start?: string | null;
  date_end?: string | null;
  venue_name?: string | null;
  venue_location?: string | null;
  artists: { name: string; day?: string | null; stage?: string | null; matched?: boolean }[];
}

interface LineupUploadStepProps {
  onExtracted: (data: ExtractedLineup, imagePreview: string) => void;
  onBack: () => void;
}

const LineupUploadStep = ({ onExtracted, onBack }: LineupUploadStepProps) => {
  const [preview, setPreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /** Resize image to max 1600px on longest side and convert to JPEG to stay under edge function limits */
  const compressImage = (file: File, maxDim = 1600, quality = 0.8): Promise<{ base64: string; mimeType: string }> =>
    new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          const ratio = Math.min(maxDim / width, maxDim / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d")!;
        ctx.drawImage(img, 0, 0, width, height);
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve({ base64: dataUrl.split(",")[1], mimeType: "image/jpeg" });
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });

  const handleFileSelect = async (file: File) => {
    setError(null);

    // Validate file
    if (!file.type.startsWith("image/")) {
      setError("Please upload an image file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("Image must be under 10 MB");
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onload = () => setPreview(reader.result as string);
    reader.readAsDataURL(file);

    // Compress and send
    setIsProcessing(true);
    try {
      const { base64, mimeType } = await compressImage(file);

      // Get auth token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        throw new Error("Please sign in to upload a lineup photo");
      }

      const resp = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-lineup-photo`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({
            image_base64: base64,
            mime_type: mimeType,
          }),
        }
      );

      const json = await resp.json();

      if (!resp.ok || !json.success) {
        throw new Error(json.error || "Failed to extract lineup");
      }

      const data = json.data as ExtractedLineup;

      if (!data.artists?.length) {
        throw new Error("No artists found in this image. Try a clearer photo of the lineup.");
      }

      toast.success(`Found ${data.artists.length} artists from ${data.event_name}`);
      onExtracted(data, preview || "");
    } catch (err: any) {
      console.error("Lineup OCR error:", err);
      setError(err.message || "Failed to read lineup. Try a clearer photo.");
    } finally {
      setIsProcessing(false);
    }
  };


  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleRetry = () => {
    setPreview(null);
    setError(null);
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Upload a photo of a festival lineup poster — we'll read every artist name.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFileSelect(file);
        }}
      />

      <AnimatePresence mode="wait">
        {!preview && !isProcessing && (
          <motion.button
            key="upload-zone"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="w-full aspect-[3/2] rounded-2xl border-2 border-dashed border-white/[0.12] bg-white/[0.03] flex flex-col items-center justify-center gap-3 transition-colors hover:border-primary/40 hover:bg-white/[0.05] cursor-pointer"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/15 flex items-center justify-center">
              <Camera className="h-6 w-6 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium text-foreground">Tap to upload lineup photo</p>
              <p className="text-xs text-muted-foreground mt-0.5">JPG, PNG, HEIC — max 10 MB</p>
            </div>
          </motion.button>
        )}

        {(preview || isProcessing) && (
          <motion.div
            key="preview"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative rounded-2xl overflow-hidden ring-1 ring-white/[0.08]"
          >
            {preview && (
              <img
                src={preview}
                alt="Lineup poster"
                className={`w-full aspect-[3/2] object-cover transition-all duration-500 ${isProcessing ? "blur-sm brightness-50" : ""}`}
              />
            )}

            {isProcessing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="w-14 h-14 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center ring-1 ring-white/[0.1]">
                  <Loader2 className="h-7 w-7 text-primary animate-spin" />
                </div>
                <p className="text-sm font-medium text-white" style={{ textShadow: "0 2px 8px rgba(0,0,0,0.6)" }}>
                  Reading lineup…
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Error state */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl bg-destructive/10 border border-destructive/20 p-3 flex items-start gap-2.5"
        >
          <AlertCircle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm text-destructive">{error}</p>
            <button
              type="button"
              onClick={handleRetry}
              className="text-xs text-primary mt-1.5 inline-flex items-center gap-1 hover:underline"
            >
              <RotateCcw className="h-3 w-3" /> Try another photo
            </button>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default LineupUploadStep;
