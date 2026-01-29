interface RankingProgressBarProps {
  comparisons?: number;
  totalShows?: number;
  // New props for focused mode
  mode?: 'general' | 'focused';
  completedCount?: number;
  targetCount?: number;
}

const RankingProgressBar = ({ 
  comparisons, 
  totalShows,
  mode = 'general',
  completedCount,
  targetCount
}: RankingProgressBarProps) => {
  let progress: number;
  
  if (mode === 'focused' && completedCount !== undefined && targetCount) {
    progress = (completedCount / targetCount) * 100;
  } else {
    const targetComparisons = Math.max(15, (totalShows || 0) * 2.5);
    progress = Math.min(100, ((comparisons || 0) / targetComparisons) * 100);
  }

  return (
    <div className="w-full px-6">
      {mode === 'focused' && (
        <p className="text-xs text-muted-foreground text-center mb-2">
          {completedCount} of {targetCount} shows ranked
        </p>
      )}
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
