import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ContentView } from "@/components/home/ContentPillNav";
import Home from "@/components/Home";
import Profile from "@/components/Profile";
import BottomNav from "@/components/BottomNav";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import DashboardSheets from "@/components/dashboard/DashboardSheets";
import DynamicIslandOverlay from "@/components/ui/DynamicIslandOverlay";

import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { useSlowLoadDetector } from "@/hooks/useSlowLoadDetector";
import { useBugReportPrompt } from "@/hooks/useBugReportPrompt";

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
      const highlights = JSON.parse(localStorage.getItem("invite_highlights") || "[]");
      const note = localStorage.getItem("invite_note") || "";
      setInviteShowId(showId);
      setInviteShowType(showType);
      setInviteHighlights(highlights);
      setInviteNote(note);
      localStorage.removeItem("invite_show_id");
      localStorage.removeItem("invite_show_type");
      localStorage.removeItem("invite_highlights");
      localStorage.removeItem("invite_note");
      localStorage.removeItem("invite_ref");
      pendingAddFlowRef.current = false;
      setTimeout(() => setShowCompareSheet(true), 600);
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

    const timeout = setTimeout(() => {
      if (isMounted) setDataReady(true);
    }, 10000);

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
    const loading = !dataReady || quoteHoldActive;
    if (!loading && pendingAddFlowRef.current) {
      pendingAddFlowRef.current = false;
      setShowUnifiedAdd(true);
    }
  }, [dataReady, quoteHoldActive]);

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
      <DashboardLoadingState
        showReassurance={showReassurance}
        showPrompt={showPrompt}
        elapsedMs={elapsedMs}
        onQuoteVisible={() => setQuoteHoldActive(true)}
        onReadyToDismiss={() => setQuoteHoldActive(false)}
        onDismissSlowLoad={dismissSlowLoad}
        feedbackOpen={feedbackOpen}
        onFeedbackOpenChange={setFeedbackOpen}
      />
    );
  }

  if (!session) return null;

  return (
    <div className="min-h-screen bg-gradient-accent pb-24">
      {import.meta.env.DEV && <DynamicIslandOverlay />}

      <DashboardHeader />

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

      <DashboardSheets
        session={session}
        showAddDialog={showAddDialog}
        setShowAddDialog={setShowAddDialog}
        showUnifiedAdd={showUnifiedAdd}
        setShowUnifiedAdd={setShowUnifiedAdd}
        showAddChoice={showAddChoice}
        setShowAddChoice={setShowAddChoice}
        showPlanShow={showPlanShow}
        setShowPlanShow={setShowPlanShow}
        setActiveTab={setActiveTab}
        setHomeView={setHomeView}
        setOpenShowId={setOpenShowId}
        prompt={prompt}
        dismissPrompt={dismissPrompt}
        feedbackOpen={feedbackOpen}
        setFeedbackOpen={setFeedbackOpen}
        announcementsOpen={announcementsOpen}
        setAnnouncementsOpen={setAnnouncementsOpen}
        showSpotlightTour={showSpotlightTour}
        setShowSpotlightTour={setShowSpotlightTour}
        tourStepIndex={tourStepIndex}
        setTourStepIndex={setTourStepIndex}
        showWelcomeCarousel={showWelcomeCarousel}
        setShowWelcomeCarousel={setShowWelcomeCarousel}
        showCompareSheet={showCompareSheet}
        setShowCompareSheet={setShowCompareSheet}
        inviteShowId={inviteShowId}
        inviteShowType={inviteShowType}
        inviteHighlights={inviteHighlights}
        inviteNote={inviteNote}
      />
    </div>
  );
};

export default Dashboard;
