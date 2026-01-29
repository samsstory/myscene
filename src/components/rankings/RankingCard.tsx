import { cn } from "@/lib/utils";

interface Artist {
  artist_name: string;
  is_headliner: boolean;
}

interface RankingCardProps {
  show: {
    id: string;
    venue_name: string;
    show_date: string;
    rating: number;
    artist_performance: number | null;
    sound: number | null;
    lighting: number | null;
    crowd: number | null;
    venue_vibe: number | null;
    photo_url: string | null;
    notes?: string | null;
    artists: Artist[];
  };
  onClick: () => void;
  disabled?: boolean;
  position?: "left" | "right";
  isWinner?: boolean;
  isLoser?: boolean;
  animationKey?: number;
}

const RankingCard = ({ 
  show, 
  onClick, 
  disabled, 
  position = "left",
  isWinner = false,
  isLoser = false,
  animationKey = 0
}: RankingCardProps) => {
  const headliner = show.artists.find(a => a.is_headliner);
  const artistName = headliner?.artist_name || show.artists[0]?.artist_name || "Unknown";
  
  const venueShort = show.venue_name.length > 18 
    ? show.venue_name.substring(0, 16) + "..." 
    : show.venue_name;
  
  const dateFormatted = new Date(show.show_date).toLocaleDateString("en-US", {
    month: "short",
    year: "numeric",
  });

  // Get top 3 aspect ratings that exist
  const aspects = [
    { label: "Show", value: show.artist_performance },
    { label: "Sound", value: show.sound },
    { label: "Light", value: show.lighting },
    { label: "Crowd", value: show.crowd },
    { label: "Vibe", value: show.venue_vibe },
  ].filter(a => a.value !== null).slice(0, 3);

  // If no aspects, use overall rating
  if (aspects.length === 0 && show.rating) {
    aspects.push({ label: "Show", value: show.rating });
  }

  const slideAnimation = position === "left" 
    ? "animate-slide-in-left" 
    : "animate-slide-in-right";
  
  const animationDelay = position === "right" ? "animation-delay-150" : "";

  return (
    <button
      key={`${show.id}-${animationKey}`}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 text-left cursor-pointer transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        "disabled:pointer-events-none",
        slideAnimation,
        position === "right" && "[animation-delay:150ms]",
        isWinner && "animate-winner-pulse winner-glow z-10",
        isLoser && "animate-fade-scale-out"
      )}
      style={{
        opacity: 0, // Start invisible for slide-in animation
      }}
    >
      <div className={cn(
        "bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl overflow-hidden transition-all duration-300",
        isWinner && "border-primary/50"
      )}>
        {/* Photo Section */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {show.photo_url ? (
            <img
              src={show.photo_url}
              alt="Show photo"
              className="w-full h-full object-cover"
            />
          ) : (
            /* Enhanced mesh gradient fallback with Scene star */
            <div className="w-full h-full relative overflow-hidden bg-[hsl(var(--background))]">
              {/* Mesh gradient - cyan top-left */}
              <div 
                className="absolute inset-0 animate-pulse-glow"
                style={{
                  background: "radial-gradient(ellipse at 20% 20%, hsl(189 94% 55% / 0.15) 0%, transparent 50%)"
                }}
              />
              {/* Mesh gradient - coral bottom-right */}
              <div 
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(ellipse at 80% 80%, hsl(17 88% 60% / 0.15) 0%, transparent 50%)"
                }}
              />
              {/* Noise texture overlay */}
              <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
                }}
              />
              {/* Scene star logo */}
              <div className="absolute inset-0 flex items-center justify-center">
                <span 
                  className="text-5xl text-white/40 animate-pulse-glow"
                  style={{ 
                    textShadow: '0 0 12px rgba(255,255,255,0.4), 0 0 24px rgba(255,255,255,0.2)' 
                  }}
                >
                  ✦
                </span>
              </div>
            </div>
          )}
          
          {/* Gradient overlay for text */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
          {/* Overlaid text */}
          <div className="absolute bottom-0 left-0 right-0 p-3">
            <h3 className="font-bold text-white text-lg leading-tight truncate"
                style={{ textShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
              {artistName}
            </h3>
            <p className="text-white/70 text-xs mt-0.5">
              {venueShort} · {dateFormatted}
            </p>
          </div>
        </div>

        {/* Rating Bars Section */}
        <div className="p-3 space-y-2">
          {aspects.map((aspect, index) => (
            <div key={aspect.label} className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground w-10 flex-shrink-0">
                {aspect.label}
              </span>
              <div className="flex-1 h-1.5 bg-white/[0.08] rounded-full overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    index === 0 && "bg-gradient-to-r from-primary to-primary/70",
                    index === 1 && "bg-gradient-to-r from-secondary to-secondary/70",
                    index === 2 && "bg-gradient-to-r from-accent to-accent/70"
                  )}
                  style={{ width: `${((aspect.value || 0) / 5) * 100}%` }}
                />
              </div>
            </div>
          ))}

          {/* Notes preview */}
          {show.notes && (
            <p className="text-[10px] text-muted-foreground/70 italic line-clamp-2 mt-2 leading-relaxed">
              "{show.notes.substring(0, 60)}{show.notes.length > 60 ? '...' : ''}"
            </p>
          )}
        </div>
      </div>
    </button>
  );
};

export default RankingCard;
