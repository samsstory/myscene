import { useState, useEffect } from "react";
import { X, Download, Share, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const isIOS = () => {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
};

const isInStandaloneMode = () => {
  return window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as any).standalone === true;
};

const isMobile = () => {
  return /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

export default function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showBanner, setShowBanner] = useState(false);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (isInStandaloneMode() || !isMobile()) return;

    // Only show on /dashboard and after user has logged at least 1 show
    if (location.pathname !== "/dashboard") return;
    if (!localStorage.getItem("scene-first-show-logged")) return;

    const dismissed = localStorage.getItem("pwa-banner-dismissed");
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      // Show again after 3 days
      if (Date.now() - dismissedAt < 3 * 24 * 60 * 60 * 1000) return;
    }

    if (isIOS()) {
      // iOS doesn't support beforeinstallprompt — show after a short delay
      const timer = setTimeout(() => setShowBanner(true), 2000);
      return () => clearTimeout(timer);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowBanner(true);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") {
        setShowBanner(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS()) {
      setShowIOSInstructions(true);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    setShowIOSInstructions(false);
    localStorage.setItem("pwa-banner-dismissed", Date.now().toString());
  };

  const handleLearnMore = () => {
    handleDismiss();
    navigate("/install");
  };

  // Only render on /dashboard — never on landing, auth, etc.
  if (!showBanner || location.pathname !== "/dashboard") return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed bottom-4 left-3 right-3 z-50"
      >
        <div className="relative rounded-2xl border border-white/10 bg-card/95 backdrop-blur-xl shadow-[0_-4px_30px_hsl(var(--primary)/0.15)] p-4">
          <button
            onClick={handleDismiss}
            className="absolute top-3 right-3 p-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>

          {!showIOSInstructions ? (
            <div className="flex items-center gap-3">
              <div className="flex-shrink-0 w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Download className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0 pr-4">
                <p className="text-sm font-semibold text-foreground">Install SCENE</p>
                <p className="text-xs text-muted-foreground mt-0.5">Get the full app experience on your home screen</p>
              </div>
              <button
                onClick={handleInstall}
                className="flex-shrink-0 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors"
              >
                Install
              </button>
            </div>
          ) : (
            <div className="pr-6">
              <p className="text-sm font-semibold text-foreground mb-3">Install on iPhone</p>
              <div className="space-y-2.5">
                <div className="flex items-center gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Share className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tap the <span className="text-foreground font-medium">Share</span> button in Safari
                  </p>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Plus className="w-3.5 h-3.5 text-primary" />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Tap <span className="text-foreground font-medium">Add to Home Screen</span>
                  </p>
                </div>
              </div>
              <button
                onClick={handleLearnMore}
                className="mt-3 text-xs text-primary hover:underline"
              >
                View full instructions →
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
