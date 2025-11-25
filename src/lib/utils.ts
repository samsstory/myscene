import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const calculateShowScore = (
  overallRating: number,
  artistPerformance?: number | null,
  sound?: number | null,
  lighting?: number | null,
  crowd?: number | null,
  venueVibe?: number | null
): number => {
  const hasDetailedRatings = 
    artistPerformance || sound || lighting || crowd || venueVibe;
  
  if (hasDetailedRatings) {
    const totalPoints = 
      overallRating + 
      (artistPerformance || 0) + 
      (sound || 0) + 
      (lighting || 0) + 
      (crowd || 0) + 
      (venueVibe || 0);
    return Math.round((totalPoints / 30) * 100) / 10;
  } else {
    return Math.round((overallRating / 5) * 100) / 10;
  }
};

export const getScoreGradient = (score: number): string => {
  if (score >= 9.0) return "from-[hsl(45,93%,58%)] to-[hsl(189,94%,55%)]"; // Gold to blue
  if (score >= 7.0) return "from-[hsl(17,88%,60%)] to-[hsl(260,80%,60%)]"; // Coral to purple
  if (score >= 5.0) return "from-[hsl(30,90%,55%)] to-[hsl(330,85%,65%)]"; // Orange to pink
  return "from-[hsl(0,84%,60%)] to-[hsl(17,88%,60%)]"; // Red to orange
};
