import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Home as HomeIcon, Globe, Scale, Plus, Music, Camera, X } from "lucide-react";
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
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("home");
  const [openShowId, setOpenShowId] = useState<string | null>(null);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSpotlightTour, setShowSpotlightTour] = useState(false);
  const [tourStepIndex, setTourStepIndex] = useState(0);

  const rankButtonRef = useRef<HTMLButtonElement | null>(null);

  // Only elevate z-index for FAB-related steps (0, 1, 2, 6) - not for nav item steps
  const shouldElevateNavZ = showSpotlightTour && (tourStepIndex <= 2 || tourStepIndex === 6);

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

  if (loading) {
    return <BrandedLoader fullScreen />;
  }

  if (!session) {
    return null;
  }

  const handleOnboardingComplete = async () => {
    if (session) {
      await supabase
        .from("profiles")
        .update({ onboarding_step: "spotlight_tour" })
        .eq("id", session.user.id);
    }
    setShowOnboarding(false);
    // Start the spotlight tour after carousel
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
    return <WelcomeCarousel onComplete={handleOnboardingComplete} />;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "home":
        return (
          <Home 
            onNavigateToRank={() => setActiveTab("rank")} 
            onAddFromPhotos={() => setShowBulkUpload(true)}
            onAddSingleShow={() => setShowAddDialog(true)}
            openShowId={openShowId}
            onShowOpened={() => setOpenShowId(null)}
          />
        );
      case "globe":
        return (
          <Home 
            initialView="globe"
            onNavigateToRank={() => setActiveTab("rank")} 
            onAddFromPhotos={() => setShowBulkUpload(true)}
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
            onAddFromPhotos={() => setShowBulkUpload(true)}
            onAddSingleShow={() => setShowAddDialog(true)}
            openShowId={openShowId}
            onShowOpened={() => setOpenShowId(null)}
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
              data-tour="nav-globe"
              className={cn(
                "flex flex-col items-center gap-0.5 transition-all py-1.5",
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
              data-tour={showSpotlightTour && tourStepIndex === 3 ? undefined : "nav-rank"}
              className={cn(
                "flex flex-col items-center gap-0.5 transition-all py-1.5",
                showSpotlightTour && tourStepIndex === 3 && "opacity-0",
                activeTab === "rank" 
                  ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" 
                  : "text-white/60"
              )}
            >
              <Scale className="h-6 w-6" />
            </button>
          </div>
        </nav>

        {/* Floating Rank target for tour step 4 (index 3) */}
        <FloatingTourTarget active={showSpotlightTour && tourStepIndex === 3} targetRef={rankButtonRef} dataTour="nav-rank">
          <Scale 
            className="h-6 w-6" 
            style={{ 
              color: "hsl(189 94% 55%)", 
              filter: "drop-shadow(0 0 8px hsl(189 94% 55%)) drop-shadow(0 0 16px hsl(189 94% 55%))" 
            }} 
          />
        </FloatingTourTarget>

        {/* Floating FAB */}
        <div className={cn("relative", showSpotlightTour && "z-[10001]")}>
          {showFabMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setShowFabMenu(false)}
              />
              
              {/* Menu Options */}
              <div className={cn(
                "absolute bottom-16 right-0 flex flex-col gap-3 items-end",
                showSpotlightTour ? "z-[10001]" : "z-50"
              )}>
                {/* Add from Photos */}
                <button
                  onClick={() => {
                    if (showSpotlightTour) return; // Don't trigger during tour
                    setShowFabMenu(false);
                    setShowBulkUpload(true);
                  }}
                  data-tour="add-photos"
                  className={cn(
                    "flex items-center gap-3 bg-card border border-border rounded-full pl-4 pr-5 py-3 shadow-lg hover:bg-accent transition-colors animate-in fade-in slide-in-from-bottom-2",
                    showSpotlightTour && "z-[10001]"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium whitespace-nowrap">Add from Photos</span>
                </button>
                
                {/* Add Single Show */}
                <button
                  onClick={() => {
                    if (showSpotlightTour) return; // Don't trigger during tour
                    setShowFabMenu(false);
                    setShowAddDialog(true);
                  }}
                  data-tour="add-single"
                  className={cn(
                    "flex items-center gap-3 bg-card border border-border rounded-full pl-4 pr-5 py-3 shadow-lg hover:bg-accent transition-colors animate-in fade-in slide-in-from-bottom-2",
                    showSpotlightTour && "z-[10001]"
                  )}
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Music className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium whitespace-nowrap">Add Single Show</span>
                </button>
              </div>
            </>
          )}
          
          {/* FAB Button */}
          <button
            onClick={() => setShowFabMenu(!showFabMenu)}
            data-tour="fab"
            className={cn(
              "backdrop-blur-xl bg-primary/90 border border-white/30 text-primary-foreground rounded-full p-5 shadow-2xl transition-all hover:scale-105 active:scale-95",
              showSpotlightTour ? "z-[10001]" : "z-50",
              showFabMenu && "rotate-45 bg-white/20"
            )}
          >
            {showFabMenu ? <X className="h-9 w-9" /> : <Plus className="h-9 w-9" />}
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
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
        onNavigateToFeed={() => setActiveTab("home")}
        onNavigateToRank={() => setActiveTab("rank")}
      />

      {/* Spotlight Tour */}
      <SpotlightTour
        run={showSpotlightTour}
        onComplete={handleSpotlightTourComplete}
        onOpenFabMenu={() => setShowFabMenu(true)}
        onCloseFabMenu={() => setShowFabMenu(false)}
        fabMenuOpen={showFabMenu}
        onStepChange={setTourStepIndex}
      />

    </div>
  );
};

export default Dashboard;
