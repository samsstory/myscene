import { useState, useEffect } from "react";
import { CheckCircle2, Camera, Instagram, Eye, Loader2, Download } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface AddedShowData {
  id: string;
  artists: Array<{ name: string; isHeadliner: boolean }>;
  venue: { name: string; location: string };
  date: string;
  rating?: number | null;
}

interface SuccessStepProps {
  show: AddedShowData;
  onAddPhoto: (file: File) => Promise<void>;
  onShare: () => void;
  onViewDetails: () => void;
  onDone: () => void;
}

const SuccessStep = ({ show, onAddPhoto, onShare, onViewDetails, onDone }: SuccessStepProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [photoAdded, setPhotoAdded] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallCTA, setShowInstallCTA] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);

  useEffect(() => {
    const isFirstShow = !localStorage.getItem("scene-first-show-logged");
    localStorage.setItem("scene-first-show-logged", "true");

    // TEMP: bypass checks for preview testing
    // if (!isFirstShow) return;
    // const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    // const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    // if (isStandalone || !isMobile) return;

    setShowInstallCTA(true);
    const handler = (e: Event) => { e.preventDefault(); setDeferredPrompt(e as BeforeInstallPromptEvent); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShowInstallCTA(false);
      setDeferredPrompt(null);
    } else {
      setInstallDismissed(true);
    }
  };

  const headliner = show.artists.find(a => a.isHeadliner)?.name || show.artists[0]?.name || "Show";
  const formattedDate = format(new Date(show.date), "MMM d, yyyy");

  const handlePhotoClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsUploading(true);
        try {
          await onAddPhoto(file);
          setPhotoAdded(true);
          toast.success("Photo added!");
        } catch (error) {
          console.error("Error uploading photo:", error);
          toast.error("Failed to upload photo");
        } finally {
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  return (
    <div className="text-center space-y-6 py-4">
      {/* Success icon */}
      <div className="relative inline-block">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Show Added!</h2>
        <p className="text-muted-foreground text-sm">
          {headliner} @ {show.venue.name}
        </p>
        <p className="text-muted-foreground text-xs">{formattedDate}</p>
      </div>

      {/* Inline Install CTA — first show only */}
      {showInstallCTA && !installDismissed && (
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-sm p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold">Get SCENE on your home screen</p>
              <p className="text-xs text-muted-foreground">Full app experience, one tap away</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleInstall} className="flex-1 py-2 px-3 rounded-xl bg-white/[0.06] backdrop-blur-sm border border-white/[0.12] text-sm font-medium text-foreground transition-all duration-200 hover:bg-white/[0.10] hover:border-primary/30 hover:shadow-[0_0_16px_hsl(var(--primary)/0.15)] active:scale-[0.98]">
              Install
            </button>
            <button onClick={() => setInstallDismissed(true)} className="py-2 px-3 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.04]">
              Later
            </button>
          </div>
        </div>
      )}

      {/* Action cards */}
      <div className="space-y-2.5 pt-2">
        <button 
          className={`w-full flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] backdrop-blur-sm border transition-all duration-200 active:scale-[0.98] ${photoAdded ? 'border-primary/30 shadow-[0_0_16px_hsl(var(--primary)/0.15)]' : 'border-white/[0.08] hover:bg-white/[0.08] hover:border-white/[0.15]'}`}
          onClick={!isUploading && !photoAdded ? handlePhotoClick : undefined}
        >
          <div className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
            {isUploading ? (
              <Loader2 className="h-5 w-5 text-primary animate-spin" />
            ) : (
              <Camera className="h-5 w-5 text-primary" />
            )}
          </div>
          <div className="text-left flex-1">
            <div className="font-medium text-sm">
              {photoAdded ? "Photo Added!" : "Add a Photo"}
            </div>
            <div className="text-xs text-muted-foreground">
              {photoAdded ? "Looking good 📸" : "Capture the memory"}
            </div>
          </div>
          {photoAdded && <CheckCircle2 className="h-5 w-5 text-primary" />}
        </button>

        <button 
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] transition-all duration-200 hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-[0.98]"
          onClick={onShare}
        >
          <div className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
            <Instagram className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <div className="font-medium text-sm">Share to Instagram</div>
            <div className="text-xs text-muted-foreground">Create a story or post</div>
          </div>
        </button>

        <button 
          className="w-full flex items-center gap-3 p-4 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] transition-all duration-200 hover:bg-white/[0.08] hover:border-white/[0.15] active:scale-[0.98]"
          onClick={onViewDetails}
        >
          <div className="h-10 w-10 rounded-full bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
            <Eye className="h-5 w-5 text-primary" />
          </div>
          <div className="text-left">
            <div className="font-medium text-sm">View Details</div>
            <div className="text-xs text-muted-foreground">See full show breakdown</div>
          </div>
        </button>
      </div>

      {/* Done button */}
      <button 
        onClick={onDone} 
        className="w-full py-3 px-4 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] text-sm font-medium text-muted-foreground transition-all duration-200 hover:bg-white/[0.08] hover:border-white/[0.15] hover:text-foreground active:scale-[0.98] mt-4"
      >
        Done
      </button>
    </div>
  );
};

export default SuccessStep;
