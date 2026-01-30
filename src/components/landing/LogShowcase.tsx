import PhoneMockup from "./PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";
import { Badge } from "@/components/ui/badge";
import { Check, MapPin, Home, Globe, Crown, Plus, Sparkles } from "lucide-react";
const SmartCaptureMockup = () => <div className="h-full w-full bg-background flex flex-col">
    {/* Spacer for dynamic island */}
    <div className="h-6" />

    {/* App Header - aligned below notch */}
    <div className="px-4 py-2 flex justify-between items-center">
      <SceneLogo size="sm" />
      <div className="w-6 h-6 rounded-full bg-white/10" style={{
      backgroundImage: "url('/images/scene-profile.png')",
      backgroundSize: "cover",
      backgroundPosition: "center"
    }} />
    </div>

    {/* Photo Preview */}
    <div className="px-3">
      <div className="relative rounded-xl overflow-hidden" style={{
      aspectRatio: "16/10"
    }}>
        <img src="/images/circoloco-concert.png" alt="Concert photo" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-green-500/20 text-green-400 text-[9px] px-1.5 py-0.5 rounded-full backdrop-blur-sm">
          <Check className="h-2.5 w-2.5" />
          Photo added
        </div>
      </div>
    </div>

    {/* Smart Detection Card */}
    <div className="px-3 py-3 flex-1 min-h-0">
      <div className="bg-white/[0.03] rounded-xl border border-white/[0.08] p-3 space-y-2">
        <div className="flex items-start gap-2">
          <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-white/60 text-xs">Was this at</p>
            <p className="text-white font-semibold text-sm">Factory Town</p>
            <p className="text-white font-semibold text-sm">during Art Basel?</p>
          </div>
        </div>
        
        <p className="text-white/40 text-[10px] pl-6">
          Dec 6, 2024 · Miami, FL
        </p>
        
        <button className="w-full py-2 rounded-lg text-white text-xs font-medium flex items-center justify-center gap-1.5" style={{
        background: "linear-gradient(135deg, hsl(var(--primary)), hsl(var(--secondary)))"
      }}>
          <Check className="h-3 w-3" />
          Yes, that's right
        </button>
        
        <button className="w-full text-white/50 text-[10px] hover:text-white/70 transition-colors">
          No, let me search...
        </button>
      </div>
    </div>

    {/* Bottom Nav - Glass Pill + FAB (selected) */}
    <div className="px-4 py-2.5 flex items-center justify-center gap-4">
      <div className="flex items-center gap-5 px-5 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
        <Home className="w-4 h-4 text-white/40" />
        <Globe className="w-4 h-4 text-white/40" />
        <Crown className="w-4 h-4 text-white/40" />
      </div>
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg ring-2 ring-primary/30" style={{
      boxShadow: "0 0 24px hsl(var(--primary) / 0.6)"
    }}>
        <Plus className="w-4 h-4 text-primary-foreground" />
      </div>
    </div>
  </div>;
const LogShowcase = () => {
  return <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-1/3 -right-32 w-96 h-96 rounded-full blur-3xl opacity-10" style={{
      background: "hsl(var(--primary))"
    }} />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Copy */}
          <div className="space-y-6 text-center lg:text-left">
            <Badge variant="outline" className="gap-1.5 px-3 py-1 border-primary/30 bg-primary/5 text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              Capture
            </Badge>
            
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground" style={{
            textShadow: "0 0 50px rgba(255,255,255,0.1)"
          }}>
              Capture it before you forget.
            </h2>

            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              Drop in a photo or multiple photos. We handle the rest.
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
    </section>;
};
export default LogShowcase;