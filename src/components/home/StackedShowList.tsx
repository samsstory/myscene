import { useRef, useEffect, useState, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Music2 } from "lucide-react";
import StackedShowCard from "./StackedShowCard";

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

interface StackedShowListProps {
  shows: Show[];
  getRankInfo: (showId: string) => RankInfo;
  onShowTap: (show: Show) => void;
  onShowShare: (show: Show) => void;
}

const StackedShowList = ({ shows, getRankInfo, onShowTap, onShowShare }: StackedShowListProps) => {
  const [expandedId, setExpandedId] = useState<string | null>(shows[0]?.id || null);
  const containerRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Set up intersection observer to detect which card is in the center
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > 0.6) {
            const showId = (entry.target as HTMLElement).dataset.showId;
            if (showId) {
              setExpandedId(showId);
            }
          }
        });
      },
      {
        root: containerRef.current,
        threshold: [0.6],
        rootMargin: "-30% 0px -30% 0px",
      }
    );

    cardRefs.current.forEach((el) => {
      observer.observe(el);
    });

    return () => observer.disconnect();
  }, [shows]);

  // Handle card expansion when tapped (scrolls it into view)
  const handleExpand = useCallback((showId: string) => {
    // Always expand the card first
    setExpandedId(showId);
    
    // Then scroll it into view if we have the ref
    const cardEl = cardRefs.current.get(showId);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, []);

  // Register card ref
  const setCardRef = useCallback((showId: string, el: HTMLDivElement | null) => {
    if (el) {
      cardRefs.current.set(showId, el);
    } else {
      cardRefs.current.delete(showId);
    }
  }, []);

  // Calculate z-index based on position relative to expanded card.
  // Important: Keep values LOW (under 50) to not conflict with modal overlays.
  const getZIndex = (index: number, expandedIndex: number, total: number) => {
    if (expandedIndex === -1) {
      // No card expanded - simple descending order (top cards in front)
      return total - index;
    }

    if (index === expandedIndex) {
      // Expanded card is always on top (but still below modals)
      return 40;
    }

    if (index < expandedIndex) {
      // Cards ABOVE expanded: closer to expanded => higher z-index
      const distance = expandedIndex - index;
      return Math.max(1, 30 - distance);
    }

    // Cards BELOW expanded: closer to expanded => higher z-index,
    // but always behind the expanded card.
    const distance = index - expandedIndex;
    return Math.max(1, 20 - distance);
  };

  const expandedIndex = shows.findIndex(s => s.id === expandedId);

  if (shows.length === 0) {
    return (
      <Card className="border-border">
        <CardContent className="py-12 text-center">
          <Music2 className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No shows yet. Add your first concert!</p>
        </CardContent>
      </Card>
    );
  }

  // Single show - always expanded, no stacking needed
  if (shows.length === 1) {
    return (
      <StackedShowCard
        show={shows[0]}
        rankInfo={getRankInfo(shows[0].id)}
        isExpanded={true}
        onExpand={() => {}}
        onTap={() => onShowTap(shows[0])}
        onShare={() => onShowShare(shows[0])}
      />
    );
  }

  return (
    <div
      ref={containerRef}
      className="overflow-y-auto snap-y snap-mandatory max-h-[70vh] scrollbar-hide scroll-smooth-momentum"
      style={{ scrollSnapType: "y mandatory" }}
    >
      <div className="relative pb-32 pt-2">
        {shows.map((show, index) => (
          <div
            key={show.id}
            className="snap-center will-change-transform"
            style={{
              marginTop: index === 0 ? 0 : "-20px",
              zIndex: getZIndex(index, expandedIndex, shows.length),
              position: "relative",
              pointerEvents: "auto",
              scrollSnapStop: "always",
            }}
          >
            <StackedShowCard
              ref={(el) => setCardRef(show.id, el)}
              show={show}
              rankInfo={getRankInfo(show.id)}
              isExpanded={expandedId === show.id}
              onExpand={() => handleExpand(show.id)}
              onTap={() => onShowTap(show)}
              onShare={() => onShowShare(show)}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default StackedShowList;
