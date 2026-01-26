import { Badge } from "@/components/ui/badge";

interface ShowRankBadgeProps {
  position: number | null;
  total: number;
  comparisonsCount?: number;
}

export const ShowRankBadge = ({ position, total, comparisonsCount = 0 }: ShowRankBadgeProps) => {
  // Show "Unranked" if no comparisons have been made
  if (comparisonsCount === 0 || position === null || position === 0) {
    return (
      <Badge 
        variant="outline" 
        className="text-xs font-medium border-muted-foreground/30 text-muted-foreground"
      >
        Unranked
      </Badge>
    );
  }

  // Calculate percentile for gradient
  const percentile = ((total - position + 1) / total) * 100;
  
  // Determine gradient class based on percentile
  const getGradientClass = () => {
    if (percentile >= 90) return "from-[hsl(142,76%,45%)] to-[hsl(160,84%,40%)]"; // Green - Top 10%
    if (percentile >= 75) return "from-[hsl(85,70%,50%)] to-[hsl(142,70%,45%)]"; // Lime - Top 25%
    if (percentile >= 50) return "from-[hsl(45,93%,55%)] to-[hsl(60,80%,50%)]"; // Gold - Top 50%
    if (percentile >= 25) return "from-[hsl(30,90%,55%)] to-[hsl(45,90%,50%)]"; // Orange
    return "from-muted to-muted"; // Default
  };

  return (
    <div 
      className={`inline-flex items-center justify-center px-2.5 py-1 rounded-full text-xs font-bold text-white bg-gradient-to-r ${getGradientClass()} shadow-sm`}
    >
      #{position}
    </div>
  );
};

export default ShowRankBadge;
