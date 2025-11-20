import { useState } from "react";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
}: DateStepProps) => {
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 50 }, (_, i) => currentYear - i);

  const [calendarMonth, setCalendarMonth] = useState<Date>(
    date || new Date(selectedYear ? parseInt(selectedYear) : currentYear, 
    selectedMonth ? months.indexOf(selectedMonth) : new Date().getMonth())
  );

  const isValid = () => {
    if (datePrecision === "exact") return !!date;
    if (datePrecision === "approximate") return !!selectedMonth && !!selectedYear;
    if (datePrecision === "unknown") return !!selectedYear;
    return false;
  };

  const handleMonthChange = (month: string) => {
    onMonthChange(month);
    const monthIndex = months.indexOf(month);
    setCalendarMonth(new Date(selectedYear ? parseInt(selectedYear) : currentYear, monthIndex));
  };

  const handleYearChange = (year: string) => {
    onYearChange(year);
    const monthIndex = selectedMonth ? months.indexOf(selectedMonth) : 0;
    setCalendarMonth(new Date(parseInt(year), monthIndex));
  };

  return (
    <div className="space-y-6">
      <div>
        <Label className="text-base font-semibold">When was the show?</Label>
      </div>

      <RadioGroup value={datePrecision} onValueChange={onPrecisionChange}>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="exact" id="exact" />
          <Label htmlFor="exact" className="font-normal cursor-pointer">
            It was
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="approximate" id="approximate" />
          <Label htmlFor="approximate" className="font-normal cursor-pointer">
            Sometime in
          </Label>
        </div>
        <div className="flex items-center space-x-2">
          <RadioGroupItem value="unknown" id="unknown" />
          <Label htmlFor="unknown" className="font-normal cursor-pointer">
            Back in
          </Label>
        </div>
      </RadioGroup>

      {datePrecision === "exact" && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Select value={selectedMonth || months[calendarMonth.getMonth()]} onValueChange={handleMonthChange}>
              <SelectTrigger>
                <SelectValue placeholder="Month" />
              </SelectTrigger>
              <SelectContent>
                {months.map((month) => (
                  <SelectItem key={month} value={month}>
                    {month}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={selectedYear || String(calendarMonth.getFullYear())} onValueChange={handleYearChange}>
              <SelectTrigger>
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                {years.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal h-12",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  onDateChange(newDate);
                  if (newDate) {
                    onMonthChange(months[newDate.getMonth()]);
                    onYearChange(String(newDate.getFullYear()));
                  }
                }}
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>
      )}

      {datePrecision === "approximate" && (
        <div className="grid grid-cols-2 gap-3">
          <Select value={selectedMonth} onValueChange={handleMonthChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {months.map((month) => (
                <SelectItem key={month} value={month}>
                  {month}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedYear} onValueChange={handleYearChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {datePrecision === "unknown" && (
        <Select value={selectedYear} onValueChange={handleYearChange}>
          <SelectTrigger>
            <SelectValue placeholder="Select year" />
          </SelectTrigger>
          <SelectContent>
            {years.map((year) => (
              <SelectItem key={year} value={String(year)}>
                {year}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      <Button
        onClick={onContinue}
        disabled={!isValid()}
        className="w-full h-12 text-base"
      >
        Continue
      </Button>
    </div>
  );
};

export default DateStep;
