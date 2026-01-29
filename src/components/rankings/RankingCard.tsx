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
}

const RankingCard = ({ show, onClick, disabled }: RankingCardProps) => {
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

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "flex-1 text-left cursor-pointer transition-all duration-200",
        "hover:scale-[1.02] active:scale-[0.98]",
        "disabled:pointer-events-none disabled:opacity-50"
      )}
    >
      <div className="bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] rounded-2xl overflow-hidden">
        {/* Photo Section */}
        <div className="relative aspect-[4/3] overflow-hidden">
          {show.photo_url ? (
            <img
              src={show.photo_url}
              alt="Show photo"
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/20 to-[hsl(var(--coral))]/20 flex items-center justify-center">
              <span className="text-4xl text-white/30">✦</span>
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
                    index === 1 && "bg-gradient-to-r from-[hsl(var(--coral))] to-[hsl(var(--coral))]/70",
                    index === 2 && "bg-gradient-to-r from-amber-400 to-amber-400/70"
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
