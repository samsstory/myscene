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
  if (score >= 9.0) return "from-[hsl(142,76%,45%)] to-[hsl(160,84%,40%)]"; // Bright green to teal - exceptional
  if (score >= 7.0) return "from-[hsl(85,70%,50%)] to-[hsl(142,70%,45%)]"; // Lime to green - great
  if (score >= 5.0) return "from-[hsl(45,93%,55%)] to-[hsl(60,80%,50%)]"; // Gold to yellow - good/average
  if (score >= 3.0) return "from-[hsl(30,90%,55%)] to-[hsl(45,90%,50%)]"; // Orange to gold - below average
  return "from-[hsl(0,84%,55%)] to-[hsl(20,90%,50%)]"; // Red to orange - poor
};
