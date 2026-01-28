import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Instagram, Eye, Music2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ShowRankBadge } from "@/components/feed/ShowRankBadge";
import { cn, getScoreGradient, calculateShowScore } from "@/lib/utils";
import { forwardRef } from "react";

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
      // Collapsed State - Peek Header with photo background
      return (
        <div
          ref={ref}
          data-show-id={show.id}
          className="cursor-pointer"
          onClick={onExpand}
        >
          <Card className="border-border shadow-card overflow-hidden">
            <div className="relative">
              {/* Background: Photo or Gradient */}
              {show.photo_url ? (
                <div 
                  className="absolute inset-0 bg-cover bg-top"
                  style={{ backgroundImage: `url(${show.photo_url})` }}
                />
              ) : (
                <div className={cn("absolute inset-0 bg-gradient-to-r", scoreGradient)} />
              )}
              
              {/* Dark overlay for text legibility */}
              <div className="absolute inset-0 bg-black/50" />
              
              {/* Content */}
              <CardContent className="relative p-3 flex items-center justify-between">
                <span className="font-bold text-base truncate flex-1 pr-2 text-white drop-shadow-md">
                  {artistName}
                </span>
                <ShowRankBadge 
                  position={rankInfo.position} 
                  total={rankInfo.total} 
                  comparisonsCount={rankInfo.comparisonsCount}
                />
              </CardContent>
            </div>
          </Card>
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
        <Card className="border-border shadow-glow overflow-hidden">
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
                <Music2 className="h-16 w-16 text-white/30" />
              </div>
            )}
            
            {/* Floating Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
            
            {/* Content Overlay */}
            <div className="absolute bottom-0 left-0 right-0 p-4">
              {/* Score Badge */}
              <div className={cn(
                "inline-flex items-center justify-center px-3 py-1 rounded-full text-lg font-black text-white mb-2",
                "bg-gradient-to-r shadow-lg",
                scoreGradient
              )}>
                {score.toFixed(1)}
              </div>
              
              {/* Artist Name */}
              <div className="font-bold text-xl text-white leading-tight">
                {artistDisplay}
                {extraArtists && (
                  <span className="text-white/70 font-normal">{extraArtists}</span>
                )}
              </div>
              
              {/* Venue & Date */}
              <div className="text-white/80 text-sm mt-1">
                {show.venue.name} · {formattedDate}
              </div>
              
              {/* Scene Logo */}
              <div 
                className="absolute bottom-4 right-4 text-white/75 font-black text-sm tracking-[0.25em] uppercase"
                style={{
                  textShadow: "0 0 8px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.2)"
                }}
              >
                Scene ✦
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <CardContent className="p-3 flex justify-between items-center bg-card">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground hover:text-pink-500"
              onClick={(e) => {
                e.stopPropagation();
                onShare();
              }}
            >
              <Instagram className="h-4 w-4 mr-2" />
              Share
            </Button>
            
            <div className="flex items-center gap-2">
              <ShowRankBadge 
                position={rankInfo.position} 
                total={rankInfo.total} 
                comparisonsCount={rankInfo.comparisonsCount}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onTap();
                }}
              >
                <Eye className="h-4 w-4 mr-2" />
                View
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
);

StackedShowCard.displayName = "StackedShowCard";

export default StackedShowCard;
