
# Approximate Date Mode with Month/Year Only Selection

## Overview

When "I don't remember the exact date" is checked, the calendar will be replaced with standalone month and year dropdowns. Users can proceed with just a year selected (month is optional).

## Current State

- Checkbox toggles `isApproximate` state
- Calendar always visible regardless of checkbox
- Precision only has "exact" vs "approximate" (both still require a full date)

## New Behavior

| Checkbox State | UI Shown | Required Fields | Precision Value |
|----------------|----------|-----------------|-----------------|
| Unchecked | Quick select buttons + Calendar | Full date | `exact` |
| Checked | Month dropdown + Year dropdown | Year only (month optional) | `approximate` or `unknown` |

## Technical Implementation

### File: `src/components/add-show-steps/DateStep.tsx`

**1. Add Select component import**
```tsx
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
```

**2. Update `handleApproximateChange`**
When toggling to approximate mode:
- Clear the exact date (`onDateChange(undefined)`)
- Set precision to `unknown` initially (just year)
- Default year to current year if not set

**3. Add handlers for month/year selection in approximate mode**
```tsx
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
```

**4. Update `isValid()` function**
```tsx
const isValid = () => {
  if (isApproximate) {
    // Only year is required in approximate mode
    return !!selectedYear;
  }
  return !!date;
};
```

**5. Conditional rendering in JSX**

When `isApproximate` is false (exact mode):
- Show quick select buttons
- Show full calendar

When `isApproximate` is true (approximate mode):
- Hide quick select buttons
- Hide calendar
- Show Month dropdown (with "Don't remember" option)
- Show Year dropdown (required)

**Month/Year UI:**
```tsx
{isApproximate && (
  <div className="space-y-3">
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
      <Select value={selectedMonth || "unknown"} onValueChange={(v) => handleMonthSelect(v === "unknown" ? "" : v)}>
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
```

## Data Flow Summary

```
User checks "I don't remember" checkbox
  → Calendar hides, Year/Month dropdowns appear
  → Year defaults to current year
  → Precision set to "unknown"

User selects a month
  → Precision changes to "approximate"

User clears month (selects "Don't remember")
  → Precision changes back to "unknown"

On save (already implemented in AddShowFlow.tsx):
  - "exact" → uses full date
  - "approximate" → creates date as 1st of selected month/year
  - "unknown" → creates date as Jan 1st of selected year
```

## Files to Modify

- `src/components/add-show-steps/DateStep.tsx` - All UI and logic changes
