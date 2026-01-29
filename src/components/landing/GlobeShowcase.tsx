import PhoneMockup from "./PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";
import LandingGlobe from "./LandingGlobe";
import { Home, Globe, Crown, Plus } from "lucide-react";

// Globe/Map Mockup with real Mapbox globe
const GlobeMockup = () => (
  <div className="h-full w-full bg-background flex flex-col overflow-hidden">
    {/* Spacer for dynamic island */}
    <div className="h-6" />
    
    {/* Header */}
    <div className="px-4 py-2 flex items-center justify-between">
      <SceneLogo size="sm" />
      <div 
        className="w-6 h-6 rounded-full border border-white/20"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    </div>

    {/* Map Area with real Mapbox globe */}
    <div className="flex-1 relative min-h-0">
      <LandingGlobe />

      {/* Stats overlay */}
      <div className="absolute bottom-3 left-3 right-3">
        <div className="bg-black/60 backdrop-blur-md rounded-xl p-3 border border-white/10">
          <div className="flex items-center justify-center gap-4">
            <div className="text-center">
              <span className="text-white font-bold text-lg">5</span>
              <p className="text-white/50 text-[10px]">countries</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <span className="text-white font-bold text-lg">12</span>
              <p className="text-white/50 text-[10px]">cities</p>
            </div>
            <div className="w-px h-8 bg-white/20" />
            <div className="text-center">
              <span className="text-white font-bold text-lg">47</span>
              <p className="text-white/50 text-[10px]">shows</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Bottom Nav - Glass pill with FAB */}
    <div className="px-4 py-2.5 flex items-center justify-center gap-4">
      {/* Glass pill nav */}
      <div className="flex items-center gap-5 px-5 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
        <Home className="w-4 h-4 text-white/40" />
        <Globe className="w-4 h-4 text-primary" style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)))" }} />
        <Crown className="w-4 h-4 text-white/40" />
      </div>
      {/* FAB */}
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg" style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}>
        <Plus className="w-4 h-4 text-primary-foreground" />
      </div>
    </div>
  </div>
);

const GlobeShowcase = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background accent */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10"
        style={{ background: "hsl(var(--primary))" }}
      />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Phone Mockup */}
          <div className="flex justify-center order-2 lg:order-1">
            <PhoneMockup className="w-72 md:w-80 lg:w-96" tilt="left">
              <GlobeMockup />
            </PhoneMockup>
          </div>

          {/* Right: Copy */}
          <div className="space-y-6 text-center lg:text-left order-1 lg:order-2">
            <h2 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground"
              style={{ textShadow: "0 0 50px rgba(255,255,255,0.1)" }}
            >
              Your global music life.
            </h2>

            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              See everywhere music has taken you.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default GlobeShowcase;
