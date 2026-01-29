interface RankingProgressBarProps {
  comparisons: number;
  totalShows: number;
}

const RankingProgressBar = ({ comparisons, totalShows }: RankingProgressBarProps) => {
  // Calculate progress based on comparisons needed for reliable rankings
  // Rough estimate: need about 2-3 comparisons per show for stable rankings
  const targetComparisons = Math.max(15, totalShows * 2.5);
  const progress = Math.min(100, (comparisons / targetComparisons) * 100);

  return (
    <div className="w-full px-6">
      <div className="h-2 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-primary to-secondary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
};

export default RankingProgressBar;
