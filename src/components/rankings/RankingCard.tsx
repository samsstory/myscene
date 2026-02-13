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
    photo_url: string | null;
    notes?: string | null;
    tags?: string[];
    artists: Artist[];
  };
  onClick: () => void;
  disabled?: boolean;
  position?: "left" | "right";
  isWinner?: boolean;
  isLoser?: boolean;
  animationKey?: number;
  isExpanded?: boolean;
}

const RankingCard = ({ 
  show, 
  onClick, 
  disabled, 
  position = "left",
  isWinner = false,
  isLoser = false,
  animationKey = 0,
  isExpanded = false
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

  const tags = show.tags || [];
  const displayTags = isExpanded ? tags : tags.slice(0, 3);

  const slideAnimation = position === "left" 
    ? "animate-slide-in-left" 
    : "animate-slide-in-right";
  
  const shouldSlideIn = !isWinner && !isLoser;

  return (
    <button
      key={`${show.id}-${animationKey}`}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 text-left cursor-pointer transition-all duration-200 rounded-2xl overflow-hidden",
        "hover:scale-[1.02] active:scale-[0.98]",
        "disabled:pointer-events-none",
        shouldSlideIn && slideAnimation,
        shouldSlideIn && position === "right" && "[animation-delay:150ms]",
        isWinner && "animate-winner-glow",
        isLoser && "animate-loser-shrink"
      )}
      style={{
        opacity: shouldSlideIn ? 0 : undefined,
      }}
    >
      <div className={cn(
        "bg-white/[0.04] backdrop-blur-sm border-2 rounded-2xl overflow-hidden transition-all duration-300",
        isWinner ? "border-green-500/80" : "border-white/[0.08]"
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
            <div className="w-full h-full relative overflow-hidden bg-[hsl(var(--background))]">
              <div 
                className="absolute inset-0 animate-pulse-glow"
                style={{
                  background: "radial-gradient(ellipse at 20% 20%, hsl(189 94% 55% / 0.15) 0%, transparent 50%)"
                }}
              />
              <div 
                className="absolute inset-0"
                style={{
                  background: "radial-gradient(ellipse at 80% 80%, hsl(17 88% 60% / 0.15) 0%, transparent 50%)"
                }}
              />
              <div 
                className="absolute inset-0 opacity-[0.03]"
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`
                }}
              />
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
          
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
          
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

        {/* Tags Section */}
        <div className="p-3 space-y-2 transition-all duration-300">
          {displayTags.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {displayTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-primary/15 border border-primary/30 text-white/80"
                >
                  {tag}
                </span>
              ))}
              {!isExpanded && tags.length > 3 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/50">
                  +{tags.length - 3}
                </span>
              )}
            </div>
          )}

          {show.notes && (
            <p className={cn(
              "text-[10px] text-muted-foreground/70 italic mt-2 leading-relaxed transition-all duration-300",
              !isExpanded && "line-clamp-2"
            )}>
              "{isExpanded ? show.notes : (show.notes.length > 60 ? show.notes.substring(0, 60) + '...' : show.notes)}"
            </p>
          )}
        </div>
      </div>
    </button>
  );
};

export default RankingCard;
