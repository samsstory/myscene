import { useState, useEffect } from "react";
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
    return (
      <div className="min-h-screen bg-gradient-accent flex items-center justify-center">
        <div className="text-center animate-pulse">
          <SceneLogo size="lg" className="text-2xl" />
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const handleOnboardingComplete = async () => {
    if (session) {
      await supabase
        .from("profiles")
        .update({ onboarding_step: "completed" })
        .eq("id", session.user.id);
    }
    setShowOnboarding(false);
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
        return <Profile />;
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
      <div className="fixed bottom-6 left-0 right-0 z-50 flex justify-between items-end px-6 gap-4">
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
              className={cn(
                "flex flex-col items-center gap-0.5 transition-all py-1.5",
                activeTab === "rank" 
                  ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" 
                  : "text-white/60"
              )}
            >
              <Scale className="h-6 w-6" />
            </button>
          </div>
        </nav>

        {/* Floating FAB */}
        <div className="relative">
          {showFabMenu && (
            <>
              {/* Backdrop */}
              <div 
                className="fixed inset-0 bg-black/40 z-40"
                onClick={() => setShowFabMenu(false)}
              />
              
              {/* Menu Options */}
              <div className="absolute bottom-16 right-0 z-50 flex flex-col gap-3 items-end">
                {/* Add from Photos */}
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    setShowBulkUpload(true);
                  }}
                  className="flex items-center gap-3 bg-card border border-border rounded-full pl-4 pr-5 py-3 shadow-lg hover:bg-accent transition-colors animate-in fade-in slide-in-from-bottom-2"
                >
                  <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Camera className="h-5 w-5 text-primary" />
                  </div>
                  <span className="font-medium whitespace-nowrap">Add from Photos</span>
                </button>
                
                {/* Add Single Show */}
                <button
                  onClick={() => {
                    setShowFabMenu(false);
                    setShowAddDialog(true);
                  }}
                  className="flex items-center gap-3 bg-card border border-border rounded-full pl-4 pr-5 py-3 shadow-lg hover:bg-accent transition-colors animate-in fade-in slide-in-from-bottom-2"
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
            className={cn(
              "backdrop-blur-xl bg-primary/90 border border-white/30 text-primary-foreground rounded-full p-5 shadow-2xl transition-all hover:scale-105 active:scale-95 z-50",
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

    </div>
  );
};

export default Dashboard;
