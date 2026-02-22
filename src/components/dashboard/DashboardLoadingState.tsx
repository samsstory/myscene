import BrandedLoader from "@/components/ui/BrandedLoader";
import BugPromptBanner from "@/components/BugPromptBanner";
import FeedbackSheet from "@/components/FeedbackSheet";

interface DashboardLoadingStateProps {
  showReassurance: boolean;
  showPrompt: boolean;
  elapsedMs: number;
  onQuoteVisible: () => void;
  onReadyToDismiss: () => void;
  onDismissSlowLoad: () => void;
  feedbackOpen: boolean;
  onFeedbackOpenChange: (open: boolean) => void;
}

const DashboardLoadingState = ({
  showReassurance,
  showPrompt,
  elapsedMs,
  onQuoteVisible,
  onReadyToDismiss,
  onDismissSlowLoad,
  feedbackOpen,
  onFeedbackOpenChange,
}: DashboardLoadingStateProps) => (
  <>
    <BrandedLoader
      fullScreen
      showReassurance={showReassurance}
      onQuoteVisible={onQuoteVisible}
      onReadyToDismiss={onReadyToDismiss}
    />
    <BugPromptBanner
      visible={showPrompt}
      message={`Things are taking longer than usual (${(elapsedMs / 1000).toFixed(1)}s). Want to let us know?`}
      onReport={() => {
        onDismissSlowLoad();
        onFeedbackOpenChange(true);
      }}
      onDismiss={onDismissSlowLoad}
    />
    <FeedbackSheet
      open={feedbackOpen}
      onOpenChange={onFeedbackOpenChange}
      prefillDescription={`Page took ${(elapsedMs / 1000).toFixed(1)}s to load on ${window.location.pathname}`}
      errorContext={{ duration_ms: elapsedMs, page: window.location.pathname }}
    />
  </>
);

export default DashboardLoadingState;
