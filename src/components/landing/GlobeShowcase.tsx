import PhoneMockup from "./PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";
import { Home, Globe, Crown, Plus } from "lucide-react";

// Globe/Map Mockup
const GlobeMockup = () => (
  <div className="h-full w-full bg-background flex flex-col">
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
    <div className="flex-1 relative bg-[#0a1628]">
      {/* Simplified world map background */}
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1000 500'%3E%3Cpath fill='%231a2d4a' d='M150 120 C200 80 300 100 350 130 Q400 100 450 120 L500 100 Q550 80 600 110 L650 90 Q700 100 720 130 L680 160 Q640 180 600 170 L550 190 Q500 210 450 180 L400 200 Q350 180 300 190 L250 170 Q200 160 150 180 Z M100 250 Q150 230 200 250 L250 240 Q300 260 350 250 L300 280 Q250 300 200 290 L150 310 Q100 290 100 250 Z M700 200 Q750 180 800 200 L850 190 Q900 210 880 240 L820 260 Q770 280 720 260 L700 230 Q680 210 700 200 Z M500 280 Q550 260 600 280 L650 270 Q700 290 680 320 L620 340 Q570 360 520 340 L480 320 Q460 300 500 280 Z'/%3E%3C/svg%3E")`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      {/* Glowing city markers */}
      {[
        { x: "20%", y: "35%", label: "NYC", size: "lg" },
        { x: "15%", y: "45%", label: "Austin", size: "md" },
        { x: "12%", y: "40%", label: "LA", size: "lg" },
        { x: "48%", y: "30%", label: "London", size: "lg" },
        { x: "52%", y: "35%", label: "Berlin", size: "md" },
        { x: "85%", y: "55%", label: "Sydney", size: "sm" },
        { x: "78%", y: "40%", label: "Tokyo", size: "md" },
        { x: "22%", y: "42%", label: "Chicago", size: "sm" },
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
              width: city.size === "lg" ? 24 : city.size === "md" ? 18 : 12,
              height: city.size === "lg" ? 24 : city.size === "md" ? 18 : 12,
              background: "radial-gradient(circle, hsl(var(--primary) / 0.4), transparent 70%)",
            }}
          />
          {/* Inner dot */}
          <div 
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full"
            style={{
              width: city.size === "lg" ? 8 : city.size === "md" ? 6 : 4,
              height: city.size === "lg" ? 8 : city.size === "md" ? 6 : 4,
              background: "hsl(var(--primary))",
              boxShadow: "0 0 12px hsl(var(--primary))",
            }}
          />
        </div>
      ))}

      {/* Stats overlay */}
      <div className="absolute bottom-4 left-4 right-4">
        <div className="bg-black/50 backdrop-blur-md rounded-xl p-3 border border-white/10">
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

    {/* Bottom Nav */}
    <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Home className="w-5 h-5 text-white/40" />
        <Globe className="w-5 h-5 text-primary" style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)))" }} />
        <Crown className="w-5 h-5 text-white/40" />
      </div>
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
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
