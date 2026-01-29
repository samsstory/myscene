import PhoneMockup from "./PhoneMockup";
import { Sparkles, Home, Globe, Crown, Plus } from "lucide-react";

// Mini rating bar for compact aspect display
const MiniRatingBar = ({ label, value }: { label: string; value: number }) => {
  const gradient = value >= 4 ? "from-emerald-500 to-cyan-400" 
                 : value >= 3 ? "from-amber-500 to-yellow-400"
                 : "from-orange-500 to-amber-400";
  return (
    <div className="flex items-center gap-2">
      <span className="text-[10px] text-white/50 w-10">{label}</span>
      <div className="flex-1 h-1 bg-white/10 rounded-full overflow-hidden">
        <div 
          className={`h-full rounded-full bg-gradient-to-r ${gradient}`}
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
    </div>
  );
};

// Mock show data
const leftShow = {
  photo: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=300&q=80",
  artist: "Odesza",
  venue: "The Gorge",
  date: "Aug 2024",
  ratings: { show: 4, sound: 5, crowd: 3 } as Record<string, number>,
  notes: "Best sunset I've ever seen. The Gorge is magical."
};

const rightShow = {
  photo: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=300&q=80",
  artist: "Rufus Du Sol",
  venue: "Red Rocks",
  date: "Jun 2023",
  ratings: { show: 5, sound: 4, lighting: 5 } as Record<string, number>,
  notes: "Absolutely transcendent. Red Rocks amplified everything."
};

// Show card with full memory context
const ShowCard = ({ show }: { show: typeof leftShow }) => (
  <div className="flex-1 group cursor-pointer">
    <div className="rounded-xl bg-white/[0.03] border border-white/[0.08] p-2.5 transition-all group-hover:border-primary/50 group-hover:bg-white/[0.06]">
      {/* Photo */}
      <div 
        className="w-full aspect-[4/3] rounded-lg mb-2"
        style={{
          backgroundImage: `url('${show.photo}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      
      {/* Artist & Venue */}
      <div className="text-white text-xs font-semibold">{show.artist}</div>
      <div className="text-white/50 text-[10px] mb-2">
        {show.venue} · {show.date}
      </div>
      
      {/* Compact Ratings */}
      <div className="space-y-1 mb-2">
        {show.ratings.show && <MiniRatingBar label="Show" value={show.ratings.show} />}
        {show.ratings.sound && <MiniRatingBar label="Sound" value={show.ratings.sound} />}
        {show.ratings.lighting && <MiniRatingBar label="Light" value={show.ratings.lighting} />}
        {show.ratings.crowd && <MiniRatingBar label="Crowd" value={show.ratings.crowd} />}
      </div>
      
      {/* Notes */}
      <p className="text-[9px] text-white/40 italic line-clamp-2 leading-relaxed">
        "{show.notes}"
      </p>
    </div>
  </div>
);

// Large ranking mockup - bias-free design
const RankingMockup = () => (
  <div className="h-full w-full bg-gradient-accent flex flex-col">
    {/* Header - Progress focused, no numbers */}
    <div className="px-4 py-3 space-y-2">
      <span className="text-white/80 text-sm font-medium">Rank Your Shows</span>
      {/* Minimal progress bar - no numbers */}
      <div className="h-1 bg-white/10 rounded-full overflow-hidden">
        <div 
          className="h-full bg-primary rounded-full transition-all"
          style={{ width: "60%" }}
        />
      </div>
    </div>

    {/* VS Interface */}
    <div className="flex-1 flex flex-col items-center justify-center p-4 gap-3">
      <p className="text-white/60 text-xs">Which was better?</p>

      <div className="flex items-center gap-2 w-full">
        {/* Left show */}
        <ShowCard show={leftShow} />

        {/* VS badge */}
        <div className="shrink-0 w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-secondary/20 border border-primary/40 flex items-center justify-center">
          <span className="text-primary font-bold text-xs">VS</span>
        </div>

        {/* Right show */}
        <ShowCard show={rightShow} />
      </div>

      <p className="text-white/40 text-[10px]">Tap to choose the winner</p>
    </div>

    {/* Bottom Nav - Glass Pill + FAB (no footer with ranking info) */}
    <div className="px-4 py-2.5 flex items-center justify-center gap-4">
      <div className="flex items-center gap-5 px-5 py-2 rounded-full bg-white/[0.06] backdrop-blur-md border border-white/[0.08]">
        <Home className="w-4 h-4 text-white/40" />
        <Globe className="w-4 h-4 text-white/40" />
        <Crown
          className="w-4 h-4 text-primary"
          style={{ filter: "drop-shadow(0 0 4px hsl(var(--primary)))" }}
        />
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
              Head-to-head picks reveal your true feelings.
            </p>

            <p className="text-muted-foreground max-w-lg mx-auto lg:mx-0">
              Finally answer: what's my all-time #1 show?
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
