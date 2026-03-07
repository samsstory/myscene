import { useState, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { ChevronLeft, Zap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface SpotlightTourProps {
  run: boolean;
  onComplete: () => void;
  onStepChange?: (stepIndex: number) => void;
  onLogFirstShow?: () => void;
}

interface TourStep {
  target: string;
  content: string;
}

const STEPS: TourStep[] = [
  {
    target: '[data-tour="fab"]',
    content: "Log shows you've seen, add shows you want to see 🎵",
  },
  {
    target: '[data-tour="pill-rank"]',
    content: "1–5 stars mean nothing to us ⭐ Compare your shows head-to-head and let the rankings speak 🏆",
  },
  {
    target: '[data-tour="pill-my-shows"]',
    content: "See your show stats, all-time favorites, and badges you've earned 📊",
  },
  {
    target: '[data-tour="pill-schedule"]',
    content: "See upcoming shows your friends are going to and plan your next one 🗓️",
  },
];

const TOTAL_STEPS = STEPS.length;

/** Returns the bounding rect of a target element, or null */
function getTargetRect(selector: string): DOMRect | null {
  const el = document.querySelector(selector);
  return el ? el.getBoundingClientRect() : null;
}

const SpotlightTour = ({ run, onComplete, onStepChange, onLogFirstShow }: SpotlightTourProps) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);

  // Reset on run
  useEffect(() => {
    if (run) {
      setStepIndex(0);
      onStepChange?.(0);
    }
  }, [run, onStepChange]);

  // Measure target element whenever step changes
  useEffect(() => {
    if (!run) return;
    onStepChange?.(stepIndex);

    const measure = () => setTargetRect(getTargetRect(STEPS[stepIndex].target));
    // Measure immediately + next frame for layout settling
    measure();
    const raf = requestAnimationFrame(measure);
    const onResize = () => measure();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize);
    };
  }, [run, stepIndex, onStepChange]);

  const handleNext = useCallback(() => {
    if (stepIndex === TOTAL_STEPS - 1) {
      onComplete();
      onLogFirstShow?.();
      return;
    }
    setStepIndex((i) => i + 1);
  }, [stepIndex, onComplete, onLogFirstShow]);

  const handleBack = useCallback(() => {
    setStepIndex((i) => Math.max(0, i - 1));
  }, []);

  const step = STEPS[stepIndex];
  const isFirstStep = stepIndex === 0;
  const isLastStep = stepIndex === TOTAL_STEPS - 1;

  const isCircle = stepIndex === 0; // FAB is circular

  // Spotlight cutout style
  const spotlightStyle = useMemo(() => {
    if (!targetRect) return {};
    const pad = 12;
    if (isCircle) {
      const size = Math.max(targetRect.width, targetRect.height) + pad * 2;
      const cx = targetRect.left + targetRect.width / 2;
      const cy = targetRect.top + targetRect.height / 2;
      return {
        left: cx - size / 2,
        top: cy - size / 2,
        width: size,
        height: size,
      };
    }
    return {
      left: targetRect.left - pad,
      top: targetRect.top - pad,
      width: targetRect.width + pad * 2,
      height: targetRect.height + pad * 2,
    };
  }, [targetRect, isCircle]);

  if (!run) return null;

  return createPortal(
    <div style={{ position: "fixed", inset: 0, zIndex: 10000 }}>
      {/* Dark overlay with cutout */}
      <svg
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        viewBox={`0 0 ${window.innerWidth} ${window.innerHeight}`}
        preserveAspectRatio="none"
      >
        <defs>
          <mask id="tour-spotlight-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={spotlightStyle.left}
                y={spotlightStyle.top}
                width={spotlightStyle.width}
                height={spotlightStyle.height}
                rx="20"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.85)"
          mask="url(#tour-spotlight-mask)"
        />
      </svg>

      {/* Spotlight glow ring */}
      <AnimatePresence mode="wait">
        {targetRect && (
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            style={{
              position: "absolute",
              left: spotlightStyle.left,
              top: spotlightStyle.top,
              width: spotlightStyle.width,
              height: spotlightStyle.height,
              borderRadius: 20,
              boxShadow:
                "0 0 0 4px hsl(189 94% 55% / 0.8), 0 0 30px hsl(189 94% 55% / 0.6), 0 0 60px hsl(189 94% 55% / 0.4)",
              pointerEvents: "none",
            }}
          />
        )}
      </AnimatePresence>

      {/* Elevated target clone area — makes the real button clickable above overlay */}
      {targetRect && (
        <div
          style={{
            position: "absolute",
            left: spotlightStyle.left,
            top: spotlightStyle.top,
            width: spotlightStyle.width,
            height: spotlightStyle.height,
            zIndex: 10001,
            pointerEvents: "none",
          }}
        />
      )}

      {/* Center-screen tooltip */}
      {/* Fixed centering wrapper — immune to framer-motion transform overrides */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10002,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          pointerEvents: "none",
        }}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={stepIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            style={{ pointerEvents: "none" }}
          >
          <div
            className="max-w-[300px] rounded-xl border border-white/20 bg-black/60 backdrop-blur-xl p-5 shadow-2xl"
            style={{
              pointerEvents: "auto",
              boxShadow:
                "0 0 40px hsl(189 94% 55% / 0.2), 0 20px 60px -10px rgba(0,0,0,0.5)",
            }}
          >
            <div className="space-y-4">
              <p
                className="text-base font-medium text-white leading-relaxed"
                style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}
              >
                {step.content}
              </p>

              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  {!isFirstStep && (
                    <button
                      onClick={handleBack}
                      className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                      aria-label="Go back"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                  <span className="text-xs text-white/40">
                    {stepIndex + 1} of {TOTAL_STEPS}
                  </span>
                </div>

                {isLastStep ? (
                  <button
                    onClick={handleNext}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-primary-foreground transition-all duration-200 hover:scale-105"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(189 94% 55%), hsl(250 80% 60%))",
                      boxShadow: "0 0 24px hsl(189 94% 55% / 0.5)",
                    }}
                  >
                    <Zap className="h-4 w-4" />
                    Log Your First Show
                  </button>
                ) : (
                  <button
                    onClick={handleNext}
                    className="px-5 py-2 rounded-lg font-semibold text-sm text-primary-foreground transition-all duration-200 hover:scale-105"
                    style={{
                      background:
                        "linear-gradient(135deg, hsl(189 94% 55%), hsl(250 80% 60%))",
                      boxShadow: "0 0 20px hsl(189 94% 55% / 0.4)",
                    }}
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          </div>
        </motion.div>
        </AnimatePresence>
      </div>
    </div>,
    document.body
  );
};

export default SpotlightTour;
