import { useState, useEffect, useCallback } from "react";
import { Plus, Image, MessageCircle, Scale, Share, Download, Music } from "lucide-react";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { AddedShowData } from "@/hooks/useBulkShowUpload";
import { useShareShow } from "@/hooks/useShareShow";
import PushNotificationInterstitial from "@/components/onboarding/PushNotificationInterstitial";
import { cn } from "@/lib/utils";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface BulkSuccessStepProps {
  addedCount: number;
  addedShows: AddedShowData[];
  festivalName?: string | null;
  festivalLineupId?: string | null;
  onAddMore: () => void;
  onDone: () => void;
  onCreateReviewPhoto: (show: AddedShowData) => void;
  onRank: () => void;
}

/* ── animation helpers ── */
const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const } },
};

const scaleIn = {
  hidden: { opacity: 0, scale: 0.5 },
  show: { opacity: 1, scale: 1, transition: { type: "spring" as const, stiffness: 260, damping: 20, delay: 0.05 } },
};

const avatarPop = (i: number) => ({
  hidden: { opacity: 0, scale: 0.3, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 22, delay: 0.35 + i * 0.06 },
  },
});

/* ── confetti burst ── */
function fireConfetti() {
  const defaults = { startVelocity: 25, spread: 360, ticks: 60, zIndex: 9999 };
  // Cyan + coral particles matching Scene palette
  const colors = ["#33E1ED", "#E8734A", "#FFFFFF", "#A78BFA"];
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.3, y: 0.35 }, colors });
  confetti({ ...defaults, particleCount: 50, origin: { x: 0.7, y: 0.35 }, colors });
  setTimeout(() => {
    confetti({ ...defaults, particleCount: 30, origin: { x: 0.5, y: 0.25 }, colors, startVelocity: 35 });
  }, 200);
}

/* ── ShowCard (non-festival multi) ── */
const ShowCard = ({ show, onTap, index }: { show: AddedShowData; onTap: (show: AddedShowData) => void; index: number }) => (
  <motion.button
    variants={avatarPop(index)}
    onClick={() => onTap(show)}
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
);

/* ── ArtistAvatar (festival mosaic) ── */
const ArtistAvatar = ({ name, imageUrl, index }: { name: string; imageUrl?: string | null; index: number }) => (
  <motion.div
    variants={avatarPop(index)}
    className="flex flex-col items-center gap-1.5"
  >
    <div className={cn(
      "relative h-14 w-14 rounded-full overflow-hidden",
      "ring-2 ring-primary/30 shadow-[0_0_16px_hsl(189_94%_55%/0.2)]",
      "transition-all duration-300 hover:ring-primary/60 hover:shadow-[0_0_24px_hsl(189_94%_55%/0.35)]"
    )}>
      {imageUrl ? (
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-white/[0.06]">
          <Music className="h-5 w-5 text-primary/60" />
        </div>
      )}
    </div>
    <span className="text-[11px] font-medium text-foreground/70 max-w-[72px] truncate text-center leading-tight">
      {name}
    </span>
  </motion.div>
);

/* ── Animated check ring ── */
const SuccessRing = () => (
  <motion.div
    variants={scaleIn}
    className="relative mx-auto h-20 w-20"
  >
    {/* Outer glow ring */}
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: [0, 0.6, 0.3], scale: [0.8, 1.15, 1.05] }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="absolute inset-0 rounded-full"
      style={{ background: "radial-gradient(circle, hsl(189 94% 55% / 0.25) 0%, transparent 70%)" }}
    />
    {/* Ring */}
    <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full">
      <motion.circle
        cx="40" cy="40" r="36"
        fill="none"
        stroke="hsl(189 94% 55%)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1], delay: 0.15 }}
      />
    </svg>
    {/* Checkmark */}
    <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full">
      <motion.path
        d="M26 42 L36 52 L54 30"
        fill="none"
        stroke="hsl(189 94% 55%)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut", delay: 0.7 }}
      />
    </svg>
  </motion.div>
);

