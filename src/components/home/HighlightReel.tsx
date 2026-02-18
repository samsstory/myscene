import { useState, useEffect, useCallback, useRef } from "react";
import { cn, formatShowDate } from "@/lib/utils";
import SceneLogo from "@/components/ui/SceneLogo";

interface Artist {
  name: string;
  isHeadliner: boolean;
  imageUrl?: string;
}

interface Show {
  id: string;
  artists: Artist[];
  venue: {
    name: string;
    location: string;
  };
  date: string;
  datePrecision?: string | null;
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const isPausedRef = useRef(false);
  const scrollStartX = useRef(0);
  const resumeTimer = useRef<ReturnType<typeof setTimeout>>();

  // Update active dot based on scroll position
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let scrollTimer: ReturnType<typeof setTimeout>;
    const handleScroll = () => {
      clearTimeout(scrollTimer);
      scrollTimer = setTimeout(() => {
        const cardWidth = el.scrollWidth / shows.length;
        const index = Math.round(el.scrollLeft / cardWidth);
        setActiveIndex(Math.max(0, Math.min(index, shows.length - 1)));
      }, 80);
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", handleScroll);
      clearTimeout(scrollTimer);
    };
  }, [shows.length]);

  // Auto-rotate every 5s
  useEffect(() => {
    if (shows.length <= 1) return;
    const timer = setInterval(() => {
      if (isPausedRef.current || !scrollRef.current) return;
      const el = scrollRef.current;
      const cardWidth = el.scrollWidth / shows.length;
      const nextIndex = (activeIndex + 1) % shows.length;
      el.scrollTo({ left: nextIndex * cardWidth, behavior: "smooth" });
    }, 5000);
    return () => clearInterval(timer);
  }, [activeIndex, shows.length]);

  const pauseAutoRotate = useCallback(() => {
    isPausedRef.current = true;
    clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => {
      isPausedRef.current = false;
    }, 10000);
  }, []);

  const scrollToIndex = useCallback((index: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = el.scrollWidth / shows.length;
    el.scrollTo({ left: index * cardWidth, behavior: "smooth" });
    pauseAutoRotate();
  }, [shows.length, pauseAutoRotate]);

  if (shows.length === 0) return null;

  return (
    <div className="w-full">
      {/* Scroll track */}
      <div
        ref={scrollRef}
        className="flex overflow-x-auto gap-3 px-4 pb-1 scrollbar-hide"
        style={{ scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}
        onTouchStart={(e) => {
          scrollStartX.current = e.touches[0].clientX;
          pauseAutoRotate();
        }}
      >
        {shows.map((show, i) => {
          const headliner = show.artists.find(a => a.isHeadliner) || show.artists[0];
          const artistName = headliner?.name || "Unknown Artist";
          const rankInfo = getRankInfo(show.id);
          const primaryTag = show.tags?.[0];
          const formattedDate = formatShowDate(show.date, show.datePrecision);

          return (
            <div
              key={show.id}
              className="flex-shrink-0 w-[85vw] max-w-sm"
              style={{ scrollSnapAlign: "start" }}
            >
              <button
                className="w-full text-left block"
                onClick={() => {
                  // Only fire tap if scroll hasn't moved much
                  onShowTap(show);
                }}
              >
                <div className="relative aspect-[4/5] rounded-2xl overflow-hidden">
                  {/* Background */}
                  {show.photo_url ? (
                    <img
                      src={show.photo_url}
                      alt={artistName}
                      className="w-full h-full object-cover"
                    />
                  ) : headliner?.imageUrl ? (
                    <img
                      src={headliner.imageUrl}
                      alt={artistName}
                      className="w-full h-full object-cover scale-110"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-primary/30 via-background to-accent/20 flex items-center justify-center">
                      <span
                        className="text-6xl text-foreground/10 select-none"
                        style={{ textShadow: "0 0 20px rgba(255,255,255,0.3)" }}
                      >
                        ✦
                      </span>
                    </div>
                  )}

                  {/* Gradient overlays */}
                  <div className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
                  <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-transparent to-transparent" style={{ height: "6rem" }} />

                  {/* Rank badge — top left */}
                  <div className="absolute top-3 left-3">
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

                  {/* Scene logo — top right */}
                  <div className="absolute top-3 right-3 opacity-50">
                    <SceneLogo />
                  </div>

                  {/* Bottom content */}
                  <div className="absolute bottom-0 left-0 right-0 p-4 pb-5">
                    {primaryTag && (
                      <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white/90 mb-2 bg-white/[0.12] backdrop-blur-sm border border-white/[0.15]">
                        {primaryTag}
                      </div>
                    )}
                    <h2
                      className="font-bold text-2xl text-white leading-tight mb-0.5"
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
            </div>
          );
        })}

        {/* Right padding sentinel so last card doesn't hug the edge */}
        <div className="flex-shrink-0 w-4" aria-hidden />
      </div>

      {/* Dots — below the track */}
      {shows.length > 1 && (
        <div className="flex justify-center gap-1.5 mt-3">
          {shows.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIndex(i)}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === activeIndex
                  ? "w-5 bg-foreground/70"
                  : "w-1.5 bg-foreground/20 hover:bg-foreground/40"
              )}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default HighlightReel;
