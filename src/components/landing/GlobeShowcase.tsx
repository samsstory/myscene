import PhoneMockup from "./PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";
import { Home, Globe, Crown, Plus } from "lucide-react";

// Globe/Map Mockup
const GlobeMockup = () => (
  <div className="h-full w-full bg-background flex flex-col overflow-hidden">
    {/* Header */}
    <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.08]">
      <SceneLogo size="sm" />
      <div 
        className="w-7 h-7 rounded-full border border-white/20"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=50&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
    </div>

    {/* Map Area */}
    <div className="flex-1 relative bg-[#0a1628] min-h-0">
      {/* Layered continent shapes for depth */}
      <svg 
        className="absolute inset-0 w-full h-full"
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Back layer - darker */}
        <path
          fill="hsl(222 30% 12%)"
          d="M40 80 Q80 60 140 75 Q180 65 220 80 L260 70 Q300 55 340 75 Q360 85 380 100 L370 130 Q340 150 300 140 L260 155 Q220 170 180 150 L140 165 Q100 155 60 165 L30 145 Q20 120 40 80 Z"
        />
        <path
          fill="hsl(222 30% 12%)"
          d="M60 180 Q100 165 140 180 L180 172 Q220 185 260 178 L240 200 Q200 215 160 205 L120 220 Q80 210 60 180 Z"
        />
        <path
          fill="hsl(222 30% 12%)"
          d="M280 140 Q320 125 350 145 L365 155 Q375 175 360 195 L320 210 Q290 220 265 205 L255 185 Q260 160 280 140 Z"
        />
        
        {/* Front layer - slightly lighter */}
        <path
          fill="hsl(222 28% 15%)"
          d="M50 90 Q85 75 135 85 Q170 78 210 90 L245 82 Q280 72 320 88 Q340 95 355 108 L348 130 Q325 145 290 138 L258 150 Q225 160 190 145 L155 158 Q120 150 80 158 L55 142 Q45 125 50 90 Z"
        />
        <path
          fill="hsl(222 28% 15%)"
          d="M70 185 Q105 172 140 185 L175 178 Q210 190 245 184 L232 205 Q195 218 158 208 L125 220 Q92 212 70 185 Z"
        />
        <path
          fill="hsl(222 28% 15%)"
          d="M290 148 Q325 135 352 152 L365 162 Q372 178 360 195 L328 208 Q300 216 278 203 L270 186 Q275 165 290 148 Z"
        />
      </svg>

      {/* Glowing city markers */}
      {[
        { x: "22%", y: "32%", size: "lg" },
        { x: "18%", y: "42%", size: "md" },
        { x: "14%", y: "36%", size: "lg" },
        { x: "50%", y: "28%", size: "lg" },
        { x: "55%", y: "32%", size: "md" },
        { x: "82%", y: "60%", size: "sm" },
        { x: "76%", y: "35%", size: "md" },
        { x: "26%", y: "38%", size: "sm" },
        { x: "45%", y: "50%", size: "sm" },
        { x: "62%", y: "45%", size: "sm" },
      ].map((city, i) => (
        <div
          key={i}
          className="absolute"
          style={{ left: city.x, top: city.y }}
        >
          {/* Outer glow */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full animate-pulse"
            style={{
              width: city.size === "lg" ? 20 : city.size === "md" ? 14 : 10,
              height: city.size === "lg" ? 20 : city.size === "md" ? 14 : 10,
              background: "radial-gradient(circle, hsl(var(--primary) / 0.5), transparent 70%)",
            }}
          />
          {/* Inner dot */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: city.size === "lg" ? 6 : city.size === "md" ? 5 : 4,
              height: city.size === "lg" ? 6 : city.size === "md" ? 5 : 4,
              background: "hsl(var(--primary))",
              boxShadow: "0 0 8px hsl(var(--primary))",
            }}
          />
        </div>
      ))}

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
    <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-center gap-4">
      {/* Glass pill nav */}
      <div className="flex items-center gap-5 px-5 py-2.5 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
        <Home className="w-5 h-5 text-white/40" />
        <Globe className="w-5 h-5 text-primary" style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)))" }} />
        <Crown className="w-5 h-5 text-white/40" />
      </div>
      {/* FAB */}
      <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center shadow-lg" style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}>
        <Plus className="w-5 h-5 text-primary-foreground" />
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
