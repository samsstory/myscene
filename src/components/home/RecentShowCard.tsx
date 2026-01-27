import { Card, CardContent } from "@/components/ui/card";
import { Music2, MapPin, Calendar as CalendarIcon, Instagram } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ShowRankBadge } from "@/components/feed/ShowRankBadge";
import { cn } from "@/lib/utils";

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
}

interface RankInfo {
  position: number | null;
  total: number;
  comparisonsCount: number;
}

interface RecentShowCardProps {
  show: Show;
  rankInfo: RankInfo;
  onTap: (show: Show) => void;
  onShare: (show: Show) => void;
}

const RecentShowCard = ({ show, rankInfo, onTap, onShare }: RecentShowCardProps) => {
  const artistDisplay = show.artists.slice(0, 2).map((a, idx) => (
    <span key={idx}>
      {a.name}
      {idx < Math.min(show.artists.length - 1, 1) && <span className="text-muted-foreground"> • </span>}
    </span>
  ));

  const extraArtists = show.artists.length > 2 ? ` +${show.artists.length - 2}` : "";
  
  const formattedDate = format(
    parseISO(show.date), 
    parseISO(show.date).getFullYear() === new Date().getFullYear() ? "MMM d" : "MMM yyyy"
  );

  return (
    <Card 
      className="border-border shadow-card hover:shadow-glow transition-all duration-300 cursor-pointer w-full"
      onClick={() => onTap(show)}
    >
      <CardContent className="p-4">
        <div className="flex gap-4">
          {/* Photo thumbnail */}
          <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 border border-border/50">
            {show.photo_url ? (
              <img 
                src={show.photo_url} 
                alt="Show photo" 
                className="w-full h-full object-cover" 
              />
            ) : (
              <div className="w-full h-full bg-muted/30 flex items-center justify-center">
                <Music2 className="h-8 w-8 text-muted-foreground/50" />
              </div>
            )}
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0 flex flex-col justify-center">
            {/* Artist names */}
            <div className="font-bold text-base leading-tight truncate">
              {artistDisplay}
              {extraArtists && (
                <span className="text-muted-foreground font-normal">{extraArtists}</span>
              )}
            </div>

            {/* Venue */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground truncate mt-1">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{show.venue.name}</span>
            </div>

            {/* Date */}
            <div className="flex items-center gap-1.5 text-sm text-muted-foreground mt-0.5">
              <CalendarIcon className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{formattedDate}</span>
            </div>
          </div>

          {/* Actions column - right side */}
          <div className="flex-shrink-0 flex flex-col items-center justify-between py-1">
            {/* Instagram share button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                onShare(show);
              }}
              className={cn(
                "p-1.5 rounded-full transition-all",
                show.photo_url 
                  ? "text-pink-500 hover:bg-pink-500/10 hover:scale-110" 
                  : "text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50"
              )}
            >
              <Instagram className="h-5 w-5" />
            </button>
            
            {/* Rank badge */}
            <ShowRankBadge 
              position={rankInfo.position} 
              total={rankInfo.total} 
              comparisonsCount={rankInfo.comparisonsCount}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RecentShowCard;
