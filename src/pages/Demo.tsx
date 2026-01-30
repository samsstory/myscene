import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Home as HomeIcon, Globe, Scale, Plus } from "lucide-react";
import { TooltipProvider } from "@/components/ui/tooltip";
import DemoHome from "@/components/DemoHome";
import DemoRank from "@/components/DemoRank";
import DemoBanner from "@/components/DemoBanner";
import SceneLogo from "@/components/ui/SceneLogo";
import { DemoProvider } from "@/contexts/DemoContext";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

type ViewMode = 'home' | 'globe' | 'rankings';

const Demo = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<ViewMode>("home");

  // Handler for FAB click in demo mode
  const handleFABClick = () => {
    // In demo mode, FAB should prompt sign up
    navigate("/auth");
  };

  return (
    <DemoProvider enabled>
      <TooltipProvider>
        <div className="min-h-screen bg-gradient-accent pb-32">
          {/* Header */}
          <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex items-center justify-between">
              <SceneLogo size="lg" className="text-white" />
              <button
                onClick={() => navigate("/auth")}
                className="text-sm font-medium text-white/70 hover:text-white transition-colors px-4 py-2 rounded-lg bg-white/[0.05] hover:bg-white/[0.08] border border-white/10"
              >
                Sign In
              </button>
            </div>
          </header>

          {/* Main Content */}
          <main className="container mx-auto px-4 py-8">
            {activeTab === 'rankings' ? (
              <DemoRank />
            ) : (
              <DemoHome 
                initialView={activeTab}
                onViewChange={(view) => setActiveTab(view as ViewMode)}
                onNavigateToRank={() => setActiveTab('rankings')}
              />
            )}
          </main>
          {/* Floating Navigation */}
          <div className="fixed bottom-24 left-0 right-0 flex justify-between items-end px-6 gap-4 z-50">
            {/* Left spacer */}
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

                {/* Rank - Now enabled for demo! */}
                <button
                  onClick={() => setActiveTab("rankings")}
                  className={cn(
                    "flex flex-col items-center gap-0.5 transition-all py-1.5",
                    activeTab === "rankings" 
                      ? "text-primary drop-shadow-[0_0_8px_hsl(var(--primary))]" 
                      : "text-white/60"
                  )}
                >
                  <Scale className="h-6 w-6" />
                </button>
              </div>
            </nav>

            {/* Floating FAB - Sign up prompt in demo */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleFABClick}
                  className="backdrop-blur-xl bg-primary/90 border border-white/30 text-primary-foreground rounded-full p-5 shadow-2xl transition-all hover:scale-105 active:scale-95"
                >
                  <Plus className="h-9 w-9" />
                </button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Sign up to add shows</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Demo Banner */}
          <DemoBanner />
        </div>
      </TooltipProvider>
    </DemoProvider>
  );
};

export default Demo;
