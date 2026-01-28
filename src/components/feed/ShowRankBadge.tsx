interface ShowRankBadgeProps {
  position: number | null;
  total: number;
  comparisonsCount?: number;
}

export const ShowRankBadge = ({ position, total, comparisonsCount = 0 }: ShowRankBadgeProps) => {
  // Show "Unranked" if no comparisons have been made
  if (comparisonsCount === 0 || position === null || position === 0) {
    return (
      <span 
        className="text-xs font-medium text-white/40 uppercase tracking-[0.1em]"
        style={{ textShadow: "0 0 6px rgba(255,255,255,0.15)" }}
      >
        Unranked
      </span>
    );
  }

  // Calculate percentile for glow intensity
  const percentile = ((total - position + 1) / total) * 100;
  
  // Determine glow intensity based on rank (top ranks glow brighter)
  const getGlowIntensity = () => {
    if (percentile >= 90) return "0 0 12px rgba(255,255,255,0.6), 0 0 20px rgba(255,255,255,0.3)";
    if (percentile >= 75) return "0 0 10px rgba(255,255,255,0.5), 0 0 16px rgba(255,255,255,0.2)";
    if (percentile >= 50) return "0 0 8px rgba(255,255,255,0.4), 0 0 12px rgba(255,255,255,0.15)";
    return "0 0 6px rgba(255,255,255,0.3)";
  };

  // Determine text opacity based on rank
  const getOpacity = () => {
    if (percentile >= 90) return "text-white";
    if (percentile >= 75) return "text-white/90";
    if (percentile >= 50) return "text-white/80";
    return "text-white/70";
  };

  return (
    <span 
      className={`text-sm font-bold ${getOpacity()} tracking-wide`}
      style={{ textShadow: getGlowIntensity() }}
    >
      #{position}
    </span>
  );
};

export default ShowRankBadge;
