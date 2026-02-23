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

/**
 * Truncate a comma-separated artist list to `max` names, appending "+ N more".
 * Also works with an array of names.
 */
export function truncateArtists(
  input: string | string[],
  max: number = 3,
): string {
  const names = Array.isArray(input)
    ? input
    : input.split(",").map((s) => s.trim()).filter(Boolean);
  if (names.length <= max) return names.join(", ");
  return `${names.slice(0, max).join(", ")} + ${names.length - max} more`;
}

