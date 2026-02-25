import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import type { ContentView } from "@/components/home/ContentPillNav";
import type { FestivalResult } from "@/components/festival-claim/FestivalSearchStep";
import Home from "@/components/Home";
import Profile from "@/components/Profile";
import BottomNav from "@/components/BottomNav";
import DashboardHeader from "@/components/dashboard/DashboardHeader";
import DashboardLoadingState from "@/components/dashboard/DashboardLoadingState";
import DashboardSheets from "@/components/dashboard/DashboardSheets";
import DynamicIslandOverlay from "@/components/ui/DynamicIslandOverlay";

import { supabase } from "@/integrations/supabase/client";
import { truncateArtists } from "@/lib/utils";
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
  const [inviteShowType, setInviteShowType] = useState<"logged" | "upcoming" | "edmtrain">("logged");
  const [inviteHighlights, setInviteHighlights] = useState<string[]>([]);
  const [inviteNote, setInviteNote] = useState("");
  const [showWelcomeCarousel, setShowWelcomeCarousel] = useState(false);
  const [festivalInviteState, setFestivalInviteState] = useState<{ festival: FestivalResult; selectedArtists: string[] } | null>(null);

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
    const showType = (searchParams.get("type") as "logged" | "upcoming" | "edmtrain") || "logged";
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

      if (showType === "edmtrain") {
        // Auto-add the edmtrain event to user's upcoming schedule
        const addEdmtrainEvent = async () => {
          try {
            const edmtrainId = parseInt(showId, 10);
            if (isNaN(edmtrainId)) return;
            const { data: eventData } = await supabase.rpc("get_edmtrain_event_preview" as any, { p_edmtrain_id: edmtrainId });
            const event = Array.isArray(eventData) ? eventData[0] : eventData;
            if (!event) return;
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;
            const rsvpParam = searchParams.get("rsvp") || "going";
            await supabase.from("upcoming_shows").insert({
              created_by_user_id: user.id,
              artist_name: event.event_name || truncateArtists(event.artist_names || "Event", 3),
              venue_name: event.venue_name,
              venue_location: event.venue_location,
              show_date: event.event_date,
              artist_image_url: event.artist_image_url,
              rsvp_status: rsvpParam,
              source_url: event.event_link,
            });
            const { toast } = await import("sonner");
            const artistLabel = event.event_name || truncateArtists(event.artist_names || "Event", 3);
            const dateLabel = event.event_date
              ? await (async () => { try { const { format, parseISO } = await import("date-fns"); return format(parseISO(event.event_date), "MMM d, yyyy"); } catch { return event.event_date; } })()
              : null;
            toast.success(`${artistLabel} added to your schedule`, {
              description: [event.venue_name, dateLabel].filter(Boolean).join(" · "),
              duration: 5000,
              icon: "🎶",
            });
          } catch (err) {
            console.error("Failed to add edmtrain event:", err);
          }
        };
        addEdmtrainEvent();
      } else {
        setTimeout(() => setShowCompareSheet(true), 600);
      }
      setSearchParams({}, { replace: true });
    }
  }, [dataReady, searchParams, setSearchParams]);

  // Detect festival invite redirect from localStorage (post-auth)
  useEffect(() => {
    if (!dataReady) return;
    const inviteType = localStorage.getItem("invite_type");
    if (inviteType !== "festival-invite") return;

    const lineupId = localStorage.getItem("invite_festival_lineup_id") || "";
    const festivalName = localStorage.getItem("invite_festival_name") || "";
    const selectedArtists: string[] = JSON.parse(localStorage.getItem("invite_selected_artists") || "[]");

    // Clean up
    localStorage.removeItem("invite_type");
    localStorage.removeItem("invite_festival_lineup_id");
    localStorage.removeItem("invite_selected_artists");
    localStorage.removeItem("invite_festival_name");
    localStorage.removeItem("invite_ref");

    if (!lineupId) return;

    // Fetch the lineup data to build a FestivalResult
    const loadFestival = async () => {
      const { data: lineup } = await supabase
        .from("festival_lineups")
        .select("id, event_name, year, date_start, date_end, venue_name, venue_location, venue_id, artists")
        .eq("id", lineupId)
        .maybeSingle();

      if (!lineup) return;

      const artists = (Array.isArray(lineup.artists) ? lineup.artists : []).map((a: any) => ({
        name: typeof a === "string" ? a : a.name,
        day: a.day,
        stage: a.stage,
      }));

      const festival: FestivalResult = {
        id: lineup.id,
        event_name: lineup.event_name || festivalName,
        year: lineup.year,
        date_start: lineup.date_start,
        date_end: lineup.date_end,
        venue_name: lineup.venue_name,
        venue_location: lineup.venue_location,
        venue_id: lineup.venue_id,
        artists,
      };

      pendingAddFlowRef.current = false;
      setFestivalInviteState({ festival, selectedArtists });
      setTimeout(() => setShowUnifiedAdd(true), 400);
    };

    loadFestival();
  }, [dataReady]);

  useEffect(() => {
    let isMounted = true;

    const checkOnboarding = async (userId: string) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("onboarding_step, onboarding_completed_at")
        .eq("id", userId)
        .maybeSingle();

      if (!isMounted) return;

      // Only trigger add-flow for genuinely new users who have never completed onboarding
      // AND have no shows yet (i.e. truly first session)
      if (profile && !profile.onboarding_completed_at) {
        const { count } = await supabase
          .from("shows")
          .select("id", { count: "exact", head: true })
          .eq("user_id", userId);

        if (!isMounted) return;

        if (count === 0) {
          // Brand-new user — show welcome carousel
          pendingAddFlowRef.current = true;
        }
        // Mark onboarding as done so this never triggers again
        supabase.from("profiles").update({
          onboarding_step: "completed",
          onboarding_completed_at: new Date().toISOString(),
        }).eq("id", userId);
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

  // Open welcome carousel for new users once dashboard has rendered
  useEffect(() => {
    const loading = !dataReady || quoteHoldActive;
    if (!loading && pendingAddFlowRef.current) {
      pendingAddFlowRef.current = false;
      setShowWelcomeCarousel(true);
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
        festivalInviteState={festivalInviteState}
        onFestivalInviteClear={() => setFestivalInviteState(null)}
      />
    </div>
  );
};

export default Dashboard;
