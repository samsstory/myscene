import PhoneMockup from "./PhoneMockup";
import SceneLogo from "@/components/ui/SceneLogo";
import { ArrowLeft, ChevronDown, ArrowUpDown, Home, Globe, Crown, Plus } from "lucide-react";

const mockShows = [
  { 
    artist: "Rufus Du Sol", 
    venue: "Red Rocks", 
    date: "Sep 2024", 
    rank: 1,
    photo: "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=100&q=80"
  },
  { 
    artist: "Odesza", 
    venue: "The Gorge", 
    date: "Jul 2024", 
    rank: 2,
    photo: "https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=100&q=80"
  },
  { 
    artist: "Disclosure", 
    venue: "Brooklyn Mirage", 
    date: "Aug 2024", 
    rank: 3,
    photo: "https://images.unsplash.com/photo-1459749411175-04bf5292ceea?w=100&q=80"
  },
  { 
    artist: "Bonobo", 
    venue: "Hollywood Bowl", 
    date: "Oct 2024", 
    rank: 4,
    photo: "https://images.unsplash.com/photo-1501386761578-eac5c94b800a?w=100&q=80"
  },
];

const TopRankedMockup = () => (
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

    {/* Page Title */}
    <div className="px-4 py-3 flex items-center gap-2">
      <ArrowLeft className="w-5 h-5 text-white/60" />
      <span className="text-white font-semibold">Top Ranked Shows</span>
    </div>

    {/* Filter Bar */}
    <div className="px-4 pb-3 flex items-center justify-between">
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
        <span className="text-white/80 text-xs">All Time</span>
        <ChevronDown className="w-3 h-3 text-white/50" />
      </div>
      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.05] border border-white/[0.08]">
        <ArrowUpDown className="w-3 h-3 text-white/50" />
        <span className="text-white/80 text-xs">Best</span>
      </div>
    </div>

    {/* Show List */}
    <div className="flex-1 px-3 space-y-2 overflow-hidden">
      {mockShows.map((show) => (
        <div 
          key={show.rank}
          className="flex items-center gap-3 p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.08]"
        >
          {/* Photo Thumbnail */}
          <div 
            className="w-14 h-14 rounded-lg shrink-0"
            style={{
              backgroundImage: `url('${show.photo}')`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
          
          {/* Show Info */}
          <div className="flex-1 min-w-0">
            <div className="text-white text-sm font-semibold truncate">{show.artist}</div>
            <div className="text-white/60 text-xs truncate">{show.venue}</div>
            <div className="text-white/40 text-xs">{show.date}</div>
          </div>

          {/* Rank Badge */}
          <div className="text-white/50 text-sm font-medium pr-1">
            #{show.rank}
          </div>
        </div>
      ))}
    </div>

    {/* Bottom Nav */}
    <div className="px-4 py-3 border-t border-white/[0.08] flex items-center justify-between">
      <div className="flex items-center gap-6">
        <Home className="w-5 h-5 text-white/40" />
        <Globe className="w-5 h-5 text-white/40" />
        <Crown className="w-5 h-5 text-primary" />
      </div>
      <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
        <Plus className="w-5 h-5 text-primary-foreground" />
      </div>
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
            <PhoneMockup className="w-72 md:w-80 lg:w-96" tilt="left">
              <TopRankedMockup />
            </PhoneMockup>
          </div>

          {/* Right: Copy */}
          <div className="space-y-6 text-center lg:text-left order-1 lg:order-2">
            <h2 
              className="text-3xl md:text-4xl lg:text-5xl font-bold text-foreground"
              style={{ textShadow: "0 0 50px rgba(255,255,255,0.1)" }}
            >
              Your concert history, ranked.
            </h2>

            <p className="text-lg text-muted-foreground max-w-lg mx-auto lg:mx-0">
              Every show you've ever been to, beautifully organized and instantly searchable. Scene becomes your personal concert archive.
            </p>

            <ul className="space-y-3 text-muted-foreground text-left max-w-lg mx-auto lg:mx-0">
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Log artists, venues, dates, and your ratings</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Add photos to remember the night</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Filter by time period, sort by rank or date</span>
              </li>
              <li className="flex items-center gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                <span>Your complete concert timeline in one place</span>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CaptureShowcase;
