import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

interface DateStepProps {
  date: Date | undefined;
  datePrecision: string;
  selectedMonth: string;
  selectedYear: string;
  onDateChange: (date: Date | undefined) => void;
  onPrecisionChange: (precision: string) => void;
  onMonthChange: (month: string) => void;
  onYearChange: (year: string) => void;
  onContinue: () => void;
  isEditing?: boolean;
  onSave?: () => void;
}

const DateStep = ({
  date,
  datePrecision,
  selectedMonth,
  selectedYear,
  onDateChange,
  onPrecisionChange,
  onMonthChange,
  onYearChange,
  onContinue,
  isEditing,
  onSave,
}: DateStepProps) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 100 }, (_, i) => currentYear - i);

  const [isApproximate, setIsApproximate] = useState(datePrecision !== "exact");

  const handleQuickSelect = (daysAgo: number) => {
    const selectedDate = new Date();
    selectedDate.setDate(selectedDate.getDate() - daysAgo);
    onDateChange(selectedDate);
    onMonthChange(months[selectedDate.getMonth()]);
    onYearChange(String(selectedDate.getFullYear()));
    onPrecisionChange("exact");
    setIsApproximate(false);
  };

  const handleDateSelect = (newDate: Date | undefined) => {
    onDateChange(newDate);
    if (newDate) {
      onMonthChange(months[newDate.getMonth()]);
      onYearChange(String(newDate.getFullYear()));
      onPrecisionChange("exact");
    }
  };

  const handleApproximateChange = (checked: boolean) => {
    setIsApproximate(checked);
    if (checked) {
      // Switching to approximate mode
      onDateChange(undefined);
      // Default to current year if not set
      if (!selectedYear) {
        onYearChange(String(currentYear));
      }
      // Set precision based on whether month is selected
      onPrecisionChange(selectedMonth ? "approximate" : "unknown");
    } else {
      // Switching back to exact mode
      onPrecisionChange("exact");
    }
  };

  const handleMonthSelect = (month: string) => {
    onMonthChange(month);
    // If month is selected, precision is "approximate"
    // If month is cleared, precision is "unknown"
    onPrecisionChange(month ? "approximate" : "unknown");
  };

  const handleYearSelect = (year: string) => {
    onYearChange(year);
    // Precision depends on whether month is also set
    onPrecisionChange(selectedMonth ? "approximate" : "unknown");
  };

  const isValid = () => {
    if (isApproximate) {
      // Only year is required in approximate mode
      return !!selectedYear;
    }
    return !!date;
  };

  return (
    <div className="space-y-2">
      <div>
        <Label className="text-sm font-semibold">When was the show?</Label>
      </div>

      {/* Approximate date checkbox */}
      <div className="flex items-center space-x-2">
        <Checkbox
          id="approximate"
          checked={isApproximate}
          onCheckedChange={handleApproximateChange}
        />
        <label
          htmlFor="approximate"
          className="text-xs text-muted-foreground cursor-pointer"
        >
          I don't remember the exact date
        </label>
      </div>

      {!isApproximate ? (
        <>
          {/* Quick select buttons */}
          <div className="flex gap-2 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(0)}
              className={cn(
                "text-xs h-8",
                date && new Date().toDateString() === date.toDateString() && "bg-accent"
              )}
            >
              Today
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(1)}
              className="text-xs h-8"
            >
              Last night
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(2)}
              className="text-xs h-8"
            >
              2 days ago
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                // Find last weekend (Saturday)
                const today = new Date();
                const dayOfWeek = today.getDay();
                const daysToSaturday = dayOfWeek === 0 ? 1 : dayOfWeek + 1;
                handleQuickSelect(daysToSaturday);
              }}
              className="text-xs h-8"
            >
              Last weekend
            </Button>
          </div>

          {/* Inline Calendar */}
          <div className="flex justify-center">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateSelect}
              disabled={(d) => d > new Date()}
              className="rounded-md border [&_.rdp]:p-2 [&_.rdp-cell]:h-8 [&_.rdp-cell]:w-8 [&_.rdp-head_cell]:w-8 [&_.rdp-button]:h-8 [&_.rdp-button]:w-8"
            />
          </div>
        </>
      ) : (
        /* Month/Year dropdowns for approximate mode */
        <div className="space-y-3 py-2">
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Year</Label>
            <Select value={selectedYear} onValueChange={handleYearSelect}>
              <SelectTrigger>
                <SelectValue placeholder="Select year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={year.toString()}>{year}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">Month (optional)</Label>
            <Select 
              value={selectedMonth || "unknown"} 
              onValueChange={(v) => handleMonthSelect(v === "unknown" ? "" : v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select month" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unknown">Don't remember</SelectItem>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>{month}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* Continue/Save button */}
      {isEditing && onSave ? (
        <Button
          onClick={onSave}
          disabled={!isValid()}
          className="w-full h-10 text-sm"
        >
          Save Changes
        </Button>
      ) : (
        <Button
          onClick={onContinue}
          disabled={!isValid()}
          className="w-full h-10 text-sm"
        >
          Continue
        </Button>
      )}
    </div>
  );
};

export default DateStep;
