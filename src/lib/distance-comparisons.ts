const USA_WIDTH = 2800;
const EARTH_CIRCUMFERENCE = 24900;
const MOON_DISTANCE = 238900;

function getDistanceComparison(miles: number): string {
  if (miles < USA_WIDTH * 0.9) {
    const percent = Math.round((miles / USA_WIDTH) * 100);
    if (percent >= 75) return "Almost across the USA 🇺🇸";
    if (percent === 50) return "Halfway across the USA 🇺🇸";
    return `${percent}% across the USA 🇺🇸`;
  } else if (miles < EARTH_CIRCUMFERENCE * 1.2) {
    if (miles < EARTH_CIRCUMFERENCE) {
      const percent = Math.round((miles / EARTH_CIRCUMFERENCE) * 100);
      if (percent === 50) return "Halfway around the world 🌍";
      return `${percent}% around the world 🌍`;
    }
    return `${(miles / EARTH_CIRCUMFERENCE).toFixed(1)}x around the world 🌍`;
  } else {
    const percent = Math.round((miles / MOON_DISTANCE) * 100);
    if (percent > 100) return `${(miles / MOON_DISTANCE).toFixed(1)}x to the Moon 🚀`;
    if (percent === 100) return "You've danced to the Moon 🌙";
    if (percent === 50) return "Halfway to the Moon 🌙";
    return `${percent}% of the way to the Moon 🌙`;
  }
}

export function getComparisonsForMiles(miles: number): string[] {
  if (miles < 100) return ["Keep dancing! 🕺"];

  const comparisons: string[] = [getDistanceComparison(miles)];

  // Add cross-tier comparisons for higher mileages
  if (miles >= USA_WIDTH * 0.9 && miles < EARTH_CIRCUMFERENCE * 1.2) {
    comparisons.push(`${Math.round((miles / USA_WIDTH) * 100)}% across the USA 🇺🇸`);
  } else if (miles >= EARTH_CIRCUMFERENCE * 1.2) {
    comparisons.push(`${(miles / EARTH_CIRCUMFERENCE).toFixed(1)}x around the world 🌍`);
    comparisons.push(`${Math.round((miles / MOON_DISTANCE) * 100)}% to the Moon 🌙`);
  }

  // Deduplicate
  return [...new Set(comparisons)];
}
