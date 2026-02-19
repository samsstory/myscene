import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { Home as HomeIcon, Plus, Music, CalendarDays, Bell } from "lucide-react";
import { useHomeStats } from "@/hooks/useHomeStats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/components/Home";
import type { ContentView } from "@/components/home/ContentPillNav";
import Profile from "@/components/Profile";

import AddShowFlow, { AddedShowData } from "@/components/AddShowFlow";
import BulkUploadFlow from "@/components/BulkUploadFlow";
import { AddedShowData as BulkAddedShowData } from "@/hooks/useBulkShowUpload";
import SpotlightTour from "@/components/onboarding/SpotlightTour";
import FloatingTourTarget from "@/components/onboarding/FloatingTourTarget";
import WelcomeCarousel from "@/components/onboarding/WelcomeCarousel";
import BrandedLoader from "@/components/ui/BrandedLoader";
import CompareShowSheet from "@/components/CompareShowSheet";

import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import SceneLogo from "@/components/ui/SceneLogo";
import FeedbackSheet from "@/components/FeedbackSheet";
import FriendsPanel from "@/components/FriendsPanel";
import { useSlowLoadDetector } from "@/hooks/useSlowLoadDetector";
import { useBugReportPrompt } from "@/hooks/useBugReportPrompt";
import BugPromptBanner from "@/components/BugPromptBanner";
import DynamicIslandOverlay from "@/components/ui/DynamicIslandOverlay";

// Soft haptic tap — silently ignored on desktop / unsupported browsers
const haptic = () => { try { navigator.vibrate?.(6); } catch {} };

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUnifiedAdd, setShowUnifiedAdd] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [quoteHoldActive, setQuoteHoldActive] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
  const [homeView, setHomeView] = useState<ContentView>("home");
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [friendsPanelOpen, setFriendsPanelOpen] = useState(false);
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
  const { prompt, dismissPrompt, openReport: _openReport, reportOpen, setReportOpen } = useBugReportPrompt();
  const { stats } = useHomeStats();

  // Only elevate z-index for FAB during tour step 0 (first step)
  const shouldElevateNavZ = showSpotlightTour && tourStepIndex === 0;
  // Step 3 (index 2) targets the Shows stat pill
  const showsTourActive = showSpotlightTour && tourStepIndex === 2;

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
  const { promptBugReport } = useBugReportPrompt();
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
          <div className="flex items-center gap-3">
            {/* Friends / activity icon */}
            <button
              onClick={() => setFriendsPanelOpen(true)}
              className="relative w-9 h-9 rounded-full flex items-center justify-center bg-white/[0.06] border border-white/[0.10] hover:bg-white/[0.10] transition-colors"
              aria-label="Friend activity"
            >
              <Bell className="h-4 w-4 text-white/60" />
            </button>
            <button
              onClick={() => setActiveTab("profile")}
              className="transition-transform hover:scale-105"
            >
              <Avatar className={cn(
                "h-9 w-9 border-2 transition-colors",
                activeTab === "profile" ? "border-primary" : "border-transparent"
              )}>
                <AvatarImage src={session?.user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-sm bg-muted">
                  {session?.user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
          </div>
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
            showsTourActive={showsTourActive}
            showsRef={showsStatRef}
          />
        </div>
        <div style={{ display: activeTab === "profile" ? "block" : "none" }}>
          <Profile
            onStartTour={() => { setActiveTab("home"); setShowSpotlightTour(true); }}
            onAddShow={() => { setActiveTab("home"); setShowUnifiedAdd(true); }}
          />
        </div>
      </main>

      {/* Floating Navigation */}
      <div className={cn(
        "fixed bottom-6 left-0 right-0 flex justify-between items-end px-6 gap-4 pb-safe",
        shouldElevateNavZ ? "z-[10001]" : "z-50"
      )}>
        {/* Left spacer */}
        <div className="w-0 shrink-0" />

        {/* Glass Pill Navigation — Home | Schedule | Feedback | Profile */}
        <nav className="backdrop-blur-xl bg-black/40 border border-white/20 rounded-full px-6 py-3 shadow-2xl">
          <div className="flex items-center gap-8">
            {/* Home */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={() => { haptic(); setActiveTab("home"); setHomeView("home"); }}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-colors py-1.5",
                activeTab === "home" && homeView === "home"
                  ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]"
                  : "text-white/60"
              )}
            >
              <HomeIcon className="h-6 w-6" />
            </motion.button>

            {/* Schedule */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={() => { haptic(); setActiveTab("home"); setHomeView("calendar"); }}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-colors py-1.5",
                activeTab === "home" && homeView === "calendar"
                  ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]"
                  : "text-white/60"
              )}
              aria-label="Schedule"
            >
              <CalendarDays className="h-6 w-6" />
            </motion.button>

            {/* Feedback */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={() => { haptic(); setFeedbackOpen(true); }}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-colors py-1.5",
                feedbackOpen
                  ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]"
                  : "text-white/60 hover:text-white/90"
              )}
              aria-label="Share feedback"
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
            </motion.button>

            {/* Profile */}
            <motion.button
              whileTap={{ scale: 0.88 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onClick={() => { haptic(); setActiveTab("profile"); }}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-colors py-1.5",
                activeTab === "profile"
                  ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]"
                  : "text-white/60"
              )}
            >
              <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
              </svg>
            </motion.button>
          </div>
        </nav>

        {/* Floating Rank target for tour step 2 (index 1) */}
        {/* Floating Shows stat pill target for tour step 3 (index 2) */}
        <FloatingTourTarget active={showsTourActive} targetRef={showsStatRef} dataTour="stat-shows">
          <div 
            className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.08] border border-white/20"
            style={{
              boxShadow: "0 0 12px hsl(var(--primary) / 0.4), 0 0 24px hsl(var(--primary) / 0.2)",
            }}
          >
            <Music 
              className="h-4 w-4 text-primary" 
              style={{ 
                filter: "drop-shadow(0 0 6px hsl(var(--primary) / 0.9))" 
              }} 
            />
            <div className="flex flex-col items-start">
              <span className="text-[9px] uppercase tracking-[0.15em] text-white/50 font-medium">
                Shows
              </span>
              <span 
                className="text-lg font-bold text-white/90"
                style={{ textShadow: "0 0 10px rgba(255,255,255,0.4)" }}
              >
                {/* Use placeholder; the actual count comes from the original pill */}
                –
              </span>
            </div>
          </div>
        </FloatingTourTarget>

        {/* FAB — add show */}
        <div className={cn("flex flex-col items-center gap-3", showSpotlightTour && "z-[10001]")}>
          <button
            onClick={() => {
              if (showSpotlightTour) return;
              setShowUnifiedAdd(true);
            }}
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

      {/* Friends Panel */}
      <FriendsPanel open={friendsPanelOpen} onOpenChange={setFriendsPanelOpen} />

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
