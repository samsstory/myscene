import PhoneMockup from "./PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";
import { Instagram } from "lucide-react";

// Story overlay mockup
const StoryMockup = () => (
  <div className="h-full w-full relative">
    {/* Full-bleed concert photo */}
    <div 
      className="absolute inset-0"
      style={{
        backgroundImage: "url('https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=600&q=80')",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    />
    
    {/* Gradient overlays */}
    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/40" />
    
    {/* Top: Scene logo */}
    <div className="absolute top-4 right-4">
      <div className="bg-black/30 backdrop-blur-sm rounded-full px-3 py-1.5 border border-white/10">
        <SceneLogo size="sm" />
      </div>
    </div>

    {/* Bottom: Show info overlay */}
    <div className="absolute bottom-0 left-0 right-0 p-4">
      <div className="bg-black/40 backdrop-blur-md rounded-2xl p-4 border border-white/10">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h3 className="text-white text-lg font-bold">Jamie xx</h3>
            <p className="text-white/70 text-sm">Printworks · London</p>
            <p className="text-white/50 text-xs mt-1">December 14, 2024</p>
          </div>
          <div className="text-right">
            <span 
              className="text-xl font-bold text-white block"
              style={{ textShadow: "0 0 12px rgba(255,255,255,0.5)" }}
            >
              #3
            </span>
            <span className="text-white/50 text-xs">All Time</span>
          </div>
        </div>
        
        {/* Rating bar */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 rounded-full bg-white/20 overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{
                width: "91%",
                background: "linear-gradient(90deg, hsl(142 76% 45%), hsl(142 76% 55%))"
              }}
            />
          </div>
          <span className="text-white font-bold text-sm">9.1</span>
        </div>
      </div>
    </div>
  </div>
);

const ShareExperience = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background accent */}
      <div 
        className="absolute top-1/3 -right-32 w-96 h-96 rounded-full blur-3xl opacity-10"
        style={{ background: "hsl(var(--secondary))" }}
      />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div className="space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
              <Instagram className="w-4 h-4 text-secondary" />
              <span className="text-white/60 text-sm">Instagram-ready</span>
            </div>

            <h2 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground"
              style={{ textShadow: "0 0 50px rgba(255,255,255,0.1)" }}
            >
              Made for stories.
            </h2>

            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              Every show becomes shareable content. Scene overlays your rating, rank, and details on your concert photos — ready for Instagram in one tap.
            </p>

            <ul className="space-y-3 text-muted-foreground text-left max-w-lg mx-auto lg:mx-0">
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Automatic rating and rank overlays</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Venue and date context included</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Scene watermark for that authentic flex</span>
              </li>
            </ul>
          </div>

          {/* Right: Phone Mockup */}
          <div className="flex justify-center">
            <PhoneMockup className="w-64 md:w-72 lg:w-80" tilt="right">
              <StoryMockup />
            </PhoneMockup>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShareExperience;
