import { useState, useEffect, useCallback, useRef } from "react";
import { Card } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import SceneLogo from "@/components/ui/SceneLogo";

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
  photo_url?: string | null;
  tags?: string[];
}

interface RankInfo {
  position: number | null;
  total: number;
  comparisonsCount: number;
}

interface HighlightReelProps {
  shows: Show[];
  getRankInfo: (showId: string) => RankInfo;
  onShowTap: (show: Show) => void;
}

const HighlightReel = ({ shows, getRankInfo, onShowTap }: HighlightReelProps) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isSwiping = useRef(false);

  // Auto-rotate every 5s
  useEffect(() => {
    if (isPaused || shows.length <= 1) return;
    const timer = setInterval(() => {
      setActiveIndex(prev => (prev + 1) % shows.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [isPaused, shows.length]);

  const goNext = useCallback(() => {
    setActiveIndex(prev => (prev + 1) % shows.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  }, [shows.length]);

  const goPrev = useCallback(() => {
    setActiveIndex(prev => (prev - 1 + shows.length) % shows.length);
    setIsPaused(true);
    setTimeout(() => setIsPaused(false), 10000);
  }, [shows.length]);

  const handleSwipeStart = useCallback((clientX: number, clientY: number) => {
    touchStartX.current = clientX;
    touchStartY.current = clientY;
    isSwiping.current = false;
  }, []);

  const handleSwipeEnd = useCallback((clientX: number) => {
    const deltaX = clientX - touchStartX.current;
    const SWIPE_THRESHOLD = 50;
    if (Math.abs(deltaX) > SWIPE_THRESHOLD) {
      isSwiping.current = true;
      if (deltaX < 0) goNext();
      else goPrev();
    }
  }, [goNext, goPrev]);

  if (shows.length === 0) return null;
  const show = shows[activeIndex];
  const headliner = show.artists.find(a => a.isHeadliner) || show.artists[0];
  const artistName = headliner?.name || "Unknown Artist";
  const rankInfo = getRankInfo(show.id);
  const primaryTag = show.tags?.[0];

  const formattedDate = format(
    parseISO(show.date),
    parseISO(show.date).getFullYear() === new Date().getFullYear() ? "MMM d" : "MMM d, yyyy"
  );

  return (
    <div 
      className="relative -mx-4"
      onTouchStart={(e) => {
        setIsPaused(true);
        handleSwipeStart(e.touches[0].clientX, e.touches[0].clientY);
      }}
      onTouchEnd={(e) => {
        handleSwipeEnd(e.changedTouches[0].clientX);
        setTimeout(() => setIsPaused(false), 8000);
      }}
    >
      <button
        onClick={() => { if (!isSwiping.current) onShowTap(show); }}
        className="w-full text-left block"
      >
        <div className="relative aspect-[3/4] max-h-[65vh] overflow-hidden">
          {/* Background */}
          {show.photo_url ? (
            <img
              src={show.photo_url}
              alt={artistName}
              className="w-full h-full object-cover transition-opacity duration-700"
              key={show.id}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-primary/30 via-background to-accent/20 flex items-center justify-center">
              <span 
                className="text-6xl text-white/20 select-none"
                style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}
              >
                ✦
              </span>
            </div>
          )}

          {/* Gradient overlays */}
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-transparent to-transparent h-24" />

          {/* Top: Rank badge */}
          <div className="absolute top-4 left-4">
            <div className="px-3 py-1.5 rounded-full bg-black/30 backdrop-blur-md border border-white/10">
              <span
                className="text-xs font-bold text-white/90 tracking-wide"
                style={{ textShadow: "0 0 8px rgba(255,255,255,0.4)" }}
              >
                {rankInfo.comparisonsCount > 0 && rankInfo.position 
                  ? `#${rankInfo.position} All Time` 
                  : "Unranked"}
              </span>
            </div>
          </div>

          {/* Scene logo */}
          <div className="absolute top-4 right-4 opacity-60">
            <SceneLogo />
          </div>

          {/* Bottom content */}
          <div className="absolute bottom-0 left-0 right-0 p-5 pb-6">
            {primaryTag && (
              <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium text-white/90 mb-3 bg-white/[0.12] backdrop-blur-sm border border-white/[0.15]">
                {primaryTag}
              </div>
            )}

            <h2
              className="font-bold text-3xl text-white leading-tight mb-1"
              style={{ textShadow: "0 2px 20px rgba(0,0,0,0.5), 0 0 40px rgba(255,255,255,0.15)" }}
            >
              {artistName}
            </h2>

            <p
              className="text-white/70 text-sm"
              style={{ textShadow: "0 1px 8px rgba(0,0,0,0.4)" }}
            >
              {show.venue.name} · {formattedDate}
            </p>
          </div>
        </div>
      </button>

      {/* Navigation arrows */}
      {shows.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goPrev(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 text-white/60 hover:text-white/90 hover:bg-black/40 transition-all"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goNext(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-black/20 backdrop-blur-sm border border-white/10 text-white/60 hover:text-white/90 hover:bg-black/40 transition-all"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      )}

      {/* Dots indicator */}
      {shows.length > 1 && (
        <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1.5">
          {shows.map((_, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                setActiveIndex(i);
                setIsPaused(true);
                setTimeout(() => setIsPaused(false), 8000);
              }}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === activeIndex 
                  ? "w-6 bg-white/80" 
                  : "w-1.5 bg-white/30 hover:bg-white/50"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HighlightReel;
