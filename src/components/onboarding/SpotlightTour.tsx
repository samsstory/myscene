import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps, ACTIONS, EVENTS } from "react-joyride";
import { ChevronLeft } from "lucide-react";

interface SpotlightTourProps {
  run: boolean;
  onComplete: () => void;
  onOpenFabMenu?: () => void;
  onCloseFabMenu?: () => void;
  fabMenuOpen?: boolean;
  onStepChange?: (stepIndex: number) => void;
  statShowsTapped?: boolean;
}

// Custom tooltip component with glassmorphism styling
const GlassTooltip = ({
  continuous,
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
      {/* Content */}
      <div className="space-y-4">
        <p
          className="text-base font-medium text-white leading-relaxed"
          style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}
        >
          {step.content}
        </p>

        {/* Actions */}
        <div className="flex items-center justify-between gap-3">
          {/* Left side: Back button + Step counter */}
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
              {index + 1} of {step.data?.totalSteps || 3}
            </span>
          </div>

          {/* Next/Done button */}
          <button
            {...primaryProps}
            className="px-5 py-2 rounded-lg font-semibold text-sm text-primary-foreground transition-all duration-200 hover:scale-105"
            style={{
              background: "linear-gradient(135deg, hsl(189 94% 55%), hsl(250 80% 60%))",
              boxShadow: "0 0 20px hsl(189 94% 55% / 0.4)",
            }}
          >
            {isLastStep ? "Let's Go!" : "Next"}
          </button>
        </div>
      </div>

      {/* Arrow indicator - styled via Joyride floaterProps */}
    </div>
  );
};

const SpotlightTour = ({ run, onComplete, onOpenFabMenu, onCloseFabMenu, fabMenuOpen, onStepChange, statShowsTapped }: SpotlightTourProps) => {
  const [stepIndex, setStepIndex] = useState(0);

  // Reset step index when tour starts
  useEffect(() => {
    if (run) {
      setStepIndex(0);
      onStepChange?.(0);
    }
  }, [run, onStepChange]);

  // Notify parent when step changes
  useEffect(() => {
    onStepChange?.(stepIndex);
  }, [stepIndex, onStepChange]);

  // Detect when user taps FAB to open menu during step 1 - auto-advance
  useEffect(() => {
    if (run && stepIndex === 0 && fabMenuOpen) {
      setStepIndex(1);
    }
  }, [run, stepIndex, fabMenuOpen]);

  // Detect when user taps stat-shows during step 5 (index 4) - auto-advance
  useEffect(() => {
    if (run && stepIndex === 4 && statShowsTapped) {
      setStepIndex(5);
    }
  }, [run, stepIndex, statShowsTapped]);

  const steps: Step[] = [
    {
      target: '[data-tour="fab"]',
      content: "Tap here to log your first show",
      placement: "left",
      disableBeacon: true,
      data: { totalSteps: 7 },
      spotlightPadding: 12,
    },
    {
      target: '[data-tour="add-photos"]',
      content: "Upload multiple shows at once by adding 1 photo per show",
      placement: "left",
      disableBeacon: true,
      data: { totalSteps: 7 },
    },
    {
      target: '[data-tour="add-single"]',
      content: "No photo? Add by artist/venue",
      placement: "left",
      disableBeacon: true,
      data: { totalSteps: 7 },
    },
    {
      target: '[data-tour="nav-rank"]',
      content: "Rank shows against each other",
      placement: "top",
      disableBeacon: true,
      data: { totalSteps: 7 },
    },
    {
      target: '[data-tour="stat-shows"]',
      content: "Tap here to see all your shows ranked in order",
      placement: "bottom",
      disableBeacon: true,
      data: { totalSteps: 7, isTapToAdvance: true },
      spotlightClicks: true,
    },
    {
      target: '[data-tour="nav-globe"]',
      content: "See everywhere you've been",
      placement: "top",
      disableBeacon: true,
      data: { totalSteps: 7 },
    },
    {
      target: '[data-tour="fab"]',
      content: "Ready to log your first show? Tap here to get started!",
      placement: "left",
      disableBeacon: true,
      data: { totalSteps: 7, isFinal: true },
      spotlightPadding: 12,
    },
  ];

  const handleCallback = (data: CallBackProps) => {
    const { status, action, type, index } = data;

    // Handle step advancement
    if (type === EVENTS.STEP_AFTER) {
      // User clicked Next button - advance to next step
      if (action === ACTIONS.NEXT) {
        const nextIndex = index + 1;
        
        // Open FAB menu before step 2 (Add Photos)
        if (nextIndex === 1) {
          setTimeout(() => {
            onOpenFabMenu?.();
            setStepIndex(nextIndex);
          }, 100);
          return;
        }
        
        // Close FAB menu after step 3 (Add Single Show)
        if (index === 2) {
          onCloseFabMenu?.();
        }
        
        setStepIndex(nextIndex);
      }
      
      // User clicked Back button - go to previous step
      if (action === ACTIONS.PREV) {
        const prevIndex = index - 1;
        
        // If going back from step 2+ to step 1, close FAB menu
        if (prevIndex === 0 && index >= 1) {
          onCloseFabMenu?.();
        }
        
        // If going back to step 2 or 3, ensure FAB menu is open
        if (prevIndex === 1 || prevIndex === 2) {
          onOpenFabMenu?.();
        }
        
        setStepIndex(prevIndex);
      }
    }

    // Handle target click (tap-to-advance)
    if (type === EVENTS.TARGET_NOT_FOUND) {
      // Target disappeared - likely user interacted with it
      // This can happen when FAB menu opens/closes
    }

    // Tour finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onCloseFabMenu?.();
      onComplete();
    }
  };

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
          animation: "spotlight-pulse 2s ease-in-out infinite",
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
