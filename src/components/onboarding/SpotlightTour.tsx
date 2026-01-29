import Joyride, { CallBackProps, STATUS, Step, TooltipRenderProps } from "react-joyride";

interface SpotlightTourProps {
  run: boolean;
  onComplete: () => void;
  onOpenFabMenu?: () => void;
  onCloseFabMenu?: () => void;
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
          {/* Step counter */}
          <span className="text-xs text-white/40">
            {index + 1} of {step.data?.totalSteps || 3}
          </span>

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

const SpotlightTour = ({ run, onComplete, onOpenFabMenu, onCloseFabMenu }: SpotlightTourProps) => {
  const steps: Step[] = [
    {
      target: '[data-tour="fab"]',
      content: "Tap here to log your first show",
      placement: "top",
      disableBeacon: true,
      data: { totalSteps: 8 },
    },
    {
      target: '[data-tour="add-photos"]',
      content: "Upload multiple shows at once by adding 1 photo per show",
      placement: "left",
      disableBeacon: true,
      data: { totalSteps: 8 },
    },
    {
      target: '[data-tour="add-single"]',
      content: "No photo? Add by artist/venue",
      placement: "left",
      disableBeacon: true,
      data: { totalSteps: 8 },
    },
    {
      target: '[data-tour="nav-rank"]',
      content: "Rank shows against each other",
      placement: "top",
      disableBeacon: true,
      data: { totalSteps: 8 },
    },
    {
      target: '[data-tour="shows-ranked"]',
      content: "See all your shows ranked in order",
      placement: "bottom",
      disableBeacon: true,
      data: { totalSteps: 8 },
    },
    {
      target: '[data-tour="share-instagram"]',
      content: "Add your show review to your photo and share to Instagram or send to friends",
      placement: "top",
      disableBeacon: true,
      data: { totalSteps: 8 },
    },
    {
      target: '[data-tour="nav-globe"]',
      content: "See everywhere you've been",
      placement: "top",
      disableBeacon: true,
      data: { totalSteps: 8 },
    },
    {
      target: '[data-tour="nav-rank"]',
      content: "Your personal rankings live here",
      placement: "top",
      disableBeacon: true,
      data: { totalSteps: 8 },
    },
  ];

  const handleCallback = (data: CallBackProps) => {
    const { status, index, action, type } = data;

    // Open FAB menu before step 2 (Add Photos)
    if (type === "step:before" && index === 1) {
      onOpenFabMenu?.();
    }

    // Close FAB menu after step 3 (Add Single Show)
    if (type === "step:after" && index === 2) {
      onCloseFabMenu?.();
    }

    // Tour finished or skipped
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      onComplete();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showSkipButton={false}
      showProgress={false}
      callback={handleCallback}
      tooltipComponent={GlassTooltip}
      disableOverlayClose
      disableCloseOnEsc
      spotlightClicks={false}
      styles={{
        options: {
          arrowColor: "rgba(0, 0, 0, 0.6)",
          backgroundColor: "transparent",
          overlayColor: "rgba(0, 0, 0, 0.7)",
          primaryColor: "hsl(189 94% 55%)",
          zIndex: 10000,
        },
        spotlight: {
          borderRadius: 16,
          boxShadow: "0 0 30px hsl(189 94% 55% / 0.5), 0 0 60px hsl(189 94% 55% / 0.3)",
        },
        overlay: {
          mixBlendMode: undefined,
        },
      }}
      floaterProps={{
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
