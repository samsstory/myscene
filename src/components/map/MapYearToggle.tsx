import { cn } from "@/lib/utils";

type YearOption = string | "all";

interface MapYearToggleProps {
  years: YearOption[];
  selectedYear: YearOption;
  onYearChange: (year: YearOption) => void;
}

const MapYearToggle = ({ years, selectedYear, onYearChange }: MapYearToggleProps) => {
  return (
    <div className="flex gap-1">
      {years.map((year) => (
        <button
          key={year}
          onClick={() => onYearChange(year)}
          className={cn(
            "px-3 py-1.5 text-xs rounded-full transition-all font-medium",
            selectedYear === year
              ? "bg-primary text-primary-foreground"
              : "bg-white/[0.04] text-white/50 backdrop-blur-sm hover:bg-white/[0.08]"
          )}
        >
          {year === "all" ? "All" : year}
        </button>
      ))}
    </div>
  );
};

export default MapYearToggle;
