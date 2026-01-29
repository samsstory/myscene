import PhoneMockup from "./PhoneMockup";
import { Sparkles } from "lucide-react";

// Large ranking mockup
const RankingMockup = () => (
  <div className="h-full w-full bg-gradient-accent flex flex-col">
    {/* Header */}
    <div className="px-4 py-3 flex items-center justify-between border-b border-white/[0.08]">
      <span className="text-white/80 text-sm font-medium">Power Rankings</span>
      <span className="text-primary text-xs">12 comparisons</span>
    </div>

    {/* VS Interface */}
    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-4">
      <p className="text-white/60 text-xs">Which was better?</p>

      <div className="flex items-center gap-3 w-full">
        {/* Left show */}
        <div className="flex-1 group cursor-pointer">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 transition-all group-hover:border-primary/50 group-hover:bg-white/[0.06]">
            <div 
              className="w-full aspect-[4/3] rounded-lg mb-3"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&q=80')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="text-white text-sm font-semibold">Odesza</div>
            <div className="text-white/50 text-xs">The Gorge · 2024</div>
          </div>
        </div>

        {/* VS badge */}
        <div className="shrink-0 w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/40 flex items-center justify-center">
          <span className="text-primary font-bold text-sm">VS</span>
        </div>

        {/* Right show */}
        <div className="flex-1 group cursor-pointer">
          <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 transition-all group-hover:border-primary/50 group-hover:bg-white/[0.06]">
            <div 
              className="w-full aspect-[4/3] rounded-lg mb-3"
              style={{
                backgroundImage: "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80')",
                backgroundSize: "cover",
                backgroundPosition: "center",
              }}
            />
            <div className="text-white text-sm font-semibold">Rufus Du Sol</div>
            <div className="text-white/50 text-xs">Red Rocks · 2023</div>
          </div>
        </div>
      </div>

      <p className="text-white/40 text-[10px]">Tap to choose the winner</p>
    </div>

    {/* Ranking preview */}
    <div className="px-4 py-3 border-t border-white/[0.08]">
      <div className="flex items-center gap-2">
        <span className="text-white/60 text-xs">Current #1:</span>
        <span className="text-white text-xs font-medium">Fred again.. @ Ally Pally</span>
      </div>
    </div>
  </div>
);

const RankingSpotlight = () => {
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
              <RankingMockup />
            </PhoneMockup>
          </div>

          {/* Right: Copy */}
          <div className="space-y-6 text-center lg:text-left order-1 lg:order-2">
            <h2 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground"
              style={{ textShadow: "0 0 50px rgba(255,255,255,0.1)" }}
            >
              Your #1 show, proven.
            </h2>

            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              Finally answer: what's my all-time #1 show? Head-to-head picks reveal your true feelings.
            </p>

            <p className="text-muted-foreground max-w-lg mx-auto lg:mx-0">
              The more you compare, the more accurate your rankings become.
            </p>

            {/* Coming soon teaser */}
            <div className="pt-4">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.05] border border-primary/30">
                <Sparkles className="w-4 h-4 text-primary" />
                <span className="text-primary text-sm font-medium">
                  Coming soon: Compare with friends
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default RankingSpotlight;