/* ── Action Button ── */
const ActionButton = ({
  onClick,
  icon: Icon,
  label,
  variant = "secondary",
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  variant?: "primary" | "secondary" | "tertiary";
}) => {
  const base = "w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97]";
  const styles = {
    primary: cn(base, "text-primary-foreground shadow-[0_0_20px_hsl(189_94%_55%/0.3)]", "hover:shadow-[0_0_28px_hsl(189_94%_55%/0.4)]"),
    secondary: cn(base, "bg-white/[0.05] backdrop-blur-sm border border-white/[0.1] text-foreground hover:border-primary/40 hover:bg-white/[0.08]"),
    tertiary: cn(base, "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"),
  };

  return (
    <motion.button variants={fadeUp} onClick={onClick} className={styles[variant]}
      style={variant === "primary" ? { background: "var(--gradient-primary)" } : undefined}
    >
      <Icon className={cn("h-4 w-4", variant === "primary" ? "text-primary-foreground" : variant === "secondary" ? "text-primary" : "text-muted-foreground")} />
      {label}
    </motion.button>
  );
};

/* ── Main Component ── */
const BulkSuccessStep = ({ addedCount, addedShows, festivalName, festivalLineupId, onAddMore, onDone, onCreateReviewPhoto, onRank }: BulkSuccessStepProps) => {
  const firstShow = addedShows[0];
  const hasMultiple = addedShows.length > 1;
  const isFestival = !!festivalName;
  const { shareFestivalFromLineup } = useShareShow();

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallCTA, setShowInstallCTA] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [showPushInterstitial, setShowPushInterstitial] = useState(false);

  // Confetti + install prompt + push prompt
  useEffect(() => {
    fireConfetti();

    const isFirstShow = !localStorage.getItem("scene-first-show-logged");
    localStorage.setItem("scene-first-show-logged", "true");

    const pushSeen = localStorage.getItem("scene-push-prompt-seen");
    if (isFirstShow && !pushSeen && "Notification" in window) {
      setShowPushInterstitial(true);
    }

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isStandalone || !isMobile) return;

    setShowInstallCTA(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
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

  const handleSendToFriends = () => {
    if (!firstShow) return;
    const artistNames = firstShow.artists.map(a => a.name).join(', ');
    const shareText = `Just saw ${artistNames} at ${firstShow.venue.name}! 🎵`;
    window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
  };

  const handleShareAll = useCallback(async () => {
    if (isFestival && festivalLineupId) {
      const artists = addedShows.map((s) => ({
        name: s.artists[0]?.name || "Artist",
        image_url: s.artists[0]?.image_url || null,
      }));
      await shareFestivalFromLineup({
        festivalLineupId,
        festivalName: festivalName || "Festival",
        artists,
      });
    } else if (isFestival) {
      const shareText = `Just claimed ${festivalName} on SCENE — ${addedShows.length} sets logged! 🎵`;
      window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
    } else {
      const shareText = `Just added ${addedShows.length} shows to my Scene! 🎵`;
      window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
    }
  }, [isFestival, festivalLineupId, festivalName, addedShows, shareFestivalFromLineup]);

  if (showPushInterstitial) {
    return (
      <PushNotificationInterstitial
        onComplete={() => setShowPushInterstitial(false)}
      />
    );
  }

  return (
    <motion.div
      variants={stagger}
      initial="hidden"
      animate="show"
      className="text-center space-y-6 py-4 relative"
    >
      {/* ── Animated header ── */}
      <motion.div variants={fadeUp} className="space-y-3">
        <SuccessRing />
        <motion.div variants={fadeUp}>
          <h2 className="text-2xl font-bold tracking-tight" style={{ textShadow: "0 0 24px hsl(189 94% 55% / 0.25)" }}>
            {isFestival ? festivalName : "Success!"}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {isFestival
              ? `${addedCount} set${addedCount !== 1 ? "s" : ""} added to your rankings`
              : `${addedCount} show${addedCount !== 1 ? "s" : ""} added`}
          </p>
        </motion.div>
      </motion.div>

      {/* ── Festival: artist avatar mosaic ── */}
      {isFestival && (
        <motion.div
          variants={fadeUp}
          className={cn(
            "rounded-2xl p-5",
            "bg-white/[0.03] backdrop-blur-sm border border-white/[0.06]",
            "shadow-[inset_0_1px_0_hsl(189_94%_55%/0.08)]"
          )}
        >
          <motion.div variants={stagger} initial="hidden" animate="show" className="flex flex-wrap gap-4 justify-center">
            {addedShows.map((show, i) => (
              <ArtistAvatar
                key={show.id}
                name={show.artists[0]?.name || "Artist"}
                imageUrl={show.artists[0]?.image_url}
                index={i}
              />
            ))}
          </motion.div>
        </motion.div>
      )}

      {/* ── Non-festival single show hero ── */}
      {!isFestival && !hasMultiple && firstShow && (
        <motion.div variants={fadeUp} className="rounded-2xl overflow-hidden ring-1 ring-white/[0.06]">
          {firstShow.photo_url ? (
            <div className="relative aspect-[4/3] w-full group">
              <img
                src={firstShow.photo_url}
                alt="Show photo"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-left text-white">
                <p className="font-bold text-lg leading-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.5)" }}>
                  {firstShow.artists.map(a => a.name).join(", ")}
                </p>
                <p className="text-sm text-white/75 mt-0.5">
                  {firstShow.venue.name}
                </p>
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

      {/* ── Non-festival multi show grid ── */}
      {!isFestival && hasMultiple && (
        <motion.div variants={fadeUp} className="space-y-2">
          <motion.div variants={stagger} initial="hidden" animate="show" className="grid grid-cols-2 gap-3">
            {addedShows.map((show, i) => (
              <ShowCard key={show.id} show={show} onTap={onCreateReviewPhoto} index={i} />
            ))}
          </motion.div>
          <p className="text-xs text-muted-foreground/60">
            Tap to create a review photo for Instagram
          </p>
        </motion.div>
      )}

      {/* ── Install CTA ── */}
      {showInstallCTA && !installDismissed && (
        <motion.div
          variants={fadeUp}
          className={cn(
            "rounded-2xl p-4 space-y-3",
            "bg-white/[0.03] backdrop-blur-sm border border-white/[0.06]"
          )}
        >
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold">Get SCENE on your home screen</p>
              <p className="text-xs text-muted-foreground">Full app experience, one tap away</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleInstall} className="flex-1 py-2 px-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm font-medium transition-all hover:border-primary/30 active:scale-[0.98]">
              Install
            </button>
            <button onClick={() => setInstallDismissed(true)} className="py-2 px-3 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
              Later
            </button>
          </div>
        </motion.div>
      )}

      {/* ── Actions — clear hierarchy ── */}
      <motion.div variants={fadeUp} className="space-y-2.5 pt-1">
        {/* Primary CTA */}
        {isFestival ? (
          <ActionButton onClick={handleShareAll} icon={Share} label="Share Festival" variant="primary" />
        ) : !hasMultiple && firstShow ? (
          <ActionButton onClick={() => onCreateReviewPhoto(firstShow)} icon={Image} label="Create Review Photo" variant="primary" />
        ) : hasMultiple ? (
          <ActionButton onClick={handleShareAll} icon={Share} label="Share Summary" variant="primary" />
        ) : null}

        {/* Secondary */}
        <ActionButton onClick={onRank} icon={Scale} label={`Rank ${isFestival ? "These Sets" : hasMultiple ? "These Shows" : "This Show"}`} variant="secondary" />

        {/* Tertiary — send to friends (single non-festival) */}
        {!isFestival && !hasMultiple && firstShow && (
          <ActionButton onClick={handleSendToFriends} icon={MessageCircle} label="Send to Friends" variant="tertiary" />
        )}
      </motion.div>

      {/* ── Footer ── */}
      <motion.div variants={fadeUp} className="flex gap-2 pt-2">
        <button
          onClick={onAddMore}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.04]"
        >
          <Plus className="h-3.5 w-3.5" />
          Add More
        </button>
        <button
          onClick={onDone}
          className="flex-1 flex items-center justify-center py-2.5 px-3 rounded-xl text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-white/[0.04]"
        >
          Done
        </button>
      </motion.div>
    </motion.div>
  );
};

export default BulkSuccessStep;
