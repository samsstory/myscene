import { useState, useMemo } from "react";
import PhoneMockup from "../PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";
import LandingGlobe, { CITY_MARKERS } from "../LandingGlobe";
import { Home, Globe, Crown, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const YEARS = [2024, 2025, 2026, "all"] as const;
type YearOption = (typeof YEARS)[number];

// Globe/Map Mockup with real Mapbox globe and year toggle
const GlobeMockup = () => {
  const [selectedYear, setSelectedYear] = useState<YearOption>("all");
  const yearStats = useMemo(() => {
    const markers = selectedYear === "all" ? CITY_MARKERS : CITY_MARKERS.filter(m => m.years.includes(selectedYear as number));
    const shows = markers.reduce((sum, m) => sum + m.count, 0);
    const cities = markers.length;
    const countries = new Set(markers.map(m => m.country)).size;
    return {
      shows,
      cities,
      countries
    };
  }, [selectedYear]);
  return <div className="h-full w-full bg-background flex flex-col overflow-hidden">
      {/* Spacer for dynamic island */}
      <div className="h-6" />

      {/* Header */}
      <div className="px-4 py-2 flex items-center justify-between">
        <SceneLogo size="sm" />
        <div className="w-6 h-6 rounded-full border border-white/20" style={{
        backgroundImage: "url('/images/scene-profile.png')",
        backgroundSize: "cover",
        backgroundPosition: "center"
      }} />
      </div>

      {/* Map Area with real Mapbox globe */}
      <div className="flex-1 relative min-h-0">
        <LandingGlobe selectedYear={selectedYear} />

        {/* Stats + Year Toggle - stats prominent, years secondary */}
        <div className="absolute top-3 left-3 right-3 z-10">
          <div className="flex flex-col items-center gap-2">
            {/* Stats - prominent */}
            <div className="flex items-center gap-4 px-4 py-2 rounded-full bg-black/40 backdrop-blur-md border border-white/10">
              <div className="text-center">
                <span className="text-white font-bold text-sm block" style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}>
                  {yearStats.countries}
                </span>
                <span className="text-white/50 text-[9px]">countries</span>
              </div>
              <span className="text-white/20">·</span>
              <div className="text-center">
                <span className="text-white font-bold text-sm block" style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}>
                  {yearStats.cities}
                </span>
                <span className="text-white/50 text-[9px]">cities</span>
              </div>
              <span className="text-white/20">·</span>
              <div className="text-center">
                <span className="text-white font-bold text-sm block" style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}>
                  {yearStats.shows}
                </span>
                <span className="text-white/50 text-[9px]">shows</span>
              </div>
            </div>
            
            {/* Year buttons - smaller, secondary */}
            <div className="flex gap-0.5">
              {YEARS.map(year => <button key={year} onClick={() => setSelectedYear(year)} className={cn("px-2 py-0.5 text-[10px] rounded-full transition-all", selectedYear === year ? "bg-white/20 text-white/90" : "bg-transparent text-white/40 hover:text-white/60")}>
                  {year === "all" ? "All" : year}
                </button>)}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Nav - Glass pill with FAB */}
      <div className="px-4 py-2.5 flex items-center justify-center gap-4">
        {/* Glass pill nav */}
        <div className="flex items-center gap-5 px-5 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
          <Home className="w-4 h-4 text-white/40" />
          <Globe className="w-4 h-4 text-primary" style={{
          filter: "drop-shadow(0 0 4px hsl(var(--primary)))"
        }} />
          <Crown className="w-4 h-4 text-white/40" />
        </div>
        {/* FAB */}
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg" style={{
        boxShadow: "0 0 20px hsl(var(--primary) / 0.4)"
      }}>
          <Plus className="w-4 h-4 text-primary-foreground" />
        </div>
      </div>
    </div>;
};

const GlobeShowcaseV2 = () => {
  return <section className="py-24 md:py-32 relative overflow-hidden">
      {/* Background accent */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full blur-3xl opacity-10" style={{
      background: "hsl(var(--primary))"
    }} />

      <div className="container mx-auto px-4">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left: Phone Mockup */}
          <div className="flex justify-center order-2 lg:order-1">
            <PhoneMockup className="w-72 md:w-80 lg:w-96">
              <GlobeMockup />
            </PhoneMockup>
          </div>

          {/* Right: Copy - V2 COPY SECTION */}
          <div className="space-y-6 text-center lg:text-left order-1 lg:order-2">
            <h2 className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground" style={{
            textShadow: "0 0 50px rgba(255,255,255,0.1)"
          }}>
              See everywhere music has taken you
            </h2>

            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              A living record of the places music mattered most
            </p>
            {/* END V2 COPY */}
          </div>
        </div>
      </div>
    </section>;
};
export default GlobeShowcaseV2;
