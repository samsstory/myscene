import { Card } from "@/components/ui/card";
import { Instagram } from "lucide-react";
import { format, parseISO } from "date-fns";
import { cn, getScoreGradient, calculateShowScore } from "@/lib/utils";
import { forwardRef } from "react";
import SceneLogo from "@/components/ui/SceneLogo";
import { Badge } from "@/components/ui/badge";

interface Artist {
  name: string;
  isHeadliner: boolean;
}

interface Show {
  id: string;
  artists: Artist[];
  venue: {
    name: string;
    location: string;
  };
  date: string;
  rating: number;
  photo_url?: string | null;
  artistPerformance?: number | null;
  sound?: number | null;
  lighting?: number | null;
  crowd?: number | null;
  venueVibe?: number | null;
  isLocalDemo?: boolean; // Flag for demo-created shows
}

interface RankInfo {
  position: number | null;
  total: number;
  comparisonsCount: number;
}

interface StackedShowCardProps {
  show: Show;
  rankInfo: RankInfo;
  isExpanded: boolean;
  onExpand: () => void;
  onTap: () => void;
  onShare: () => void;
}

const StackedShowCard = forwardRef<HTMLDivElement, StackedShowCardProps>(
  ({ show, rankInfo, isExpanded, onExpand, onTap, onShare }, ref) => {
    const headliner = show.artists.find(a => a.isHeadliner) || show.artists[0];
    const artistName = headliner?.name || "Unknown Artist";
    
    const score = calculateShowScore(
      show.rating,
      show.artistPerformance,
      show.sound,
      show.lighting,
      show.crowd,
      show.venueVibe
    );
    
    const scoreGradient = getScoreGradient(score);
    
    const formattedDate = format(
      parseISO(show.date),
      parseISO(show.date).getFullYear() === new Date().getFullYear() ? "MMM d" : "MMM d, yyyy"
    );

    // Full artist display for expanded view
    const artistDisplay = show.artists.slice(0, 2).map((a, idx) => (
      <span key={idx}>
        {a.name}
        {idx < Math.min(show.artists.length - 1, 1) && <span className="text-white/70"> • </span>}
      </span>
    ));
    const extraArtists = show.artists.length > 2 ? ` +${show.artists.length - 2}` : "";

    if (!isExpanded) {
      // Collapsed State - Minimal glass peek header
      return (
        <div
          ref={ref}
          data-show-id={show.id}
          className="cursor-pointer"
          onClick={onExpand}
        >
          <div className="rounded-xl overflow-hidden bg-white/[0.03] backdrop-blur-sm border border-white/[0.05] transition-all hover:bg-white/[0.06]">
            <div className="relative">
              {/* Subtle background hint */}
              {show.photo_url ? (
                <div 
                  className="absolute inset-0 bg-cover bg-center opacity-20"
                  style={{ backgroundImage: `url(${show.photo_url})` }}
                />
              ) : (
                <div className={cn("absolute inset-0 opacity-10 bg-gradient-to-r", scoreGradient)} />
              )}
              
              {/* Content */}
              <div className="relative py-5 px-4 flex items-center justify-between">
                <span 
                  className="font-bold text-base text-white/90 truncate flex-1 pr-3"
                  style={{ textShadow: "0 0 12px rgba(255,255,255,0.4)" }}
                >
                  {artistName}
                </span>
                <span 
                  className="text-xs font-medium text-white/60 tracking-wide"
                  style={{ textShadow: "0 0 6px rgba(255,255,255,0.2)" }}
                >
                  {rankInfo.comparisonsCount > 0 && rankInfo.position ? `#${rankInfo.position} All Time` : "Unranked"}
                </span>
              </div>
            </div>
          </div>
        </div>
      );
    }

    // Expanded State - Full Photo Card
    return (
      <div
        ref={ref}
        data-show-id={show.id}
        className="cursor-pointer"
        onClick={onTap}
      >
        <Card className="border-white/[0.08] shadow-glow overflow-hidden bg-white/[0.02]">
          {/* Photo or Gradient Background */}
          <div className="relative aspect-[4/3] overflow-hidden">
            {show.photo_url ? (
              <img
                src={show.photo_url}
                alt={`${artistName} show`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className={cn("w-full h-full bg-gradient-to-br", scoreGradient, "flex items-center justify-center")}>
                <span className="text-4xl text-white/40 select-none" style={{ textShadow: "0 0 12px rgba(255,255,255,0.4)" }}>✦</span>
              </div>
            )}
            
            {/* Floating Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Top Left: Rank Badge or Unsaved Badge */}
            <div className="absolute top-3 left-3 flex items-center gap-2">
              {show.isLocalDemo ? (
                <Badge variant="secondary" className="bg-amber-500/30 text-amber-200 border-amber-500/40 text-xs">
                  Unsaved
                </Badge>
              ) : (
                <div className="px-2.5 py-1 rounded-full bg-black/40 backdrop-blur-sm">
                  <span 
                    className="text-xs font-bold text-white tracking-wide"
                    style={{ textShadow: "0 0 8px rgba(255,255,255,0.4)" }}
                  >
                    {rankInfo.comparisonsCount > 0 && rankInfo.position ? `#${rankInfo.position} All Time` : "Unranked"}
                  </span>
                </div>
              )}
            </div>
            
            {/* Top Right: Instagram Share Button */}
            <button
              className={cn(
                "absolute top-3 right-3 h-8 w-8 rounded-full flex items-center justify-center",
                "bg-white/10 backdrop-blur-sm border border-white/10",
                "hover:bg-white/20 transition-all",
                show.photo_url ? "text-pink-400 hover:text-pink-300" : "text-white/50 hover:text-white/70"
              )}
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
            >
              <Instagram className="h-4 w-4" style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.3))" }} />
            </button>
            
            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {/* Score Badge - White background */}
              <div className="inline-flex items-center justify-center px-3 py-1 rounded-full text-lg font-black text-black mb-2 bg-white shadow-lg">
                {score.toFixed(1)}
              </div>
              
              {/* Artist Name */}
              <div 
                className="font-bold text-xl text-white leading-tight"
                style={{ textShadow: "0 0 16px rgba(255,255,255,0.5)" }}
              >
                {artistDisplay}
                {extraArtists && (
                  <span className="text-white/70 font-normal">{extraArtists}</span>
                )}
              </div>
              
              {/* Venue & Date */}
              <div 
                className="text-white/70 text-sm mt-1"
                style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}
              >
                {show.venue.name} · {formattedDate}
              </div>
              
              {/* Scene Logo */}
              <div className="absolute bottom-4 right-4">
                <SceneLogo />
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  }
);

StackedShowCard.displayName = "StackedShowCard";

export default StackedShowCard;
