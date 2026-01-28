import { cn } from "@/lib/utils";

interface CompactRatingBarProps {
  icon: React.ReactNode;
  label: string;
  value: number | null | undefined;
}

const getRatingLabel = (rating: number) => {
  const labels = ["Terrible", "Bad", "Okay", "Great", "Amazing"];
  return labels[rating - 1] || "Not rated";
};

const getRatingGradient = (value: number) => {
  if (value >= 5) return "from-emerald-500 to-cyan-400";
  if (value >= 4) return "from-lime-500 to-emerald-400";
  if (value >= 3) return "from-amber-500 to-yellow-400";
  if (value >= 2) return "from-orange-500 to-amber-400";
  return "from-red-500 to-orange-400";
};

export const CompactRatingBar = ({ icon, label, value }: CompactRatingBarProps) => {
  if (!value) return null;

  return (
    <div className="flex items-center gap-3">
      {/* Icon */}
      <div className="text-white/50 flex-shrink-0">
        {icon}
      </div>
      
      {/* Label */}
      <span className="text-sm text-white/60 w-24 flex-shrink-0">
        {label}
      </span>
      
      {/* Progress Bar */}
      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-500",
            getRatingGradient(value)
          )}
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
      
      {/* Text Label */}
      <span className="text-sm text-white/80 w-16 text-right flex-shrink-0">
        {getRatingLabel(value)}
      </span>
    </div>
  );
};

export default CompactRatingBar;
