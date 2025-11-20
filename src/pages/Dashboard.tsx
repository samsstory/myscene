import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Home, Compass, BarChart3, Plus, Music } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Feed from "@/components/Feed";
import Stats from "@/components/Stats";
import Profile from "@/components/Profile";
import AddShowFlow from "@/components/AddShowFlow";
import { supabase } from "@/integrations/supabase/client";
import { Session } from "@supabase/supabase-js";
import { cn } from "@/lib/utils";

const Dashboard = () => {
  const navigate = useNavigate();
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("feed");

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

            {/* Compass - Coming Soon */}
            <button
              disabled
              className="flex flex-col items-center justify-center gap-1 text-muted-foreground/40 cursor-not-allowed flex-1"
            >
              <Compass className="h-6 w-6" />
            </button>

            {/* Add Show Button - Elevated */}
            <div className="flex-1 flex justify-center">
              <button
                onClick={() => setShowAddDialog(true)}
                className="bg-primary text-primary-foreground rounded-full p-4 shadow-glow transition-transform hover:scale-105 active:scale-95 -mt-8"
              >
                <Plus className="h-8 w-8" />
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

      <AddShowFlow open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
};

export default Dashboard;
