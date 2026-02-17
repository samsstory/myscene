import { useState } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export type DatePrecision = "exact" | "approximate" | "unknown";

interface CompactDateSelectorProps {
  date: Date | null;
  precision: DatePrecision;
  selectedMonth: string;
  selectedYear: string;
  hasExifDate: boolean;
  onDateChange: (date: Date | null) => void;
  onPrecisionChange: (precision: DatePrecision) => void;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
}

const MONTHS = [
  { value: "01", label: "January" },
  { value: "02", label: "February" },
  { value: "03", label: "March" },
  { value: "04", label: "April" },
  { value: "05", label: "May" },
  { value: "06", label: "June" },
  { value: "07", label: "July" },
  { value: "08", label: "August" },
  { value: "09", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

// Generate years from current year down to 1970
const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: currentYear - 1969 }, (_, i) => ({
  value: String(currentYear - i),
  label: String(currentYear - i),
}));

const CompactDateSelector = ({
  date,
  precision,
  selectedMonth,
  selectedYear,
  hasExifDate,
  onDateChange,
  onPrecisionChange,
  onMonthChange,
  onYearChange,
}: CompactDateSelectorProps) => {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const effectivePrecision = precision;

  const handlePrecisionClick = (newPrecision: DatePrecision) => {
    if (newPrecision === precision) return;
    onPrecisionChange(newPrecision);
    
    // When switching to exact, clear any approximate selections
    if (newPrecision === "exact") {
      // Keep existing date if present
    } else if (newPrecision === "approximate") {
      // Pre-fill with current year if not set
      if (!selectedYear) {
        onYearChange(String(currentYear));
      }
    } else if (newPrecision === "unknown") {
      // Pre-fill with current year if not set
      if (!selectedYear) {
        onYearChange(String(currentYear));
      }
    }
  };

  const handleDateSelect = (selectedDate: Date | undefined) => {
    onDateChange(selectedDate || null);
    setCalendarOpen(false);
  };

  return (
    <div className="space-y-2">
      {/* Precision toggle */}
      <div className="flex rounded-md border border-input overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => handlePrecisionClick("exact")}
          className={cn(
            "flex-1 py-1.5 px-2 transition-all text-center",
            effectivePrecision === "exact"
              ? "bg-primary/[0.10] border-primary/[0.25] text-primary/80"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          Exact
        </button>
        <button
          type="button"
          onClick={() => handlePrecisionClick("approximate")}
          className={cn(
            "flex-1 py-1.5 px-2 transition-all border-x border-input text-center",
            effectivePrecision === "approximate"
              ? "bg-primary/[0.10] border-primary/[0.25] text-primary/80"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          Month/Year
        </button>
        <button
          type="button"
          onClick={() => handlePrecisionClick("unknown")}
          className={cn(
            "flex-1 py-1.5 px-2 transition-all text-center",
            effectivePrecision === "unknown"
              ? "bg-primary/[0.10] border-primary/[0.25] text-primary/80"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          Year Only
        </button>
      </div>

      {/* Input based on precision */}
      {effectivePrecision === "exact" && (
        <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                "w-full h-10 justify-start text-left font-normal",
                !date && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {date ? format(date, "PPP") : "Select date"}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={date || undefined}
              onSelect={handleDateSelect}
              disabled={(d) => d > new Date()}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      )}

      {effectivePrecision === "approximate" && (
        <div className="flex gap-2">
          <Select value={selectedMonth} onValueChange={onMonthChange}>
            <SelectTrigger className="flex-1 h-10">
              <SelectValue placeholder="Month" />
            </SelectTrigger>
            <SelectContent>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={month.value}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={onYearChange}>
            <SelectTrigger className="w-24 h-10">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {YEARS.map((year) => (
                <SelectItem key={year.value} value={year.value}>
                  {year.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {effectivePrecision === "unknown" && (
        <Select value={selectedYear} onValueChange={onYearChange}>
          <SelectTrigger className="w-full h-10">
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {YEARS.map((year) => (
              <SelectItem key={year.value} value={year.value}>
                {year.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  );
};

export default CompactDateSelector;
