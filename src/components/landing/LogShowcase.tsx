import PhoneMockup from "./PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";
import { Check, MapPin, Home, Globe, Crown, Plus } from "lucide-react";

const SmartCaptureMockup = () => (
  <div className="h-full w-full bg-background flex flex-col">
    {/* App Header */}
    <div className="px-4 py-3 flex justify-between items-center">
      <SceneLogo size="sm" />
      <div className="w-6 h-6 rounded-full bg-white/10" />
    </div>

    {/* Photo Preview */}
    <div className="px-3">
      <div className="relative rounded-xl overflow-hidden" style={{ aspectRatio: "4/3" }}>
        <img 
          src="/images/concert-capture-demo.jpg" 
          alt="Concert photo" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500/20 text-green-400 text-[10px] px-2 py-0.5 rounded-full backdrop-blur-sm">
          <Check className="h-3 w-3" />
          Photo added
        </div>
      </div>
    </div>

    {/* Smart Detection Card */}
    <div className="px-3 py-4 flex-1">
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.08] p-4 space-y-3">
        <div className="flex items-start gap-3">
          <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-white/60 text-sm">Was this at</p>
            <p className="text-white font-semibold">Factory Town</p>
            <p className="text-white font-semibold">during Art Basel?</p>
          </div>
        </div>
        
        <p className="text-white/40 text-xs pl-8">
          Dec 6, 2024 · Miami, FL
        </p>
        
        <button 
          className="w-full py-2.5 rounded-lg text-white text-sm font-medium flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))"
          }}
        >
          <Check className="h-4 w-4" />
          Yes, that's right
        </button>
        
        <button className="w-full text-white/50 text-xs hover:text-white/70 transition-colors">
          No, let me search...
        </button>
      </div>
    </div>

    {/* Bottom Nav */}
    <div className="px-4 py-3 flex justify-around items-center border-t border-white/10">
      <Home className="w-5 h-5 text-white/40" />
      <Globe className="w-5 h-5 text-white/40" />
      <Crown className="w-5 h-5 text-white/40" />
      <div 
        className="w-7 h-7 rounded-full flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))" }}
      >
        <Plus className="w-4 h-4 text-white" />
      </div>
    </div>
  </div>
);

const LogShowcase = () => {
  return (
    <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background accent */}
      <div 
        className="absolute top-1/3 -right-32 w-96 h-96 rounded-full blur-3xl opacity-10"
        style={{ background: "hsl(var(--primary))" }}
      />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div className="space-y-6 text-center lg:text-left">
            <h2 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground"
              style={{ textShadow: "0 0 50px rgba(255,255,255,0.1)" }}
            >
              Log it before you forget.
            </h2>

            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              Add a photo — we'll figure out the rest.
            </p>
          </div>

          {/* Right: Phone Mockup */}
          <div className="flex justify-center">
            <PhoneMockup className="w-64 md:w-72 lg:w-80" tilt="right">
              <SmartCaptureMockup />
            </PhoneMockup>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LogShowcase;
