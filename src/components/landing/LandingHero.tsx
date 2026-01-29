import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SceneLogo from "@/components/ui/SceneLogo";
import PhoneMockup from "./PhoneMockup";

// Mock show card for the phone display
const MockShowCard = () => (
  <div className="h-full w-full bg-gradient-accent flex flex-col">
    {/* Status bar mock */}
    <div className="flex justify-between items-center px-4 py-2 text-[8px] text-white/60">
      <span>9:41</span>
      <div className="flex gap-1">
        <div className="w-3 h-2 bg-white/40 rounded-sm" />
        <div className="w-3 h-2 bg-white/40 rounded-sm" />
        <div className="w-4 h-2 bg-white/40 rounded-sm" />
      </div>
    </div>

    {/* App header */}
    <div className="px-4 py-3 flex justify-between items-center">
      <SceneLogo size="sm" />
      <div className="w-6 h-6 rounded-full bg-white/10" />
    </div>

    {/* Stacked show cards */}
    <div className="flex-1 px-3 py-2 flex flex-col">
      {/* Card 1 - Top ranked (Expanded) */}
      <div 
        className="relative rounded-xl overflow-hidden shadow-lg z-10"
        style={{ aspectRatio: "4/3" }}
      >
        <div 
          className="absolute inset-0 bg-gradient-to-br from-primary/30 to-secondary/30"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=400&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
        
        {/* Rank badge */}
        <div className="absolute top-2 left-2">
          <span 
            className="text-xs font-bold text-white"
            style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
          >
            #1
          </span>
        </div>

        {/* Content overlay */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div className="text-white font-bold text-sm">Fred again..</div>
          <div className="text-white/70 text-[10px]">Alexandra Palace · London</div>
        </div>

        {/* Scene watermark */}
        <div className="absolute top-2 right-2">
          <span 
            className="text-[8px] text-white/60 font-black tracking-widest"
            style={{ textShadow: "0 0 6px rgba(255,255,255,0.3)" }}
          >
            SCENE ✦
          </span>
        </div>
      </div>

      {/* Collapsed Cards Stack */}
      <div className="relative mt-[-6px] z-0">
        {/* Card 2 - Odesza */}
        <div className="relative rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] py-3 px-3">
          <div className="text-white/80 text-xs font-medium">Odesza</div>
        </div>

        {/* Card 3 - Mau P */}
        <div className="relative rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] py-3 px-3 mt-[-6px]">
          <div className="text-white/60 text-xs font-medium">Mau P</div>
        </div>

        {/* Card 4 - Post Malone */}
        <div className="relative rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] py-3 px-3 mt-[-6px]">
          <div className="text-white/50 text-xs font-medium">Post Malone</div>
        </div>

        {/* Card 5 - The Blaze */}
        <div className="relative rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] py-3 px-3 mt-[-6px]">
          <div className="text-white/40 text-xs font-medium">The Blaze</div>
        </div>

        {/* Card 6 - T-Pain */}
        <div className="relative rounded-xl bg-white/[0.03] backdrop-blur-sm border border-white/[0.08] py-3 px-3 mt-[-6px]">
          <div className="text-white/30 text-xs font-medium">T-Pain</div>
        </div>
      </div>
    </div>

    {/* Bottom nav mock */}
    <div className="px-4 py-3 flex justify-around border-t border-white/10">
      <div className="w-5 h-5 rounded-full bg-primary/60" />
      <div className="w-5 h-5 rounded-full bg-white/20" />
      <div className="w-5 h-5 rounded-full bg-white/20" />
      <div className="w-5 h-5 rounded-full bg-white/20" />
    </div>
  </div>
);

const LandingHero = () => {
  const navigate = useNavigate();

  return (
    <section className="min-h-screen flex items-center relative overflow-hidden">
      {/* Background glow effects */}
      <div 
        className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20"
        style={{ background: "hsl(var(--primary))" }}
      />
      <div 
        className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full blur-3xl opacity-15"
        style={{ background: "hsl(var(--secondary))" }}
      />

      <div className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
          {/* Left: Copy */}
          <div className="space-y-8 text-center lg:text-left">
            <SceneLogo size="lg" className="justify-center lg:justify-start" />
            
            <h1 
              className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight"
              style={{ textShadow: "0 0 60px rgba(255,255,255,0.15)" }}
            >
              Your concert memories, beautifully curated, ranked, and shared.
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
              The app for music lovers who want more than a ticket stub.
            </p>

            <div className="flex gap-4 justify-center lg:justify-start pt-4">
              <Button 
                size="lg" 
                onClick={() => navigate("/auth")} 
                className="shadow-glow text-lg px-8 hover:scale-105 transition-transform"
              >
                Get Started
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                onClick={() => navigate("/dashboard")} 
                className="text-lg px-8 border-white/20 text-foreground hover:bg-white/10"
              >
                View Demo
              </Button>
            </div>
          </div>

          {/* Right: Phone Mockup */}
          <div className="flex justify-center lg:justify-end">
            <PhoneMockup className="w-64 md:w-72 lg:w-80" tilt="right">
              <MockShowCard />
            </PhoneMockup>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LandingHero;
