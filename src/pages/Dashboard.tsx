import { useState, useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Home as HomeIcon, Globe, Scale, Plus, Music } from "lucide-react";
import { useHomeStats } from "@/hooks/useHomeStats";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/components/Home";
import Profile from "@/components/Profile";
import Rank from "@/components/Rank";
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
import BugReportButton from "@/components/BugReportButton";
import { useSlowLoadDetector } from "@/hooks/useSlowLoadDetector";
import { useBugReportPrompt } from "@/hooks/useBugReportPrompt";
import BugPromptBanner from "@/components/BugPromptBanner";
import DynamicIslandOverlay from "@/components/ui/DynamicIslandOverlay";

const Dashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUnifiedAdd, setShowUnifiedAdd] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [quoteHoldActive, setQuoteHoldActive] = useState(false);
  const [dataReady, setDataReady] = useState(false);
  const [activeTab, setActiveTab] = useState("home");
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

  const rankButtonRef = useRef<HTMLButtonElement | null>(null);
  const globeButtonRef = useRef<HTMLButtonElement | null>(null);
  const showsStatRef = useRef<HTMLButtonElement | null>(null);
  const pendingAddFlowRef = useRef(false);

  // Loading = data not ready, or quote is being held for readability
  const loading = !dataReady || quoteHoldActive;
  const showLoader = !dataReady;

  const { showReassurance, showPrompt, elapsedMs, dismiss: dismissSlowLoad } = useSlowLoadDetector(showLoader);
  const { prompt, dismissPrompt, openReport, reportOpen, setReportOpen } = useBugReportPrompt();
  const { stats } = useHomeStats();

  // Only elevate z-index for FAB during tour steps 0 and 4 (first and last)
  const shouldElevateNavZ = showSpotlightTour && (tourStepIndex === 0 || tourStepIndex === 4);
  // Step 3 (index 2) targets the Shows stat pill
  const showsTourActive = showSpotlightTour && tourStepIndex === 2;
  // Step 4 (index 3) targets the Globe icon
  const globeTourActive = showSpotlightTour && tourStepIndex === 3;
  // Step 2 (index 1) targets the Rank icon
  const rankTourActive = showSpotlightTour && tourStepIndex === 1;

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
        <BugReportButton />
        <BugPromptBanner
          visible={showPrompt}
          message={`Things are taking longer than usual (${(elapsedMs / 1000).toFixed(1)}s). Want to let us know?`}
          onReport={() => {
            dismissSlowLoad();
            setReportOpen(true);
          }}
          onDismiss={dismissSlowLoad}
        />
        {reportOpen && (
          <BugReportButton
            externalOpen={reportOpen}
            onExternalClose={() => setReportOpen(false)}
            prefillDescription={`Page took ${(elapsedMs / 1000).toFixed(1)}s to load on ${window.location.pathname}`}
            errorContext={{ duration_ms: elapsedMs, page: window.location.pathname }}
            reportType="slow_load"
          />
        )}
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

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <Home 
            onNavigateToRank={() => setActiveTab("rank")} 
            onNavigateToProfile={() => setActiveTab("profile")}
            onAddFromPhotos={() => setShowUnifiedAdd(true)}
            onAddSingleShow={() => setShowAddDialog(true)}
            openShowId={openShowId}
            onShowOpened={() => setOpenShowId(null)}
            showsTourActive={showsTourActive}
            showsRef={showsStatRef}
          />
        );
      case "globe":
        return (
          <Home 
            initialView="globe"
            onNavigateToRank={() => setActiveTab("rank")} 
            onNavigateToProfile={() => setActiveTab("profile")}
            onAddFromPhotos={() => setShowUnifiedAdd(true)}
            onAddSingleShow={() => setShowAddDialog(true)}
          />
        );
      case "rank":
        return <Rank onAddShow={() => setShowUnifiedAdd(true)} onViewAllShows={() => setActiveTab("home")} />;
      case "profile":
        return <Profile onStartTour={() => {
          setActiveTab("home");
          setShowSpotlightTour(true);
        }} onAddShow={() => {
          setActiveTab("home");
          setShowUnifiedAdd(true);
        }} />;
      default:
        return (
          <Home 
            onNavigateToRank={() => setActiveTab("rank")} 
            onNavigateToProfile={() => setActiveTab("profile")}
            onAddFromPhotos={() => setShowUnifiedAdd(true)}
            onAddSingleShow={() => setShowAddDialog(true)}
            openShowId={openShowId}
            onShowOpened={() => setOpenShowId(null)}
            showsTourActive={showsTourActive}
            showsRef={showsStatRef}
          />
        );
    }
  };

  return (
    <div className="min-h-screen bg-gradient-accent pb-24">
      {/* Dev overlay */}
      {import.meta.env.DEV && <DynamicIslandOverlay />}

      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50 pt-safe">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <SceneLogo size="lg" className="text-white" />
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
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-4">
        {renderContent()}
      </main>

      {/* Floating Navigation */}
      <div className={cn(
        "fixed bottom-6 left-0 right-0 flex justify-between items-end px-6 gap-4 pb-safe",
        shouldElevateNavZ ? "z-[10001]" : "z-50"
      )}>
        {/* Left spacer to balance FAB for centering pill */}
        <div className="w-0 shrink-0" />
        
        {/* Glass Pill Navigation */}
        <nav className="backdrop-blur-xl bg-black/40 border border-white/20 rounded-full px-8 py-3 shadow-2xl">
          <div className="flex items-center gap-10">
            {/* Home */}
            <button
              onClick={() => setActiveTab("home")}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-all py-1.5",
                activeTab === "home" 
                  ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" 
                  : "text-white/60"
              )}
            >
              <HomeIcon className="h-6 w-6" />
            </button>

            {/* Globe */}
            <button
              onClick={() => setActiveTab("globe")}
              ref={globeButtonRef}
              data-tour={globeTourActive ? undefined : "nav-globe"}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-all py-1.5",
                globeTourActive && "opacity-0",
                activeTab === "globe" 
                  ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" 
                  : "text-white/60"
              )}
            >
              <Globe className="h-6 w-6" />
            </button>

            {/* Rank */}
            <button
              onClick={() => setActiveTab("rank")}
              ref={rankButtonRef}
              data-tour={rankTourActive ? undefined : "nav-rank"}
              className={cn(
                "relative flex flex-col items-center gap-0.5 transition-all py-1.5",
                rankTourActive && "opacity-0",
                activeTab === "rank" 
                  ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" 
                  : "text-white/60"
              )}
            >
              <Scale className="h-6 w-6" />
              {/* Nudge dot for unranked shows or incomplete tags */}
              {activeTab !== "rank" && (stats.unrankedCount > 0 || stats.incompleteTagsCount > 0) && (
                <span className="absolute -top-0.5 -right-1 h-2 w-2 rounded-full bg-primary shadow-[0_0_6px_hsl(var(--primary)/0.8)]" />
              )}
            </button>
          </div>
        </nav>

        {/* Floating Rank target for tour step 2 (index 1) */}
        <FloatingTourTarget active={rankTourActive} targetRef={rankButtonRef} dataTour="nav-rank">
          <Scale
            className="h-7 w-7 text-primary"
            strokeWidth={2.75}
            style={{
              filter:
                "drop-shadow(0 0 10px hsl(var(--primary) / 0.95)) drop-shadow(0 0 26px hsl(var(--primary) / 0.7))",
            }}
          />
        </FloatingTourTarget>

        {/* Floating Globe target for tour step 4 (index 3) */}
        <FloatingTourTarget active={globeTourActive} targetRef={globeButtonRef} dataTour="nav-globe">
          <Globe
            className="h-7 w-7 text-primary"
            strokeWidth={2.75}
            style={{
              filter:
                "drop-shadow(0 0 10px hsl(var(--primary) / 0.95)) drop-shadow(0 0 26px hsl(var(--primary) / 0.7))",
            }}
          />
        </FloatingTourTarget>

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

        {/* FAB stack — bug report + add button */}
        <div className={cn("flex flex-col items-center gap-3", showSpotlightTour && "z-[10001]")}>
          <BugReportButton
            externalOpen={reportOpen}
            onExternalClose={() => setReportOpen(false)}
            prefillDescription={prompt.prefillDescription}
            errorContext={prompt.errorContext}
            reportType={prompt.type}
          />
          {/* FAB Button */}
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
            {/* Shimmer overlay */}
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

      {/* API error / prompt banner */}
      <BugPromptBanner
        visible={prompt.open}
        message={prompt.prefillDescription || "Something went wrong. Want to report this?"}
        onReport={() => {
          dismissPrompt();
          setReportOpen(true);
        }}
        onDismiss={dismissPrompt}
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
