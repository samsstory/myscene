import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type YearOption = string | "all";

interface MapYearToggleProps {
  years: YearOption[];
  selectedYear: YearOption;
  onYearChange: (year: YearOption) => void;
}

const MapYearToggle = ({ years, selectedYear, onYearChange }: MapYearToggleProps) => {
  return (
    <Select value={selectedYear} onValueChange={onYearChange}>
      <SelectTrigger className="w-[100px] h-8 bg-card/90 backdrop-blur-sm border-white/10 text-sm">
        <SelectValue placeholder="Year" />
      </SelectTrigger>
      <SelectContent className="bg-card border-white/10 z-50">
        {years.map((year) => (
          <SelectItem key={year} value={year} className="text-sm">
            {year === "all" ? "All Time" : year}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
};

export default MapYearToggle;
