import { useState, useRef, ReactNode } from "react";
import { Trash2 } from "lucide-react";

interface SwipeableRankingCardProps {
  children: ReactNode;
  onDelete: () => void;
}

const SwipeableRankingCard = ({ children, onDelete }: SwipeableRankingCardProps) => {
  const [translateX, setTranslateX] = useState(0);
  const [isRevealed, setIsRevealed] = useState(false);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const isDragging = useRef(false);
  const isVerticalScroll = useRef(false);

  const REVEAL_THRESHOLD = 80;
  const REVEALED_POSITION = -100;
  const MAX_DRAG = -120;

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isDragging.current = false;
    isVerticalScroll.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const deltaX = currentX - touchStartX.current;
    const deltaY = currentY - touchStartY.current;

    // Determine scroll direction on first significant movement
    if (!isDragging.current && !isVerticalScroll.current) {
      if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
        isVerticalScroll.current = true;
        return;
      }
      if (Math.abs(deltaX) > 10) {
        isDragging.current = true;
      }
    }

    if (isVerticalScroll.current) return;

    if (isRevealed) {
      // When revealed, allow swiping right to close
      const newX = REVEALED_POSITION + deltaX;
      setTranslateX(Math.min(0, Math.max(MAX_DRAG, newX)));
    } else {
      // Only allow swiping left (negative delta)
      if (deltaX < 0) {
        setTranslateX(Math.max(MAX_DRAG, deltaX));
      }
    }
  };

  const handleTouchEnd = () => {
    if (isVerticalScroll.current) {
      isVerticalScroll.current = false;
      return;
    }

    if (isRevealed) {
      // If we're revealed and user swiped right enough, close
      if (translateX > REVEALED_POSITION / 2) {
        setTranslateX(0);
        setIsRevealed(false);
      } else {
        setTranslateX(REVEALED_POSITION);
      }
    } else {
      // If swipe exceeds threshold, reveal delete action
      if (Math.abs(translateX) > REVEAL_THRESHOLD) {
        setTranslateX(REVEALED_POSITION);
        setIsRevealed(true);
      } else {
        setTranslateX(0);
      }
    }
    isDragging.current = false;
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onDelete();
    // Reset after triggering delete
    setTranslateX(0);
    setIsRevealed(false);
  };

  const handleCardClick = () => {
    if (isRevealed) {
      // Close the revealed state if open
      setTranslateX(0);
      setIsRevealed(false);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-xl">
      {/* Delete background - revealed on swipe */}
      <div 
        className="absolute inset-0 flex items-center justify-end bg-destructive/80 rounded-xl"
        style={{ opacity: Math.min(1, Math.abs(translateX) / 50) }}
      >
        <button
          onClick={handleDeleteClick}
          className="flex items-center gap-2 px-6 h-full text-white font-medium hover:bg-destructive transition-colors"
        >
          <Trash2 className="h-5 w-5" />
          <span className="text-sm">Delete</span>
        </button>
      </div>

      {/* Sliding card content */}
      <div
        className="relative transition-transform duration-300 ease-out"
        style={{ transform: `translateX(${translateX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleCardClick}
      >
        {children}
      </div>
    </div>
  );
};

export default SwipeableRankingCard;
