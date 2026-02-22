import { motion } from "framer-motion";
import { Home as HomeIcon, Plus, Music, CalendarDays } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ContentView } from "@/components/home/ContentPillNav";
import FloatingTourTarget from "@/components/onboarding/FloatingTourTarget";

// Soft haptic tap — silently ignored on desktop / unsupported browsers
const haptic = () => { try { navigator.vibrate?.(6); } catch {} };

interface BottomNavProps {
  activeTab: string;
  homeView: ContentView;
  feedbackOpen: boolean;
  showSpotlightTour: boolean;
  tourStepIndex: number;
  showsStatRef: React.RefObject<HTMLButtonElement>;
  onHomePress: () => void;
  onCalendarPress: () => void;
  onFeedbackPress: () => void;
  onProfilePress: () => void;
  onAddPress: () => void;
}

export default function BottomNav({
  activeTab,
  homeView,
  feedbackOpen,
  showSpotlightTour,
  tourStepIndex,
  showsStatRef,
  onHomePress,
  onCalendarPress,
  onFeedbackPress,
  onProfilePress,
  onAddPress,
}: BottomNavProps) {
  const shouldElevateNavZ = showSpotlightTour && tourStepIndex === 0;
  const showsTourActive = showSpotlightTour && tourStepIndex === 2;

  return (
    <div className={cn(
      "fixed bottom-6 left-0 right-0 flex justify-between items-end px-6 gap-4 pb-safe",
      shouldElevateNavZ ? "z-[10001]" : "z-50"
    )}>
      {/* Left spacer */}
      <div className="w-0 shrink-0" />

      {/* Glass Pill Navigation */}
      <nav className="backdrop-blur-xl bg-black/40 border border-white/20 rounded-full px-6 py-3 shadow-2xl">
        <div className="flex items-center gap-8">
          {/* Home */}
          <NavButton
            active={activeTab === "home" && homeView === "home"}
            onPress={() => { haptic(); onHomePress(); }}
          >
            <HomeIcon className="h-6 w-6" />
          </NavButton>

          {/* Schedule */}
          <NavButton
            active={activeTab === "home" && homeView === "calendar"}
            onPress={() => { haptic(); onCalendarPress(); }}
            aria-label="Schedule"
          >
            <CalendarDays className="h-6 w-6" />
          </NavButton>

          {/* Feedback */}
          <NavButton
            active={feedbackOpen}
            onPress={() => { haptic(); onFeedbackPress(); }}
            aria-label="Share feedback"
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </NavButton>

          {/* Profile */}
          <NavButton
            active={activeTab === "profile"}
            onPress={() => { haptic(); onProfilePress(); }}
          >
            <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
            </svg>
          </NavButton>
        </div>
      </nav>

      {/* Floating tour target for Shows stat pill */}
      <FloatingTourTarget active={showsTourActive} targetRef={showsStatRef} dataTour="stat-shows">
        <div
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.08] border border-white/20"
          style={{ boxShadow: "0 0 12px hsl(var(--primary) / 0.4), 0 0 24px hsl(var(--primary) / 0.2)" }}
        >
          <Music className="h-4 w-4 text-primary" style={{ filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.9))" }} />
          <div className="flex flex-col items-start">
            <span className="text-[9px] uppercase tracking-[0.15em] text-white/50 font-medium">Shows</span>
            <span className="text-lg font-bold text-white/90" style={{ textShadow: "0 0 10px rgba(255,255,255,0.4)" }}>–</span>
          </div>
        </div>
      </FloatingTourTarget>

      {/* FAB — add show */}
      <div className={cn("flex flex-col items-center gap-3", showSpotlightTour && "z-[10001]")}>
        <button
          onClick={() => { if (!showSpotlightTour) { haptic(); onAddPress(); } }}
          data-tour="fab"
          className={cn(
            "relative overflow-hidden backdrop-blur-xl rounded-full p-5 shadow-[0_0_30px_hsl(189_94%_55%/0.4),0_0_60px_hsl(189_94%_55%/0.15)] transition-all hover:scale-110 active:scale-95 hover:shadow-[0_0_40px_hsl(189_94%_55%/0.6),0_0_80px_hsl(189_94%_55%/0.25)]",
            "bg-gradient-to-br from-primary via-primary to-[hsl(250,80%,60%)] border border-white/20",
            showSpotlightTour ? "z-[10001]" : "z-50"
          )}
        >
          <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-white/0 via-white/20 to-white/0 opacity-0 hover:opacity-100 transition-opacity duration-500" />
          <Plus className="h-9 w-9 text-primary-foreground relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.3)]" />
        </button>
      </div>
    </div>
  );
}

/** Small internal reusable nav button */
function NavButton({ active, onPress, children, "aria-label": ariaLabel }: { active: boolean; onPress: () => void; children: React.ReactNode; "aria-label"?: string }) {
  return (
    <motion.button
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 500, damping: 30 }}
      onClick={onPress}
      className={cn(
        "flex flex-col items-center gap-0.5 transition-colors py-1.5",
        active
          ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]"
          : "text-white/60 hover:text-white/90"
      )}
      aria-label={ariaLabel}
    >
      {children}
    </motion.button>
  );
}
