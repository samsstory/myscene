import PhoneMockup from "../PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";
import { Home, Globe, Crown, Plus } from "lucide-react";

// Simplified show data - memory-focused, no analytics
const leftShow = {
  photo: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&q=80",
  artist: "Odesza",
  venue: "The Gorge",
  city: "WA",
  date: "Aug 2024",
};

const rightShow = {
  photo: "/images/rufus-du-sol-red-rocks.png",
  artist: "Rufus Du Sol",
  venue: "Red Rocks",
  city: "CO",
  date: "Jun 2023",
};

// Simplified ShowCard - photo-forward, memory-driven
const ShowCard = ({
  show
}: {
  show: typeof leftShow;
}) => (
  <div className="flex-1 group cursor-pointer">
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-2 transition-all group-hover:border-primary/50 group-hover:bg-white/[0.06]">
      {/* Large immersive photo */}
      <div 
        className="w-full aspect-[4/5] rounded-lg mb-2" 
        style={{
          backgroundImage: `url('${show.photo}')`,
          backgroundSize: "cover",
          backgroundPosition: "center"
        }} 
      />
      
      {/* Artist name - prominent */}
      <div className="text-white text-xs font-semibold">{show.artist}</div>
      
      {/* Venue + City + Date - muted, compact */}
      <div className="text-white/50 text-[10px]">
        {show.venue}, {show.city} · {show.date}
      </div>
    </div>
  </div>
);

// Ranking mockup - emotional, effortless
const RankingMockup = () => (
  <div className="h-full w-full flex flex-col relative overflow-hidden">
    {/* Static gradient background */}
    <div 
      className="absolute inset-0" 
      style={{
        background: `
          radial-gradient(ellipse at 50% 60%, hsl(189 94% 55% / 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 0% 0%, hsl(189 94% 55% / 0.05) 0%, transparent 40%),
          radial-gradient(ellipse at 100% 100%, hsl(17 88% 60% / 0.04) 0%, transparent 40%),
          linear-gradient(180deg, hsl(222 47% 8%), hsl(222 47% 6%))
        `
      }} 
    />
    
    {/* Noise texture overlay */}
    <div 
      className="absolute inset-0 opacity-[0.03] pointer-events-none" 
      style={{
        backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        backgroundRepeat: 'repeat'
      }} 
    />
    
    {/* Logo */}
    <div className="px-4 pt-8 pb-2 relative z-10">
      <SceneLogo size="sm" />
    </div>

    {/* Comparison Interface */}
    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3 relative z-10">
      {/* Micro-prompt - subtle, emotional */}
      <p className="text-white/40 text-[11px] mb-1">Which night meant more?</p>

      <div className="flex items-center gap-2 w-full">
        {/* Left show */}
        <ShowCard show={leftShow} />

        {/* VS badge - subtle separator */}
        <div className="shrink-0 w-8 h-8 rounded-full bg-white/[0.05] border border-white/[0.15] flex items-center justify-center">
          <span className="text-white/60 font-medium text-[10px]">VS</span>
        </div>

        {/* Right show */}
        <ShowCard show={rightShow} />
      </div>

      {/* Interaction hint - reassuring, not instructional */}
      <p className="text-white/30 text-[10px]">Tap the show you loved more</p>
    </div>

    {/* Bottom Nav - Glass Pill + FAB */}
    <div className="px-4 py-2.5 flex items-center justify-center gap-4 relative z-10">
      <div className="flex items-center gap-5 px-5 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
        <Home className="w-4 h-4 text-white/40" />
        <Globe className="w-4 h-4 text-white/40" />
        <Crown className="w-4 h-4 text-primary" style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)))" }} />
      </div>
      <div 
        className="w-10 h-10 rounded-full bg-primary flex items-center justify-center shadow-lg" 
        style={{ boxShadow: "0 0 20px hsl(var(--primary) / 0.4)" }}
      >
        <Plus className="w-4 h-4 text-primary-foreground" />
      </div>
    </div>
  </div>
);

const RankingSpotlightV2 = () => {
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
            <PhoneMockup className="w-72 md:w-80 lg:w-96">
              <RankingMockup />
            </PhoneMockup>
          </div>

          {/* Right: Copy */}
          <div className="space-y-6 text-center lg:text-left order-1 lg:order-2">
            <h2 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground" 
              style={{ textShadow: "0 0 50px rgba(255,255,255,0.1)" }}
            >
              Choose your favorite.<br />We'll do the ranking.
            </h2>

            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              No scores. No overthinking. Just choose the show you loved more.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RankingSpotlightV2;
