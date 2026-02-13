import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Legacy: calculateShowScore and getScoreGradient are deprecated.
// The tag-based system replaces numerical ratings.
export const calculateShowScore = (): number => 0;
export const getScoreGradient = (): string => "from-primary to-primary/70";
