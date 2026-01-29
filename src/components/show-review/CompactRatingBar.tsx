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
  // Vibrant cyan-to-coral gradient matching website mockup
  if (value >= 5) return "from-cyan-400 via-teal-400 to-emerald-400";
  if (value >= 4) return "from-cyan-400 via-emerald-400 to-lime-400";
  if (value >= 3) return "from-amber-400 via-orange-400 to-coral";
  if (value >= 2) return "from-orange-400 via-coral to-red-400";
  return "from-red-500 to-orange-500";
};

export const CompactRatingBar = ({ icon, label, value }: CompactRatingBarProps) => {
  if (!value) return null;

  return (
    <div className="flex items-center gap-3">
      {/* Label */}
      <span className="text-sm text-white/60 w-20 flex-shrink-0">
        {label}
      </span>
      
      {/* Progress Bar - Full width with vibrant gradient */}
      <div className="flex-1 h-2.5 bg-white/[0.08] rounded-full overflow-hidden">
        <div
          className={cn(
            "h-full rounded-full bg-gradient-to-r transition-all duration-700 ease-out",
            getRatingGradient(value)
          )}
          style={{ 
            width: `${(value / 5) * 100}%`,
            boxShadow: "0 0 12px rgba(34, 211, 238, 0.3)"
          }}
        />
      </div>
    </div>
  );
};

export default CompactRatingBar;
