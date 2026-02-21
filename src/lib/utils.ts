import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, parseISO } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a show date for display.
 * - "approximate" or "unknown" precision → "MMM yyyy" (e.g. "Oct 2024")
 * - exact, same year → "MMM d" (e.g. "Oct 1")
 * - exact, different year → "MMM d, yyyy" (e.g. "Oct 1, 2024")
 */
export function formatShowDate(dateStr: string, datePrecision?: string | null): string {
  const date = parseISO(dateStr);
  if (datePrecision === "approximate" || datePrecision === "unknown") {
    return format(date, "MMM yyyy");
  }
  const isCurrentYear = date.getFullYear() === new Date().getFullYear();
  return format(date, isCurrentYear ? "MMM d" : "MMM d, yyyy");
}

