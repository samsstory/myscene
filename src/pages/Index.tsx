import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Music, TrendingUp, Users, Sparkles } from "lucide-react";
const Index = () => {
  const navigate = useNavigate();
  return <div className="min-h-screen bg-gradient-accent">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center space-y-6 mb-16">
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-in fade-in duration-1000">
            Scene
          </h1>
          <p className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto">Track and share every scene from your music journey</p>
          <div className="flex gap-4 justify-center pt-8">
            <Button size="lg" onClick={() => navigate("/auth")} className="shadow-glow text-lg px-8">
              Get Started
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate("/dashboard")} className="text-lg px-8">
              View Demo
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24">
          <div className="text-center space-y-4 p-6 rounded-lg bg-card border border-border shadow-card hover:shadow-glow transition-all">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10">
              <Music className="h-8 w-8 text-primary" />
            </div>
            <h3 className="text-xl font-bold">Log Your Shows</h3>
            <p className="text-muted-foreground">
              Track every concert with artists, venues, dates, and your personal ratings
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-lg bg-card border border-border shadow-card hover:shadow-glow transition-all">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-secondary/10">
              <TrendingUp className="h-8 w-8 text-secondary" />
            </div>
            <h3 className="text-xl font-bold">Track Your Stats</h3>
            <p className="text-muted-foreground">
              See your most-seen artists, favorite venues, and how you compare to other fans
            </p>
          </div>

          <div className="text-center space-y-4 p-6 rounded-lg bg-card border border-border shadow-card hover:shadow-glow transition-all">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-accent/10">
              <Sparkles className="h-8 w-8 text-accent" />
            </div>
            <h3 className="text-xl font-bold">Share Your Journey</h3>
            <p className="text-muted-foreground">
              Create beautiful story overlays to share your concert experiences on social media
            </p>
          </div>
        </div>
      </div>
    </div>;
};
export default Index;