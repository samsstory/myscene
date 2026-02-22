import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Bell } from "lucide-react";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import Home from "@/components/Home";
import type { ContentView } from "@/components/home/ContentPillNav";
import Profile from "@/components/Profile";

import AddShowFlow from "@/components/AddShowFlow";
import BulkUploadFlow from "@/components/BulkUploadFlow";
import AddChoiceSheet from "@/components/AddChoiceSheet";
import PlanShowSheet from "@/components/home/PlanShowSheet";
import SpotlightTour from "@/components/onboarding/SpotlightTour";
import WelcomeCarousel from "@/components/onboarding/WelcomeCarousel";
import BrandedLoader from "@/components/ui/BrandedLoader";
import CompareShowSheet from "@/components/CompareShowSheet";
import BottomNav from "@/components/BottomNav";

import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import SceneLogo from "@/components/ui/SceneLogo";
import FeedbackSheet from "@/components/FeedbackSheet";
import { useSlowLoadDetector } from "@/hooks/useSlowLoadDetector";
import { useBugReportPrompt } from "@/hooks/useBugReportPrompt";
import BugPromptBanner from "@/components/BugPromptBanner";
import DynamicIslandOverlay from "@/components/ui/DynamicIslandOverlay";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUnifiedAdd, setShowUnifiedAdd] = useState(false);
  const [showAddChoice, setShowAddChoice] = useState(false);
  const [showPlanShow, setShowPlanShow] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [quoteHoldActive, setQuoteHoldActive] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [homeView, setHomeView] = useState<ContentView>("home");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [announcementsOpen, setAnnouncementsOpen] = useState(false);
  const [openShowId, setOpenShowId] = useState<string | null>(null);
  const [showSpotlightTour, setShowSpotlightTour] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  // Invite / compare flow state
  const [showCompareSheet, setShowCompareSheet] = useState(false);
  const [inviteShowId, setInviteShowId] = useState<string | null>(null);
  const [inviteShowType, setInviteShowType] = useState<"logged" | "upcoming">("logged");
  const [inviteHighlights, setInviteHighlights] = useState<string[]>([]);
  const [inviteNote, setInviteNote] = useState("");
  const [showWelcomeCarousel, setShowWelcomeCarousel] = useState(false);

  const showsStatRef = useRef<HTMLButtonElement | null>(null);
  const pendingAddFlowRef = useRef(false);

  // Loading = data not ready, or quote is being held for readability
  const loading = !dataReady || quoteHoldActive;
  const showLoader = !dataReady;

  const { showReassurance, showPrompt, elapsedMs, dismiss: dismissSlowLoad } = useSlowLoadDetector(showLoader);
  const { prompt, dismissPrompt, promptBugReport } = useBugReportPrompt();

  const navigateRef = useRef(navigate);
  navigateRef.current = navigate;

  // Detect invite params and open compare sheet after data is ready
  useEffect(() => {
    if (!dataReady) return;
    const isInvite = searchParams.get("invite") === "true";
    const showId = searchParams.get("show");
    const showType = (searchParams.get("type") as "logged" | "upcoming") || "logged";
    if (isInvite && showId) {
      // Read from localStorage — survives magic link new-tab navigation
      const highlights = JSON.parse(localStorage.getItem("invite_highlights") || "[]");
      const note = localStorage.getItem("invite_note") || "";
      setInviteShowId(showId);
      setInviteShowType(showType);
      setInviteHighlights(highlights);
      setInviteNote(note);
      // Clean up localStorage now that we've consumed the invite context
      localStorage.removeItem("invite_show_id");
      localStorage.removeItem("invite_show_type");
      localStorage.removeItem("invite_highlights");
      localStorage.removeItem("invite_note");
      localStorage.removeItem("invite_ref");
      // Cancel any pending onboarding add-show flow so it doesn't race with compare sheet
      pendingAddFlowRef.current = false;
      // Small delay so dashboard has rendered
      setTimeout(() => setShowCompareSheet(true), 600);
      // Clean up URL params
      setSearchParams({}, { replace: true });
    }
  }, [dataReady, searchParams, setSearchParams]);

  useEffect(() => {
    let isMounted = true;

    const checkOnboarding = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_step")
        .eq("id", userId)
        .maybeSingle();

      if (!isMounted) return;
      if (!profile?.onboarding_step || profile.onboarding_step !== "completed") {
        pendingAddFlowRef.current = true;
        supabase.from("profiles").update({ onboarding_step: "completed" }).eq("id", userId);
      }
    };

    // Listener for ONGOING auth changes — skip INITIAL_SESSION (handled by initializeAuth)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (!isMounted) return;
        if (event === "INITIAL_SESSION") return;
        setSession(session);
        if (event === "SIGNED_OUT") {
          navigateRef.current("/auth");
        } else if (event === "SIGNED_IN" && session) {
          setTimeout(() => checkOnboarding(session.user.id), 0);
        }
      }
    );

    // Safety valve: force loading off after 10s
    const timeout = setTimeout(() => {
      if (isMounted) { setDataReady(true); }
    }, 10000);

    // INITIAL load (controls loading)
    const initializeAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!isMounted) return;
        setSession(session);
        if (!session) {
          navigateRef.current("/auth");
        } else {
          await checkOnboarding(session.user.id);
        }
      } finally {
        if (isMounted) setDataReady(true);
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Open add flow once dashboard has rendered for new users
  useEffect(() => {
    if (!loading && pendingAddFlowRef.current) {
      pendingAddFlowRef.current = false;
      setShowUnifiedAdd(true);
    }
  }, [loading]);

  // Listen for API error events from data hooks
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      promptBugReport("api_error", detail, `Something went wrong loading your data (${detail.endpoint})`);
    };
    window.addEventListener("bug-report-api-error", handler);
    return () => window.removeEventListener("bug-report-api-error", handler);
  }, [promptBugReport]);



  if (!dataReady || quoteHoldActive) {
    return (
      <>
        <BrandedLoader fullScreen showReassurance={showReassurance} onQuoteVisible={() => setQuoteHoldActive(true)} onReadyToDismiss={() => setQuoteHoldActive(false)} />
        <BugPromptBanner
          visible={showPrompt}
          message={`Things are taking longer than usual (${(elapsedMs / 1000).toFixed(1)}s). Want to let us know?`}
          onReport={() => {
            dismissSlowLoad();
            setFeedbackOpen(true);
          }}
          onDismiss={dismissSlowLoad}
        />
        <FeedbackSheet
          open={feedbackOpen}
          onOpenChange={setFeedbackOpen}
          prefillDescription={`Page took ${(elapsedMs / 1000).toFixed(1)}s to load on ${window.location.pathname}`}
          errorContext={{ duration_ms: elapsedMs, page: window.location.pathname }}
        />
      </>
    );
  }

  if (!session) {
    return null;
  }

  const handleSpotlightTourComplete = async () => {
    if (session) {
      await supabase
        .from("profiles")
        .update({ onboarding_step: "completed" })
        .eq("id", session.user.id);
    }
    setShowSpotlightTour(false);
  };


  return (
    <div className="min-h-screen bg-gradient-accent pb-24">
      {/* Dev overlay */}
      {import.meta.env.DEV && <DynamicIslandOverlay />}

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 pt-safe">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <SceneLogo size="lg" className="text-white" />
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                className="relative w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10] transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-4 w-4 text-white/60" />
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="text-xs">
              No notifications yet
            </TooltipContent>
          </Tooltip>
        </div>
      </header>

      {/* Main Content — always mounted, toggled via display to preserve scroll */}
      <main className="container mx-auto px-4 py-4">
        <div style={{ display: activeTab === "home" ? "block" : "none" }}>
          <Home
            initialView={homeView}
            onNavigateToRank={() => setActiveTab("home")}
            onNavigateToProfile={() => setActiveTab("profile")}
            onAddFromPhotos={() => setShowUnifiedAdd(true)}
            onAddSingleShow={() => setShowAddDialog(true)}
            openShowId={openShowId}
            onShowOpened={() => setOpenShowId(null)}
            showsTourActive={showSpotlightTour && tourStepIndex === 2}
            showsRef={showsStatRef}
            onViewChange={(v) => setHomeView(v)}
          />
        </div>
        <div style={{ display: activeTab === "profile" ? "block" : "none" }}>
          <Profile
            onStartTour={() => { setActiveTab("home"); setShowSpotlightTour(true); }}
            onAddShow={() => { setActiveTab("home"); setShowUnifiedAdd(true); }}
          />
        </div>
      </main>

      <BottomNav
        activeTab={activeTab}
        homeView={homeView}
        feedbackOpen={feedbackOpen}
        showSpotlightTour={showSpotlightTour}
        tourStepIndex={tourStepIndex}
        showsStatRef={showsStatRef}
        onHomePress={() => {
          setActiveTab("home");
          setHomeView(prev => prev === "home" ? "" as ContentView : prev);
          requestAnimationFrame(() => setHomeView("home"));
        }}
        onCalendarPress={() => { setActiveTab("home"); setHomeView("calendar"); }}
        onFeedbackPress={() => setFeedbackOpen(true)}
        onProfilePress={() => setActiveTab("profile")}
        onAddPress={() => setShowAddChoice(true)}
      />

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
        onOpenChange={setShowUnifiedAdd}
        onNavigateToFeed={() => setActiveTab("home")}
        onNavigateToRank={() => setActiveTab("rank")}
        onAddManually={() => setShowAddDialog(true)}
      />

      <AddChoiceSheet
        open={showAddChoice}
        onOpenChange={setShowAddChoice}
        onLogShow={() => setShowUnifiedAdd(true)}
        onPlanShow={() => setShowPlanShow(true)}
      />

      <PlanShowSheet
        open={showPlanShow}
        onOpenChange={setShowPlanShow}
      />

      {/* API error / prompt banner — now opens FeedbackSheet */}
      <BugPromptBanner
        visible={prompt.open}
        message={prompt.prefillDescription || "Something went wrong. Want to report this?"}
        onReport={() => {
          dismissPrompt();
          setFeedbackOpen(true);
        }}
        onDismiss={dismissPrompt}
      />

      {/* Announcements Sheet — placeholder for feature announcements */}
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

      {/* Welcome Carousel — shown after invite show is saved */}
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

      {/* Compare Show Sheet — opens after invite magic link redirect */}
      {inviteShowId && (
        <CompareShowSheet
          open={showCompareSheet}
          onOpenChange={setShowCompareSheet}
          showId={inviteShowId}
          showType={inviteShowType}
          myHighlights={inviteHighlights}
          myNote={inviteNote}
          onContinueToAddShow={() => {
            setShowWelcomeCarousel(true);
          }}
        />
      )}

    </div>
  );
};

export default Dashboard;
