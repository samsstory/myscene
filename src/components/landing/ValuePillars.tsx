import PhoneMockup from "./PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";

// Mock for Curate/Feed view
const MockFeedScreen = () => (
  <div className="h-full w-full bg-gradient-accent flex flex-col p-3">
    <div className="text-[10px] text-white/60 mb-2">Your Shows</div>
    <div className="space-y-2 flex-1">
      {[
        { artist: "The Weeknd", venue: "SoFi Stadium", rating: "9.2" },
        { artist: "Tame Impala", venue: "The Greek", rating: "8.8" },
        { artist: "Khruangbin", venue: "Hollywood Bowl", rating: "9.5" },
      ].map((show, i) => (
        <div 
          key={i}
          className="rounded-lg bg-white/[0.03] border border-white/[0.08] p-2 flex items-center gap-2"
        >
          <div 
            className="w-10 h-10 rounded-md bg-gradient-to-br from-primary/40 to-secondary/40 flex items-center justify-center"
          >
            <span className="text-[8px] text-white/80">#{i + 1}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-white text-[10px] font-medium truncate">{show.artist}</div>
            <div className="text-white/50 text-[8px] truncate">{show.venue}</div>
          </div>
          <div className="text-primary text-[10px] font-bold">{show.rating}</div>
        </div>
      ))}
    </div>
  </div>
);

// Mock for Rank/VS view
const MockRankScreen = () => (
  <div className="h-full w-full bg-gradient-accent flex flex-col items-center justify-center p-4">
    <div className="text-[10px] text-white/60 mb-4">Which was better?</div>
    
    <div className="flex items-center gap-2 w-full">
      {/* Left card */}
      <div className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.08] p-2 text-center">
        <div 
          className="w-full aspect-square rounded-md mb-2 bg-gradient-to-br from-primary/30 to-purple-500/30"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=200&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="text-white text-[9px] font-medium">Odesza</div>
        <div className="text-white/50 text-[7px]">The Gorge</div>
      </div>

      {/* VS Badge */}
      <div 
        className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center shrink-0"
      >
        <span className="text-primary text-[8px] font-bold">VS</span>
      </div>

      {/* Right card */}
      <div className="flex-1 rounded-lg bg-white/[0.03] border border-white/[0.08] p-2 text-center">
        <div 
          className="w-full aspect-square rounded-md mb-2 bg-gradient-to-br from-secondary/30 to-orange-500/30"
          style={{
            backgroundImage: "url('https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&q=80')",
            backgroundSize: "cover",
            backgroundPosition: "center",
          }}
        />
        <div className="text-white text-[9px] font-medium">Rufus Du Sol</div>
        <div className="text-white/50 text-[7px]">Red Rocks</div>
      </div>
    </div>

    <div className="mt-4 text-[8px] text-white/40">Tap to choose</div>
  </div>
);

// Mock for Share/Story view
const MockShareScreen = () => (
  <div className="h-full w-full bg-gradient-accent flex flex-col items-center justify-center p-3">
    {/* Instagram story preview */}
    <div 
      className="w-full rounded-xl overflow-hidden relative"
      style={{ aspectRatio: "9/16" }}
    >
      <div 
        className="absolute inset-0 bg-gradient-to-br from-purple-600/40 to-pink-500/40"
        style={{
          backgroundImage: "url('https://images.unsplash.com/photo-1429962714451-bb934ecdc4ec?w=400&q=80')",
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/30" />
      
      {/* Overlay content */}
      <div className="absolute bottom-0 left-0 right-0 p-3">
        <div className="bg-black/40 backdrop-blur-sm rounded-lg p-2 border border-white/10">
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="text-white text-[10px] font-bold">Jamie xx</div>
              <div className="text-white/70 text-[8px]">Printworks · London</div>
            </div>
            <span 
              className="text-[10px] font-bold text-white"
              style={{ textShadow: "0 0 8px rgba(255,255,255,0.5)" }}
            >
              #3
            </span>
          </div>
          <div className="flex items-center gap-1 mt-1">
            <div className="h-1 flex-1 rounded-full bg-gradient-to-r from-green-400 to-green-500" />
            <span className="text-[8px] text-white/80">9.1</span>
          </div>
        </div>
        <div className="flex justify-center mt-2">
          <SceneLogo size="sm" />
        </div>
      </div>
    </div>
  </div>
);

interface PillarProps {
  title: string;
  description: string;
  children: React.ReactNode;
}

const Pillar = ({ title, description, children }: PillarProps) => (
  <div className="flex flex-col items-center text-center space-y-4">
    <PhoneMockup className="w-44 md:w-48">
      {children}
    </PhoneMockup>
    <h3 
      className="text-xl md:text-2xl font-bold text-foreground mt-6"
      style={{ textShadow: "0 0 30px rgba(255,255,255,0.1)" }}
    >
      {title}
    </h3>
    <p className="text-muted-foreground text-sm md:text-base max-w-xs">
      {description}
    </p>
  </div>
);

const ValuePillars = () => {
  return (
    <section className="py-24 md:py-32 relative">
      {/* Subtle divider line */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-px h-24 bg-gradient-to-b from-transparent via-white/10 to-transparent" />
      
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-3 gap-12 md:gap-8 lg:gap-12">
          <Pillar
            title="Capture every show"
            description="Log artists, venues, dates, and your ratings. Add photos to remember the night."
          >
            <MockFeedScreen />
          </Pillar>

          <Pillar
            title="Rank them head-to-head"
            description="Which show was better? Build your true #1 through quick comparisons."
          >
            <MockRankScreen />
          </Pillar>

          <Pillar
            title="Share the memories"
            description="Create stunning story overlays with your ratings and Scene watermark."
          >
            <MockShareScreen />
          </Pillar>
        </div>
      </div>
    </section>
  );
};

export default ValuePillars;
