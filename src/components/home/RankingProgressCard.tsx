import { ChevronRight } from "lucide-react";
import ConfirmationRing from "@/components/ui/ConfirmationRing";
import { cn } from "@/lib/utils";

interface RankingProgressCardProps {
  percentage: number;
  totalShows: number;
  onTap?: () => void;
}

/**
 * Prominent ranking progress card that shows the user's global ranking percentage.
 * Always visible (even at 100%) as it fluctuates when new shows are added.
 */
const RankingProgressCard = ({ percentage, totalShows, onTap }: RankingProgressCardProps) => {
  const roundedPercentage = Math.round(percentage);
  const isComplete = roundedPercentage >= 100;
  
  // Determine message based on percentage
  const getMessage = () => {
    if (isComplete) return "All shows ranked! Add more to keep comparing.";
    if (roundedPercentage >= 75) return "Almost there! A few more comparisons to lock in.";
    if (roundedPercentage >= 50) return "Halfway ranked. Keep comparing to solidify your list.";
    if (roundedPercentage >= 25) return "Good start! Compare more shows to refine rankings.";
    return "Compare shows to build your power rankings.";
  };

  return (
    <button
      onClick={onTap}
      className={cn(
        "w-full p-4 rounded-2xl transition-all",
        "bg-white/[0.04] backdrop-blur-sm border border-white/[0.08]",
        "hover:bg-white/[0.08] active:scale-[0.98]",
        "flex items-center gap-4"
      )}
    >
      {/* Large confirmation ring */}
      <ConfirmationRing 
        percentage={percentage} 
        size="lg" 
        showLabel={false}
      />
      
      {/* Text content */}
      <div className="flex-1 text-left">
        <div className="flex items-center gap-2">
          <span 
            className="text-2xl font-bold text-white/95"
            style={{ textShadow: "0 0 16px rgba(255,255,255,0.5)" }}
          >
            {roundedPercentage}%
          </span>
          <span 
            className="text-sm font-medium text-white/60"
            style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}
          >
            Ranked
          </span>
        </div>
        <p 
          className="text-sm text-white/50 mt-0.5"
          style={{ textShadow: "0 0 6px rgba(255,255,255,0.1)" }}
        >
          {getMessage()}
        </p>
      </div>
      
      {/* Chevron indicator */}
      <ChevronRight 
        className="h-5 w-5 text-white/30 flex-shrink-0" 
        style={{ filter: "drop-shadow(0 0 4px rgba(255,255,255,0.2))" }}
      />
    </button>
  );
};

export default RankingProgressCard;
