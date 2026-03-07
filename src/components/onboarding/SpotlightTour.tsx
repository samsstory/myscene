import { useState, useEffect, useCallback } from "react";
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps, ACTIONS, EVENTS } from "react-joyride";
import { ChevronLeft, Zap } from "lucide-react";

interface SpotlightTourProps {
  run: boolean;
  onComplete: () => void;
  onStepChange?: (stepIndex: number) => void;
  /** Called when user clicks "Log Your First Show" on final step */
  onLogFirstShow?: () => void;
}

const TOTAL_STEPS = 4;

// Custom tooltip component with glassmorphism styling
const GlassTooltip = ({
  index,
  step,
  backProps,
  primaryProps,
  tooltipProps,
  isLastStep,
}: TooltipRenderProps) => {
  const isFirstStep = index === 0;

  return (
    <div
      {...tooltipProps}
      className="relative max-w-[280px] rounded-xl border border-white/20 bg-black/60 backdrop-blur-xl p-5 shadow-2xl"
      style={{
        boxShadow: "0 0 40px hsl(189 94% 55% / 0.2), 0 20px 60px -10px rgba(0,0,0,0.5)",
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
                {...backProps}
                className="p-1.5 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
                aria-label="Go back"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
            <span className="text-xs text-white/40">
              {index + 1} of {TOTAL_STEPS}
            </span>
          </div>

          {isLastStep ? (
            <button
              {...primaryProps}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg font-bold text-sm text-primary-foreground transition-all duration-200 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, hsl(189 94% 55%), hsl(250 80% 60%))",
                boxShadow: "0 0 24px hsl(189 94% 55% / 0.5)",
              }}
            >
              <Zap className="h-4 w-4" />
              Log Your First Show
            </button>
          ) : (
            <button
              {...primaryProps}
              className="px-5 py-2 rounded-lg font-semibold text-sm text-primary-foreground transition-all duration-200 hover:scale-105"
              style={{
                background: "linear-gradient(135deg, hsl(189 94% 55%), hsl(250 80% 60%))",
                boxShadow: "0 0 20px hsl(189 94% 55% / 0.4)",
              }}
            >
              Next
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

const SpotlightTour = ({ run, onComplete, onStepChange, onLogFirstShow }: SpotlightTourProps) => {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (run) {
      setStepIndex(0);
      onStepChange?.(0);
    }
  }, [run, onStepChange]);

  useEffect(() => {
    onStepChange?.(stepIndex);
  }, [stepIndex, onStepChange]);

  const steps: Step[] = [
    {
      target: '[data-tour="fab"]',
      content: "Log shows you've seen, add shows you want to see 🎵",
      placement: "left",
      disableBeacon: true,
      spotlightPadding: 12,
    },
    {
      target: '[data-tour="pill-rank"]',
      content: "1–5 stars mean nothing to us ⭐ Compare your shows head-to-head and let the rankings speak 🏆",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="pill-my-shows"]',
      content: "See your show stats, all-time favorites, and badges you've earned 📊",
      placement: "bottom",
      disableBeacon: true,
    },
    {
      target: '[data-tour="pill-schedule"]',
      content: "See upcoming shows your friends are going to and plan your next one 🗓️",
      placement: "bottom",
      disableBeacon: true,
    },
  ];

  const handleCallback = useCallback((data: CallBackProps) => {
    const { status, action, type, index } = data;

    if (type === EVENTS.STEP_AFTER) {
      if (action === ACTIONS.NEXT) {
        // If last step, trigger the "Log first show" action
        if (index === TOTAL_STEPS - 1) {
          onComplete();
          onLogFirstShow?.();
          return;
        }
        setStepIndex(index + 1);
      }
      if (action === ACTIONS.PREV) {
        setStepIndex(index - 1);
      }
    }

    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onComplete();
    }
  }, [onComplete, onLogFirstShow]);

  return (
    <Joyride
      steps={steps}
      run={run}
      stepIndex={stepIndex}
      continuous
      showSkipButton={false}
      showProgress={false}
      callback={handleCallback}
      tooltipComponent={GlassTooltip}
      disableOverlayClose
      disableCloseOnEsc
      spotlightClicks={false}
      spotlightPadding={8}
      styles={{
        options: {
          arrowColor: "rgba(0, 0, 0, 0.6)",
          backgroundColor: "transparent",
          overlayColor: "rgba(0, 0, 0, 0.85)",
          primaryColor: "hsl(189 94% 55%)",
          zIndex: 10000,
        },
        spotlight: {
          borderRadius: 20,
          backgroundColor: "transparent",
          boxShadow: "0 0 0 4px hsl(189 94% 55% / 0.8), 0 0 30px hsl(189 94% 55% / 0.6), 0 0 60px hsl(189 94% 55% / 0.4)",
        },
        overlay: {
          mixBlendMode: undefined,
        },
      }}
      floaterProps={{
        disableAnimation: false,
        offset: 16,
        styles: {
          arrow: {
            length: 8,
            spread: 12,
          },
        },
      }}
    />
  );
};

export default SpotlightTour;
