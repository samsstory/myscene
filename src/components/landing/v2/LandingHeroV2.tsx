import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SceneLogo from "@/components/ui/SceneLogo";
import PhoneMockup from "../PhoneMockup";
import WaitlistModal from "../WaitlistModal";
import { cn } from "@/lib/utils";
// Icons removed - no navigation in ceremonial reveal

// Emotional tags for the #1 show
const emotionalTags = ["Emotional..", "Crowd went off", "Venue was insane!"];

// Runner-up shows (faded depth stack)
const runnerUps = [
  { rank: 2, artist: "ODESZA", venue: "The Gorge" },
  { rank: 3, artist: "Rufus Du Sol", venue: "Red Rocks" },
  { rank: 4, artist: "Jamie xx", venue: "London" },
];

// Mock show card for the phone display - Ceremonial #1 Reveal
const MockShowCard = () => <div className="h-full w-full bg-gradient-accent flex flex-col">
    {/* Spacer for dynamic island */}
    <div className="h-6" />

    {/* Quiet reveal caption - not a headline */}
    <div className="px-4 pt-5 pb-4 text-center">
      <span className="text-[10px] tracking-wide text-white/50 font-normal">
        That show.
      </span>
    </div>

    {/* Main content area */}
    <div className="flex-1 px-3 py-1 flex flex-col min-h-0">
      {/* Hero #1 Card - Fred again.. */}
      <div 
        className="relative rounded-xl overflow-hidden"
        style={{ 
          aspectRatio: "16/11",
          boxShadow: "0 8px 32px -8px rgba(0,0,0,0.6), 0 4px 16px -4px rgba(0,0,0,0.4)"
        }}
      >
        {/* Photo with moody treatment */}
        <div 
          className="absolute inset-0" 
          style={{
            backgroundImage: "url('/images/fred-again-msg.png')",
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "brightness(0.95) contrast(1.05)"
          }} 
        />
        {/* Darker gradient overlay for mood */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-black/10" />
        {/* Vignette effect */}
        <div 
          className="absolute inset-0" 
          style={{ 
            boxShadow: "inset 0 0 60px rgba(0,0,0,0.4)" 
          }} 
        />
        
        {/* Content overlay - artist, venue, date */}
        <div className="absolute bottom-0 left-0 right-0 p-3">
          <div 
            className="text-white font-bold text-[15px]"
            style={{ textShadow: "0 0 20px rgba(255,255,255,0.5)" }}
          >
            Fred again..
          </div>
          <div className="text-white/70 text-[11px]">
            Alexandra Palace · London
          </div>
          <div className="text-white/40 text-[9px] mt-0.5">
            September 2023
          </div>
        </div>
      </div>

      {/* Emotional Tags */}
      <div className="flex flex-wrap gap-2 mt-4 justify-center">
        {emotionalTags.map((tag) => {
          const isEmphasis = tag === "Emotional..";
          return (
            <span
              key={tag}
              className={cn(
                "rounded-full backdrop-blur-sm border",
                isEmphasis 
                  ? "px-3 py-1 text-[10px] text-white/95 bg-white/[0.12] border-white/[0.18] font-medium"
                  : "px-2.5 py-0.5 text-[10px] text-white/80 bg-white/[0.08] border-white/[0.12]"
              )}
            >
              {tag}
            </span>
          );
        })}
      </div>

      {/* Runner-up cards - faded depth stack */}
      <div className="mt-3 space-y-0.5">
        {runnerUps.map((show, index) => {
          const opacity = 0.5 - (index * 0.12); // 50%, 38%, 26%
          const blur = index > 0 ? `blur(${index * 0.4}px)` : "none";
          
          return (
            <div 
              key={show.rank}
              className="py-1.5 px-3 rounded-lg bg-white/[0.02] border border-white/[0.04]"
              style={{ 
                opacity, 
                filter: blur,
              }}
            >
              <span className="text-[9px] text-white/60">
                #{show.rank} — {show.artist} · {show.venue}
              </span>
            </div>
          );
        })}
      </div>
    </div>

    {/* Breathing room at bottom - no navigation */}
    <div className="h-6" />
  </div>;
const LandingHeroV2 = () => {
  const navigate = useNavigate();
  const [waitlistOpen, setWaitlistOpen] = useState(false);
  return <section className="min-h-screen flex items-center justify-center relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full blur-3xl opacity-20" style={{
      background: "hsl(var(--primary))"
    }} />
      <div className="absolute bottom-1/4 -right-32 w-80 h-80 rounded-full blur-3xl opacity-15" style={{
      background: "hsl(var(--secondary))"
    }} />

      <div className="container mx-auto px-4 py-8 md:py-16">
        <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-8 items-center">
          {/* Left: Copy */}
          <div className="space-y-6 text-center lg:text-left order-1 relative z-10">
            <SceneLogo size="lg" className="justify-center lg:justify-start" />
            
            {/* V2 COPY - Edit this section to test different variations */}
            <h1 className="text-3xl md:text-5xl lg:text-6xl font-bold text-foreground leading-tight -mt-2" style={{
            textShadow: "0 0 60px rgba(255,255,255,0.15)"
          }}>Collect your favorite concerts</h1>
            
            <p className="text-base md:text-xl text-muted-foreground max-w-xl mx-auto lg:mx-0">
              Compare the shows you've been to and share the ones that mattered most.
            </p>
            {/* END V2 COPY */}

            <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start pt-2 relative z-20">
              <Button size="lg" onClick={() => setWaitlistOpen(true)} className="text-base px-8 py-5 shadow-glow hover:scale-105 transition-transform">
                Start Your Collection
              </Button>
              <Button size="lg" variant="outline" onClick={() => navigate("/demo")} className="text-base px-8 py-5 border-white/20 text-foreground hover:bg-white/10">
                See a Live Demo
              </Button>
            </div>

            <WaitlistModal open={waitlistOpen} onOpenChange={setWaitlistOpen} source="hero-v2" />

            {/* Social proof */}
            <div className="items-center gap-3 justify-center lg:justify-start pt-2 flex flex-col">
              <div className="flex -space-x-2">
                <div className="w-8 h-8 rounded-full border-2 border-background bg-cover bg-center" style={{
                backgroundImage: "url('/images/waitlist-1.png')"
              }} />
                <div className="w-8 h-8 rounded-full border-2 border-background bg-cover bg-center" style={{
                backgroundImage: "url('/images/waitlist-2.png')"
              }} />
                <div className="w-8 h-8 rounded-full border-2 border-background bg-cover bg-center" style={{
                backgroundImage: "url('/images/waitlist-3.png')"
              }} />
              </div>
              <span className="text-sm text-muted-foreground">
                For people who care which shows mattered
              </span>
            </div>
          </div>

          {/* Right: Phone Mockup */}
          <div className="flex justify-center lg:justify-start order-2 mt-4 lg:mt-0">
            <PhoneMockup className="w-56 md:w-72 lg:w-80">
              <MockShowCard />
            </PhoneMockup>
          </div>
        </div>
      </div>
    </section>;
};
export default LandingHeroV2;