import PhoneMockup from "./PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";
import { Instagram } from "lucide-react";

// Show Review Sheet Mockup
const ShowReviewMockup = () => (
  <div className="h-full w-full bg-background flex flex-col">
    {/* 4:3 Hero Photo Section */}
    <div className="relative" style={{ aspectRatio: "4/3" }}>
      <div 
        className="absolute inset-0"
        style={{
          backgroundImage: "url('/images/circoloco-concert.png')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
      
      {/* Scene watermark */}
      <div className="absolute top-2 right-2">
        <div className="bg-black/30 backdrop-blur-sm rounded-full px-2 py-1 border border-white/10">
          <SceneLogo size="sm" />
        </div>
      </div>

      {/* Glass metadata bar at bottom of photo */}
      <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-md p-3 border-t border-white/10">
        <div className="flex justify-between items-start">
          <div>
            <h3 className="text-white font-bold text-sm">Rufus Du Sol</h3>
            <p className="text-white/70 text-xs">Red Rocks Amphitheatre</p>
            <p className="text-white/50 text-[10px] mt-0.5">September 14, 2024</p>
          </div>
          <div className="text-right">
            <div className="inline-flex items-center justify-center bg-white/90 text-black font-bold rounded-full px-2 py-0.5 text-sm">
              9.4
            </div>
            <p className="text-white/50 text-[10px] mt-0.5">#1 All Time</p>
          </div>
        </div>
      </div>
    </div>

    {/* Rating Bars with Label */}
    <div className="px-3 py-3 space-y-2">
      {/* Section Label */}
      <p className="text-white/40 text-[9px] uppercase tracking-wider mb-1">How it felt</p>
      {[
        { label: "Show", score: 95 },
        { label: "Sound", score: 92 },
        { label: "Lighting", score: 88 },
        { label: "Crowd", score: 90 },
        { label: "Vibe", score: 94 },
      ].map((item) => (
        <div key={item.label} className="flex items-center gap-2">
          <span className="text-white/60 text-[10px] w-12">{item.label}</span>
          <div className="flex-1 h-1.5 rounded-full bg-white/10 overflow-hidden">
            <div 
              className="h-full rounded-full"
              style={{
                width: `${item.score}%`,
                background: "linear-gradient(90deg, hsl(var(--primary)), hsl(var(--secondary)))"
              }}
            />
          </div>
        </div>
      ))}
    </div>

    {/* Notes Quote */}
    <div className="px-3 pb-2">
      <div className="bg-white/[0.03] rounded-lg p-2 border border-white/[0.06]">
        <p className="text-white/60 text-[10px] italic leading-relaxed">
          "The sunrise set was absolutely unreal. Goosebumps the entire time."
        </p>
      </div>
    </div>

    {/* Action Buttons - Capture-first hierarchy */}
    <div className="px-3 pb-2 space-y-2 mt-auto">
      {/* Primary: Save/Log button */}
      <button 
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-white text-xs font-medium"
        style={{
          background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))"
        }}
      >
        <span>Save to my Scene</span>
      </button>
      
      {/* Secondary: Share button */}
      <button className="w-full flex items-center justify-center gap-2 py-2 rounded-lg bg-white/[0.05] border border-white/[0.08] text-white/70 text-xs">
        <Instagram className="w-3.5 h-3.5" />
        <span>Share to Instagram</span>
      </button>
    </div>

    {/* Logged timestamp */}
    <div className="px-3 pb-3">
      <p className="text-white/30 text-[9px] text-center">Logged on Oct 12, 2024</p>
    </div>
  </div>
);

const CaptureShowcase = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background accent */}
      <div 
        className="absolute top-1/3 -left-32 w-96 h-96 rounded-full blur-3xl opacity-10"
        style={{ background: "hsl(var(--primary))" }}
      />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Phone Mockup */}
          <div className="flex justify-center order-2 lg:order-1">
            <PhoneMockup className="w-64 md:w-72 lg:w-80" tilt="left">
              <ShowReviewMockup />
            </PhoneMockup>
          </div>

          {/* Right: Copy */}
          <div className="space-y-6 text-center lg:text-left order-1 lg:order-2">
            <h2 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground"
              style={{ textShadow: "0 0 50px rgba(255,255,255,0.1)" }}
            >
              Every show. One place.
            </h2>

            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              Never forget who opened for who, which venue had the best sound, or what night changed everything.
            </p>

          </div>
        </div>
      </div>
    </section>
  );
};

export default CaptureShowcase;
