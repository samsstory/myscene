/**
 * Shared success-screen primitives used across all success steps
 * (BulkSuccessStep, SuccessStep, Demo flows).
 */
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";
import confetti from "canvas-confetti";
import { Music } from "lucide-react";

/* ═══════════════════════════════════════════
   Animation Variants
   ═══════════════════════════════════════════ */

export const staggerContainer = {
  hidden: {},
  show: { transition: { staggerChildren: 0.1, delayChildren: 0.25 } },
};

export const fadeUp = {
  hidden: { opacity: 0, y: 18 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
  },
};

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.5 },
  show: {
    opacity: 1,
    scale: 1,
    transition: {
      type: "spring" as const,
      stiffness: 260,
      damping: 20,
      delay: 0.05,
    },
  },
};

export const avatarPop = (i: number) => ({
  hidden: { opacity: 0, scale: 0.3, y: 12 },
  show: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      type: "spring" as const,
      stiffness: 300,
      damping: 22,
      delay: 0.35 + i * 0.06,
    },
  },
});

/* ═══════════════════════════════════════════
   Confetti
   ═══════════════════════════════════════════ */

export function fireConfetti() {
  const defaults = {
    startVelocity: 25,
    spread: 360,
    ticks: 60,
    zIndex: 9999,
  };
  const colors = ["#33E1ED", "#E8734A", "#FFFFFF", "#A78BFA"];
  confetti({
    ...defaults,
    particleCount: 50,
    origin: { x: 0.3, y: 0.35 },
    colors,
  });
  confetti({
    ...defaults,
    particleCount: 50,
    origin: { x: 0.7, y: 0.35 },
    colors,
  });
  setTimeout(() => {
    confetti({
      ...defaults,
      particleCount: 30,
      origin: { x: 0.5, y: 0.25 },
      colors,
      startVelocity: 35,
    });
  }, 200);
}

/* ═══════════════════════════════════════════
   SuccessRing — animated check-in-circle
   ═══════════════════════════════════════════ */

export const SuccessRing = () => (
  <motion.div variants={scaleIn} className="relative mx-auto h-20 w-20">
    {/* Outer glow */}
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: [0, 0.6, 0.3], scale: [0.8, 1.15, 1.05] }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      className="absolute inset-0 rounded-full"
      style={{
        background:
          "radial-gradient(circle, hsl(189 94% 55% / 0.25) 0%, transparent 70%)",
      }}
    />
    {/* Ring */}
    <svg viewBox="0 0 80 80" className="absolute inset-0 w-full h-full">
      <motion.circle
        cx="40"
        cy="40"
        r="36"
        fill="none"
        stroke="hsl(189 94% 55%)"
        strokeWidth="2.5"
        strokeLinecap="round"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{
          duration: 0.8,
          ease: [0.22, 1, 0.36, 1] as const,
          delay: 0.15,
        }}
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

/* ═══════════════════════════════════════════
   ArtistAvatar — festival mosaic item
   ═══════════════════════════════════════════ */

export const ArtistAvatar = ({
  name,
  imageUrl,
  index,
}: {
  name: string;
  imageUrl?: string | null;
  index: number;
}) => (
  <motion.div variants={avatarPop(index)} className="flex flex-col items-center gap-1.5">
    <div
      className={cn(
        "relative h-14 w-14 rounded-full overflow-hidden",
        "ring-2 ring-primary/30 shadow-[0_0_16px_hsl(189_94%_55%/0.2)]",
        "transition-all duration-300 hover:ring-primary/60 hover:shadow-[0_0_24px_hsl(189_94%_55%/0.35)]"
      )}
    >
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

/* ═══════════════════════════════════════════
   ActionButton — 3-tier CTA hierarchy
   ═══════════════════════════════════════════ */

export const ActionButton = ({
  onClick,
  icon: Icon,
  label,
  variant = "secondary",
  disabled = false,
}: {
  onClick: () => void;
  icon: React.ElementType;
  label: string;
  variant?: "primary" | "secondary" | "tertiary";
  disabled?: boolean;
}) => {
  const base =
    "w-full flex items-center justify-center gap-2.5 py-3 px-4 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none";

  const styles = {
    primary: cn(
      base,
      "text-primary-foreground shadow-[0_0_20px_hsl(189_94%_55%/0.3)]",
      "hover:shadow-[0_0_28px_hsl(189_94%_55%/0.4)]"
    ),
    secondary: cn(
      base,
      "bg-white/[0.05] backdrop-blur-sm border border-white/[0.1] text-foreground",
      "hover:border-primary/40 hover:bg-white/[0.08]"
    ),
    tertiary: cn(
      base,
      "text-muted-foreground hover:text-foreground hover:bg-white/[0.04]"
    ),
  };

  return (
    <motion.button
      variants={fadeUp}
      onClick={onClick}
      disabled={disabled}
      className={styles[variant]}
      style={
        variant === "primary"
          ? { background: "var(--gradient-primary)" }
          : undefined
      }
    >
      <Icon
        className={cn(
          "h-4 w-4",
          variant === "primary"
            ? "text-primary-foreground"
            : variant === "secondary"
              ? "text-primary"
              : "text-muted-foreground"
        )}
      />
      {label}
    </motion.button>
  );
};

/* ═══════════════════════════════════════════
   GlassCard — frosted container
   ═══════════════════════════════════════════ */

export const GlassCard = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <motion.div
    variants={fadeUp}
    className={cn(
      "rounded-2xl p-5",
      "bg-white/[0.03] backdrop-blur-sm border border-white/[0.06]",
      "shadow-[inset_0_1px_0_hsl(189_94%_55%/0.08)]",
      className
    )}
  >
    {children}
  </motion.div>
);

/* ═══════════════════════════════════════════
   Install CTA — PWA prompt
   ═══════════════════════════════════════════ */

export const InstallCTA = ({
  onInstall,
  onDismiss,
}: {
  onInstall: () => void;
  onDismiss: () => void;
}) => (
  <motion.div
    variants={fadeUp}
    className={cn(
      "rounded-2xl p-4 space-y-3",
      "bg-white/[0.03] backdrop-blur-sm border border-white/[0.06]"
    )}
  >
    <div className="flex items-center gap-3">
      <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="text-primary"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="7 10 12 15 17 10" />
          <line x1="12" y1="15" x2="12" y2="3" />
        </svg>
      </div>
      <div className="text-left flex-1">
        <p className="text-sm font-semibold">Get SCENE on your home screen</p>
        <p className="text-xs text-muted-foreground">
          Full app experience, one tap away
        </p>
      </div>
    </div>
    <div className="flex gap-2">
      <button
        onClick={onInstall}
        className="flex-1 py-2 px-3 rounded-xl bg-white/[0.05] border border-white/[0.1] text-sm font-medium transition-all hover:border-primary/30 active:scale-[0.98]"
      >
        Install
      </button>
      <button
        onClick={onDismiss}
        className="py-2 px-3 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        Later
      </button>
    </div>
  </motion.div>
);
