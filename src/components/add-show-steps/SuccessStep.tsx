import { useState, useEffect } from "react";
import { Camera, Instagram, Eye, Loader2, Smartphone } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { toast } from "sonner";
import { motion } from "framer-motion";
import PushNotificationInterstitial from "@/components/onboarding/PushNotificationInterstitial";
import {
  staggerContainer,
  fadeUp,
  fireConfetti,
  SuccessRing,
  ActionButton,
} from "@/components/success/SuccessPrimitives";


interface AddedShowData {
  id: string;
  artists: Array<{ name: string; isHeadliner: boolean; imageUrl?: string }>;
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
  const navigate = useNavigate();
  const [isUploading, setIsUploading] = useState(false);
  const [photoAdded, setPhotoAdded] = useState(false);
  const [showPwaNudge, setShowPwaNudge] = useState(false);
  const [showPushInterstitial, setShowPushInterstitial] = useState(false);

  const headliner = show.artists.find(a => a.isHeadliner)?.name || show.artists[0]?.name || "Show";
  const headlinerImage = show.artists.find(a => a.isHeadliner)?.imageUrl || show.artists[0]?.imageUrl;
  const formattedDate = format(new Date(show.date), "MMM d, yyyy");

  useEffect(() => {
    fireConfetti();

    const isFirstShow = !localStorage.getItem("scene-first-show-logged");
    localStorage.setItem("scene-first-show-logged", "true");

    const pushSeen = localStorage.getItem("scene-push-prompt-seen");
    if (isFirstShow && !pushSeen && "Notification" in window) {
      setShowPushInterstitial(true);
    }

    // Show PWA nudge on first show if not standalone and on mobile
    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as unknown as { standalone?: boolean }).standalone === true;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (!isStandalone && isMobile && isFirstShow) {
      setShowPwaNudge(true);
    }
  }, []);

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

  if (showPushInterstitial) {
    return <PushNotificationInterstitial onComplete={() => setShowPushInterstitial(false)} />;
  }

  return (
    <motion.div variants={staggerContainer} initial="hidden" animate="show" className="text-center space-y-6 py-4 relative">
      {/* ── Animated header ── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <SuccessRing />
        <motion.div variants={fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight" style={{ textShadow: "0 0 24px hsl(189 94% 55% / 0.25)" }}>
            Show Added!
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {headliner} @ {show.venue.name}
          </p>
          <p className="text-xs text-muted-foreground/60 mt-0.5">{formattedDate}</p>
        </motion.div>
      </motion.div>

      {/* ── Hero image ── */}
      <motion.div variants={fadeUp} className="rounded-2xl overflow-hidden ring-1 ring-white/[0.06]">
        {headlinerImage ? (
          <div className="relative aspect-[16/9] w-full">
            <img src={headlinerImage} alt={headliner} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          </div>
        ) : (
          <div className="aspect-[16/9] w-full flex items-center justify-center bg-white/[0.03]">
            <span className="text-5xl select-none" style={{ textShadow: "0 0 20px hsl(189 94% 55% / 0.4)" }}>✦</span>
          </div>
        )}
      </motion.div>

      {/* ── PWA Nudge ── */}
      {showPwaNudge && (
        <motion.button
          variants={fadeUp}
          onClick={() => navigate("/install")}
          className="w-full flex items-center gap-3 rounded-xl p-3 bg-primary/[0.06] border border-primary/30 text-left transition-colors hover:bg-primary/[0.10] active:scale-[0.98]"
        >
          <Smartphone className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm text-foreground">
            Save Scene to your home screen to track your next one
          </p>
        </motion.button>
      )}

      {/* ── Actions ── */}
      <motion.div variants={fadeUp} className="space-y-2.5 pt-1">
        {!photoAdded ? (
          <ActionButton
            onClick={handlePhotoClick}
            icon={isUploading ? Loader2 : Camera}
            label={isUploading ? "Uploading..." : "Add My Photo"}
            variant="primary"
            disabled={isUploading}
          />
        ) : (
          <ActionButton onClick={() => {}} icon={Camera} label="Photo Added! 📸" variant="secondary" />
        )}

        <ActionButton onClick={onShare} icon={Instagram} label="Share to Instagram" variant="secondary" />
        <ActionButton onClick={onViewDetails} icon={Eye} label="View Details" variant="tertiary" />
      </motion.div>

      {/* ── Footer ── */}
      <motion.div variants={fadeUp} className="pt-2">
        <button onClick={onDone} className="w-full flex items-center justify-center py-2.5 px-3 rounded-xl text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.04]">
          Done
        </button>
      </motion.div>
    </motion.div>
  );
};

export default SuccessStep;
