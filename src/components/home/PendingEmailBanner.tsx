import React, { useState, useCallback } from "react";
import { Mail, X } from "lucide-react";

interface PendingEmailBannerProps {
  pendingCount: number;
  onReview: () => void;
}

const DISMISS_KEY = "scene_email_banner_dismissed";
const DISMISS_DURATION_MS = 24 * 60 * 60 * 1000;

function isDismissed(): boolean {
  const ts = sessionStorage.getItem(DISMISS_KEY);
  if (!ts) return false;
  return Date.now() - Number(ts) < DISMISS_DURATION_MS;
}

const PendingEmailBanner = React.memo(function PendingEmailBanner({
  pendingCount,
  onReview,
}: PendingEmailBannerProps) {
  const [hidden, setHidden] = useState(isDismissed);

  const handleDismiss = useCallback(() => {
    sessionStorage.setItem(DISMISS_KEY, String(Date.now()));
    setHidden(true);
  }, []);

  if (pendingCount === 0 || hidden) return null;

  return (
    <div className="relative rounded-2xl border border-white/[0.08] bg-white/[0.04] backdrop-blur-md p-4 flex items-center gap-3">
      <div className="relative flex-shrink-0">
        <Mail className="h-5 w-5 text-muted-foreground" strokeWidth={1.5} />
        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
      </div>

      <p className="flex-1 text-sm text-foreground">
        We found{" "}
        <span className="font-semibold text-primary">
          {pendingCount} show{pendingCount !== 1 ? "s" : ""}
        </span>{" "}
        in your email
      </p>

      <button
        onClick={onReview}
        className="flex-shrink-0 rounded-xl bg-primary/15 border border-primary/30 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/25 transition-colors"
      >
        Review
      </button>

      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 rounded-md text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss email imports banner"
      >
        <X className="h-3.5 w-3.5" strokeWidth={1.5} />
      </button>
    </div>
  );
});

export default PendingEmailBanner;
