import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Scale, BarChart3, Plus, Music, Camera, X } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { TooltipProvider } from "@/components/ui/tooltip";
import Feed from "@/components/Feed";
import Stats from "@/components/Stats";
import Profile from "@/components/Profile";
import Rank from "@/components/Rank";
import AddShowFlow, { AddedShowData } from "@/components/AddShowFlow";
import BulkUploadFlow from "@/components/BulkUploadFlow";
import { ShareShowSheet } from "@/components/ShareShowSheet";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [showFabMenu, setShowFabMenu] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("feed");
  const [shareShow, setShareShow] = useState<AddedShowData | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (!session) {
          navigate("/auth");
        }
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (!session) {
        navigate("/auth");
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-accent flex items-center justify-center">
        <div className="text-center">
          <Music className="h-16 w-16 mx-auto mb-4 text-primary animate-pulse" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const renderContent = () => {
    switch (activeTab) {
      case "feed":
        return <Feed />;
      case "rank":
        return <Rank />;
      case "stats":
        return <Stats />;
      case "profile":
        return <Profile />;
      default:
        return <Feed />;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-accent pb-20">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
            Scene
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        {renderContent()}
      </main>

      {/* Bottom Navigation */}
      <TooltipProvider>
        <nav className="fixed bottom-0 left-0 right-0 bg-card/95 backdrop-blur-md border-t border-border z-50">
          <div className="container mx-auto px-4">
            <div className="flex items-end justify-between h-16 pb-2">
            {/* Home */}
            <button
              onClick={() => setActiveTab("feed")}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors flex-1",
                activeTab === "feed" ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Home className="h-6 w-6" />
            </button>

            {/* Rank */}
            <button
              onClick={() => setActiveTab("rank")}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors flex-1",
                activeTab === "rank" ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Scale className="h-6 w-6" />
            </button>

            {/* Add Show Button - Elevated with Menu */}
            <div className="flex-1 flex justify-center relative">
              {/* FAB Menu Options */}
              {showFabMenu && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 bg-black/40 z-40"
                    onClick={() => setShowFabMenu(false)}
                  />
                  
                  {/* Menu Options */}
                  <div className="absolute bottom-20 z-50 flex flex-col gap-3 items-center">
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
              
              {/* Main FAB */}
              <button
                onClick={() => setShowFabMenu(!showFabMenu)}
                className={cn(
                  "bg-primary text-primary-foreground rounded-full p-4 shadow-glow transition-all hover:scale-105 active:scale-95 -mt-8 z-50",
                  showFabMenu && "rotate-45"
                )}
              >
                {showFabMenu ? <X className="h-8 w-8" /> : <Plus className="h-8 w-8" />}
              </button>
            </div>

            {/* Stats */}
            <button
              onClick={() => setActiveTab("stats")}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors flex-1",
                activeTab === "stats" ? "text-primary" : "text-muted-foreground"
              )}
            >
              <BarChart3 className="h-6 w-6" />
            </button>

            {/* Profile */}
            <button
              onClick={() => setActiveTab("profile")}
              className={cn(
                "flex flex-col items-center justify-center gap-1 transition-colors flex-1",
                activeTab === "profile" ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Avatar className="h-7 w-7 border-2 border-transparent transition-colors data-[active=true]:border-primary" data-active={activeTab === "profile"}>
                <AvatarImage src={session?.user?.user_metadata?.avatar_url} />
                <AvatarFallback className="text-xs">
                  {session?.user?.email?.charAt(0).toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
            </button>
            </div>
          </div>
        </nav>
      </TooltipProvider>

      <AddShowFlow 
        open={showAddDialog} 
        onOpenChange={setShowAddDialog} 
        onShowAdded={(show) => {
          setShareShow(show);
          setShareSheetOpen(true);
        }}
      />

      <BulkUploadFlow
        open={showBulkUpload}
        onOpenChange={setShowBulkUpload}
      />

      {shareShow && (
        <ShareShowSheet
          open={shareSheetOpen}
          onOpenChange={setShareSheetOpen}
          show={{
            id: shareShow.id,
            artists: shareShow.artists,
            venue: shareShow.venue,
            date: shareShow.date,
            rating: shareShow.rating,
            artistPerformance: shareShow.artistPerformance,
            sound: shareShow.sound,
            lighting: shareShow.lighting,
            crowd: shareShow.crowd,
            venueVibe: shareShow.venueVibe,
          }}
        />
      )}
    </div>
  );
};

export default Dashboard;
