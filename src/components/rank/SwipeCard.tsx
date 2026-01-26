import { useState, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { calculateShowScore } from "@/lib/utils";
import { MapPin, CalendarDays, ChevronLeft, ChevronRight, ChevronDown } from "lucide-react";

interface Show {
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
  artists: Array<{ artist_name: string; is_headliner: boolean }>;
}

interface SwipeCardProps {
  show: Show;
  otherShow: Show;
  onSwipe: (direction: "left" | "right" | "down") => void;
  disabled?: boolean;
}

export const SwipeCard = ({ show, otherShow, onSwipe, disabled }: SwipeCardProps) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [exitDirection, setExitDirection] = useState<"left" | "right" | "down" | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const startPos = useRef({ x: 0, y: 0 });

  const score = calculateShowScore(
    show.rating,
    show.artist_performance,
    show.sound,
    show.lighting,
    show.crowd,
    show.venue_vibe
  );

  const headliners = show.artists.filter((a) => a.is_headliner);
  const openers = show.artists.filter((a) => !a.is_headliner);
  const displayArtists = [...headliners, ...openers].slice(0, 2);
  const remainingCount = show.artists.length - displayArtists.length;

  const SWIPE_THRESHOLD = 100;
  const SWIPE_DOWN_THRESHOLD = 80;

  const handleStart = (clientX: number, clientY: number) => {
    if (disabled) return;
    setIsDragging(true);
    startPos.current = { x: clientX, y: clientY };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || disabled) return;
    const deltaX = clientX - startPos.current.x;
    const deltaY = clientY - startPos.current.y;
    setPosition({ x: deltaX, y: Math.max(0, deltaY) }); // Only allow downward Y movement
  };

  const handleEnd = () => {
    if (!isDragging || disabled) return;
    setIsDragging(false);

    const absX = Math.abs(position.x);
    const absY = position.y;

    if (absY > SWIPE_DOWN_THRESHOLD && absY > absX) {
      // Swipe down - can't compare
      setExitDirection("down");
      setTimeout(() => onSwipe("down"), 200);
    } else if (position.x > SWIPE_THRESHOLD) {
      // Swipe right - this show wins
      setExitDirection("right");
      setTimeout(() => onSwipe("right"), 200);
    } else if (position.x < -SWIPE_THRESHOLD) {
      // Swipe left - other show wins
      setExitDirection("left");
      setTimeout(() => onSwipe("left"), 200);
    } else {
      // Return to center
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    handleStart(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    handleMove(e.touches[0].clientX, e.touches[0].clientY);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    handleStart(e.clientX, e.clientY);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    handleMove(e.clientX, e.clientY);
  };

  const rotation = position.x * 0.05;
  const opacity = exitDirection ? 0 : 1;
  
  const getExitTransform = () => {
    if (exitDirection === "left") return "translateX(-150%) rotate(-30deg)";
    if (exitDirection === "right") return "translateX(150%) rotate(30deg)";
    if (exitDirection === "down") return "translateY(150%)";
    return `translateX(${position.x}px) translateY(${position.y}px) rotate(${rotation}deg)`;
  };

  // Indicator colors based on swipe direction
  const getLeftIndicatorOpacity = () => Math.min(1, Math.abs(Math.min(0, position.x)) / SWIPE_THRESHOLD);
  const getRightIndicatorOpacity = () => Math.min(1, Math.max(0, position.x) / SWIPE_THRESHOLD);
  const getDownIndicatorOpacity = () => Math.min(1, position.y / SWIPE_DOWN_THRESHOLD);

  return (
    <div className="relative w-full max-w-sm mx-auto">
      {/* Swipe indicators */}
      <div 
        className="absolute inset-0 flex items-center justify-start pl-4 pointer-events-none z-10"
        style={{ opacity: getLeftIndicatorOpacity() }}
      >
        <div className="bg-destructive/90 text-destructive-foreground rounded-full p-3">
          <ChevronLeft className="h-8 w-8" />
        </div>
      </div>
      
      <div 
        className="absolute inset-0 flex items-center justify-end pr-4 pointer-events-none z-10"
        style={{ opacity: getRightIndicatorOpacity() }}
      >
        <div className="bg-primary/90 text-primary-foreground rounded-full p-3">
          <ChevronRight className="h-8 w-8" />
        </div>
      </div>
      
      <div 
        className="absolute inset-0 flex items-end justify-center pb-4 pointer-events-none z-10"
        style={{ opacity: getDownIndicatorOpacity() }}
      >
        <div className="bg-muted text-muted-foreground rounded-full p-3">
          <ChevronDown className="h-8 w-8" />
        </div>
      </div>

      {/* Card */}
      <Card
        ref={cardRef}
        className="cursor-grab active:cursor-grabbing select-none touch-none"
        style={{
          transform: getExitTransform(),
          opacity,
          transition: isDragging ? "none" : "all 0.3s ease-out",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleEnd}
        onMouseLeave={() => isDragging && handleEnd()}
      >
        <CardContent className="p-4 space-y-3">
          {show.photo_url ? (
            <div className="w-full aspect-[4/3] rounded-lg overflow-hidden">
              <img
                src={show.photo_url}
                alt="Show photo"
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          ) : (
            <div className="w-full aspect-[4/3] rounded-lg bg-muted flex items-center justify-center">
              <span className="text-4xl font-bold text-primary">{score}</span>
            </div>
          )}

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-lg leading-tight">
                {displayArtists.map((a, idx) => (
                  <span key={idx}>
                    {a.artist_name}
                    {idx < displayArtists.length - 1 && " • "}
                  </span>
                ))}
                {remainingCount > 0 && (
                  <span className="text-muted-foreground text-sm ml-1">
                    +{remainingCount}
                  </span>
                )}
              </div>
              {show.photo_url && (
                <div className="text-2xl font-bold text-primary">{score}</div>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="h-3.5 w-3.5 flex-shrink-0" />
              <span className="truncate">{show.venue_name}</span>
            </div>

            <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <CalendarDays className="h-3.5 w-3.5 flex-shrink-0" />
              <span>
                {new Date(show.show_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Background card (other show preview) */}
      <Card className="absolute inset-0 -z-10 scale-95 opacity-50">
        <CardContent className="p-4">
          {otherShow.photo_url ? (
            <div className="w-full aspect-[4/3] rounded-lg overflow-hidden">
              <img
                src={otherShow.photo_url}
                alt="Other show"
                className="w-full h-full object-cover blur-sm"
                draggable={false}
              />
            </div>
          ) : (
            <div className="w-full aspect-[4/3] rounded-lg bg-muted" />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SwipeCard;
