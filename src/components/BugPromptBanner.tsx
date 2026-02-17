import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BugPromptBannerProps {
  visible: boolean;
  message: string;
  onReport: () => void;
  onDismiss: () => void;
}

const AUTO_DISMISS_MS = 15000;

export default function BugPromptBanner({ visible, message, onReport, onDismiss }: BugPromptBannerProps) {
  const timerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    if (visible) {
      timerRef.current = setTimeout(onDismiss, AUTO_DISMISS_MS);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [visible, onDismiss]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="fixed bottom-28 left-4 right-4 z-[9999] mx-auto max-w-md"
        >
          <div className="backdrop-blur-xl bg-card/90 border border-border rounded-2xl px-4 py-3 shadow-2xl flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-400 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground leading-snug">{message}</p>
              <div className="flex gap-2 mt-2.5">
                <Button size="sm" variant="default" onClick={onReport} className="h-8 text-xs">
                  Report
                </Button>
                <Button size="sm" variant="ghost" onClick={onDismiss} className="h-8 text-xs text-muted-foreground">
                  Dismiss
                </Button>
              </div>
            </div>
            <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground transition-colors">
              <X className="h-4 w-4" />
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
