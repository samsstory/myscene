import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Home as HomeIcon, Globe, Scale, Plus, Music } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipProvider } from "@/components/ui/tooltip";
import Home from "@/components/Home";
import Profile from "@/components/Profile";
import Rank from "@/components/Rank";
import AddShowFlow, { AddedShowData } from "@/components/AddShowFlow";
import BulkUploadFlow from "@/components/BulkUploadFlow";
import { AddedShowData as BulkAddedShowData } from "@/hooks/useBulkShowUpload";
import WelcomeCarousel from "@/components/onboarding/WelcomeCarousel";
import SpotlightTour from "@/components/onboarding/SpotlightTour";
import FloatingTourTarget from "@/components/onboarding/FloatingTourTarget";
import BrandedLoader from "@/components/ui/BrandedLoader";

import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";
import SceneLogo from "@/components/ui/SceneLogo";

const Dashboard = () => {
  const navigate = useNavigate();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showUnifiedAdd, setShowUnifiedAdd] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [openShowId, setOpenShowId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSpotlightTour, setShowSpotlightTour] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  const rankButtonRef = useRef<HTMLButtonElement | null>(null);
  const globeButtonRef = useRef<HTMLButtonElement | null>(null);
  const showsStatRef = useRef<HTMLButtonElement | null>(null);
  const pendingAddFlowRef = useRef(false);

  // Only elevate z-index for FAB during tour steps 0 and 4 (first and last)
  const shouldElevateNavZ = showSpotlightTour && (tourStepIndex === 0 || tourStepIndex === 4);
  // Step 3 (index 2) targets the Shows stat pill
  const showsTourActive = showSpotlightTour && tourStepIndex === 2;
  // Step 4 (index 3) targets the Globe icon
  const globeTourActive = showSpotlightTour && tourStepIndex === 3;
  // Step 2 (index 1) targets the Rank icon
  const rankTourActive = showSpotlightTour && tourStepIndex === 1;

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        } else {
          // Check onboarding status
          const { data: profile } = await supabase
            .from("profiles")
            .select("onboarding_step")
            .eq("id", session.user.id)
            .single();
          
          if (!profile?.onboarding_step || profile.onboarding_step !== "completed") {
            setShowOnboarding(true);
          }
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      } else {
        // Check onboarding status
        const { data: profile } = await supabase
          .from("profiles")
          .select("onboarding_step")
          .eq("id", session.user.id)
          .single();
        
        if (!profile?.onboarding_step || profile.onboarding_step !== "completed") {
          setShowOnboarding(true);
        }
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Open add flow once dashboard has rendered after onboarding
  useEffect(() => {
    if (!showOnboarding && !loading && pendingAddFlowRef.current) {
      pendingAddFlowRef.current = false;
      setShowUnifiedAdd(true);
    }
  }, [showOnboarding, loading]);

  if (loading) {
    return <BrandedLoader fullScreen />;
  }

  if (!session) {
    return null;
  }

  const handleOnboardingComplete = () => {
    pendingAddFlowRef.current = true;
    setShowOnboarding(false);
    // Persist to DB in background
    if (session) {
      supabase
        .from("profiles")
        .update({ onboarding_step: "completed" })
        .eq("id", session.user.id);
    }
  };

  const handleTakeTour = async () => {
    if (session) {
      await supabase
        .from("profiles")
        .update({ onboarding_step: "spotlight_tour" })
        .eq("id", session.user.id);
    }
    setShowOnboarding(false);
    setShowSpotlightTour(true);
  };

  const handleSpotlightTourComplete = async () => {
    if (session) {
      await supabase
        .from("profiles")
        .update({ onboarding_step: "completed" })
        .eq("id", session.user.id);
    }
    setShowSpotlightTour(false);
  };

  // Show onboarding carousel for new users
  if (showOnboarding) {
    return <WelcomeCarousel onComplete={handleOnboardingComplete} onTakeTour={handleTakeTour} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <Home 
            onNavigateToRank={() => setActiveTab("rank")} 
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
            onAddFromPhotos={() => setShowUnifiedAdd(true)}
            onAddSingleShow={() => setShowAddDialog(true)}
          />
        );
      case "rank":
        return <Rank />;
      case "profile":
        return <Profile onStartTour={() => {
          setActiveTab("home");
          setShowSpotlightTour(true);
        }} />;
      default:
        return (
          <Home 
            onNavigateToRank={() => setActiveTab("rank")} 
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
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
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
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>

      {/* Floating Navigation */}
      <div className={cn(
        "fixed bottom-6 left-0 right-0 flex justify-between items-end px-6 gap-4",
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
                "flex flex-col items-center gap-0.5 transition-all py-1.5",
                rankTourActive && "opacity-0",
                activeTab === "rank" 
                  ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" 
                  : "text-white/60"
              )}
            >
              <Scale className="h-6 w-6" />
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

        {/* Floating FAB - Single tap to add */}
        <div className={cn("relative", showSpotlightTour && "z-[10001]")}>
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
        onShowAdded={() => {
          // Show added successfully - just close the dialog
        }}
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

      {/* Spotlight Tour - simplified, no longer needs FAB menu callbacks */}
      <SpotlightTour
        run={showSpotlightTour}
        onComplete={handleSpotlightTourComplete}
        onStepChange={setTourStepIndex}
      />

    </div>
  );
};

export default Dashboard;
