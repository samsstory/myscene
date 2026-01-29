import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SceneLogo from "@/components/ui/SceneLogo";

const LandingCTA = () => {
  const navigate = useNavigate();

  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Gradient background */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: "radial-gradient(ellipse at center, hsl(var(--primary) / 0.2), transparent 70%)"
        }}
      />

      <div className="container mx-auto px-4 relative">
        <div className="max-w-2xl mx-auto text-center space-y-8">
          <h2 
            className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground"
            style={{ textShadow: "0 0 60px rgba(255,255,255,0.15)" }}
          >
            Your love for music deserves to be remembered.
          </h2>

          <div className="pt-4">
            <Button 
              size="lg" 
              onClick={() => navigate("/auth")} 
              className="shadow-glow text-lg px-10 py-6 hover:scale-105 transition-transform"
            >
              Add my first show
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="container mx-auto px-4 mt-24">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-8 border-t border-white/[0.08]">
          <SceneLogo size="md" />
          
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </div>

          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Scene. All rights reserved.
          </p>
        </div>
      </div>
    </section>
  );
};

export default LandingCTA;
