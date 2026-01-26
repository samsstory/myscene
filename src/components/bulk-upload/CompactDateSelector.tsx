import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  // If we have EXIF date and haven't changed precision, show exact mode
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

  return (
    <div className="space-y-2">
      {/* Precision toggle */}
      <div className="flex rounded-md border border-input overflow-hidden text-xs">
        <button
          type="button"
          onClick={() => handlePrecisionClick("exact")}
          className={cn(
            "flex-1 py-1.5 px-2 transition-colors text-center",
            effectivePrecision === "exact"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          Exact
        </button>
        <button
          type="button"
          onClick={() => handlePrecisionClick("approximate")}
          className={cn(
            "flex-1 py-1.5 px-2 transition-colors border-x border-input text-center",
            effectivePrecision === "approximate"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          Month/Year
        </button>
        <button
          type="button"
          onClick={() => handlePrecisionClick("unknown")}
          className={cn(
            "flex-1 py-1.5 px-2 transition-colors text-center",
            effectivePrecision === "unknown"
              ? "bg-primary text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted"
          )}
        >
          Year Only
        </button>
      </div>

      {/* Input based on precision */}
      {effectivePrecision === "exact" && (
        <div className="relative group">
          <input
            type="date"
            value={date ? format(date, "yyyy-MM-dd") : ""}
            onChange={(e) => {
              const val = e.target.value;
              onDateChange(val ? new Date(val + "T12:00:00") : null);
            }}
            className={cn(
              "w-full h-10 px-3 text-sm rounded-md border border-input bg-background",
              "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
              !date && "text-transparent focus:text-foreground"
            )}
            max={format(new Date(), "yyyy-MM-dd")}
          />
          {!date && (
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground pointer-events-none group-focus-within:hidden">
              Select date
            </span>
          )}
        </div>
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
              ))}</SelectContent>
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
            ))}</SelectContent>
        </Select>
      )}
    </div>
  );
};

export default CompactDateSelector;
