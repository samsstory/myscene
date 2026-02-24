import AddShowFlow from "@/components/AddShowFlow";
import BulkUploadFlow from "@/components/BulkUploadFlow";
import type { FestivalResult } from "@/components/festival-claim/FestivalSearchStep";
import AddChoiceSheet from "@/components/AddChoiceSheet";
import PlanShowSheet from "@/components/home/PlanShowSheet";
import CompareShowSheet from "@/components/CompareShowSheet";
import SpotlightTour from "@/components/onboarding/SpotlightTour";
import WelcomeCarousel from "@/components/onboarding/WelcomeCarousel";
import BugPromptBanner from "@/components/BugPromptBanner";
import FeedbackSheet from "@/components/FeedbackSheet";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { ContentView } from "@/components/home/ContentPillNav";

interface DashboardSheetsProps {
  session: Session;
  // Add show dialogs
  showAddDialog: boolean;
  setShowAddDialog: (v: boolean) => void;
  showUnifiedAdd: boolean;
  setShowUnifiedAdd: (v: boolean) => void;
  showAddChoice: boolean;
  setShowAddChoice: (v: boolean) => void;
  showPlanShow: boolean;
  setShowPlanShow: (v: boolean) => void;
  // Tab navigation callbacks
  setActiveTab: (tab: string) => void;
  setHomeView: (view: ContentView) => void;
  setOpenShowId: (id: string | null) => void;
  // Bug prompt
  prompt: { open: boolean; prefillDescription?: string; errorContext?: Record<string, unknown> };
  dismissPrompt: () => void;
  // Feedback
  feedbackOpen: boolean;
  setFeedbackOpen: (v: boolean) => void;
  announcementsOpen: boolean;
  setAnnouncementsOpen: (v: boolean) => void;
  // Tour
  showSpotlightTour: boolean;
  setShowSpotlightTour: (v: boolean) => void;
  tourStepIndex: number;
  setTourStepIndex: (i: number) => void;
  // Welcome carousel
  showWelcomeCarousel: boolean;
  setShowWelcomeCarousel: (v: boolean) => void;
  // Compare sheet
  showCompareSheet: boolean;
  setShowCompareSheet: (v: boolean) => void;
  inviteShowId: string | null;
  inviteShowType: "logged" | "upcoming" | "edmtrain";
  inviteHighlights: string[];
  inviteNote: string;
  // Festival invite
  festivalInviteState: { festival: FestivalResult; selectedArtists: string[] } | null;
  onFestivalInviteClear: () => void;
}

const DashboardSheets = ({
  session,
  showAddDialog,
  setShowAddDialog,
  showUnifiedAdd,
  setShowUnifiedAdd,
  showAddChoice,
  setShowAddChoice,
  showPlanShow,
  setShowPlanShow,
  setActiveTab,
  setHomeView,
  setOpenShowId,
  prompt,
  dismissPrompt,
  feedbackOpen,
  setFeedbackOpen,
  announcementsOpen,
  setAnnouncementsOpen,
  showSpotlightTour,
  setShowSpotlightTour,
  tourStepIndex,
  setTourStepIndex,
  showWelcomeCarousel,
  setShowWelcomeCarousel,
  showCompareSheet,
  setShowCompareSheet,
  inviteShowId,
  inviteShowType,
  inviteHighlights,
  inviteNote,
  festivalInviteState,
  onFestivalInviteClear,
}: DashboardSheetsProps) => {
  const handleSpotlightTourComplete = async () => {
    await supabase
      .from("profiles")
      .update({ onboarding_step: "completed" })
      .eq("id", session.user.id);
    setShowSpotlightTour(false);
  };

  return (
    <>
      <AddShowFlow
        open={showAddDialog}
        onOpenChange={setShowAddDialog}
        onShowAdded={() => {}}
        onViewShowDetails={(showId) => {
          setActiveTab("home");
          setOpenShowId(showId);
        }}
      />

      <BulkUploadFlow
        open={showUnifiedAdd}
        onOpenChange={(v) => {
          setShowUnifiedAdd(v);
          if (!v) onFestivalInviteClear();
        }}
        onNavigateToFeed={() => setActiveTab("home")}
        onNavigateToRank={() => { setActiveTab("home"); setHomeView("rank"); }}
        onAddManually={() => setShowAddDialog(true)}
        initialFestival={festivalInviteState}
      />

      <AddChoiceSheet
        open={showAddChoice}
        onOpenChange={setShowAddChoice}
        onLogShow={() => setShowUnifiedAdd(true)}
        onPlanShow={() => setShowPlanShow(true)}
      />

      <PlanShowSheet open={showPlanShow} onOpenChange={setShowPlanShow} />

      {/* API error / prompt banner */}
      <BugPromptBanner
        visible={prompt.open}
        message={prompt.prefillDescription || "Something went wrong. Want to report this?"}
        onReport={() => {
          dismissPrompt();
          setFeedbackOpen(true);
        }}
        onDismiss={dismissPrompt}
      />

      {/* Announcements Sheet */}
      <FeedbackSheet
        open={announcementsOpen}
        onOpenChange={setAnnouncementsOpen}
        prefillDescription="Feature announcement / notification"
      />

      {/* Unified Feedback Sheet */}
      <FeedbackSheet
        open={feedbackOpen}
        onOpenChange={setFeedbackOpen}
        prefillDescription={prompt.prefillDescription}
        errorContext={prompt.errorContext}
      />

      {/* Spotlight Tour */}
      <SpotlightTour
        run={showSpotlightTour}
        onComplete={handleSpotlightTourComplete}
        onStepChange={setTourStepIndex}
      />

      {/* Welcome Carousel */}
      {showWelcomeCarousel && (
        <WelcomeCarousel
          onComplete={() => {
            setShowWelcomeCarousel(false);
            setShowUnifiedAdd(true);
          }}
          onTakeTour={() => {
            setShowWelcomeCarousel(false);
            setShowSpotlightTour(true);
          }}
        />
      )}

      {/* Compare Show Sheet */}
      {inviteShowId && inviteShowType !== "edmtrain" && (
        <CompareShowSheet
          open={showCompareSheet}
          onOpenChange={setShowCompareSheet}
          showId={inviteShowId}
          showType={inviteShowType}
          myHighlights={inviteHighlights}
          myNote={inviteNote}
          onContinueToAddShow={() => setShowWelcomeCarousel(true)}
        />
      )}
    </>
  );
};

export default DashboardSheets;
