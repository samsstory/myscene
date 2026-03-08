/** Shared location parsing utilities for consistent city/country extraction */

const STATE_FULL_TO_ABBREV: Record<string, string> = {
  'alabama': 'AL', 'alaska': 'AK', 'arizona': 'AZ', 'arkansas': 'AR',
  'california': 'CA', 'colorado': 'CO', 'connecticut': 'CT', 'delaware': 'DE',
  'florida': 'FL', 'georgia': 'GA', 'hawaii': 'HI', 'idaho': 'ID',
  'illinois': 'IL', 'indiana': 'IN', 'iowa': 'IA', 'kansas': 'KS',
  'kentucky': 'KY', 'louisiana': 'LA', 'maine': 'ME', 'maryland': 'MD',
  'massachusetts': 'MA', 'michigan': 'MI', 'minnesota': 'MN', 'mississippi': 'MS',
  'missouri': 'MO', 'montana': 'MT', 'nebraska': 'NE', 'nevada': 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', 'ohio': 'OH', 'oklahoma': 'OK',
  'oregon': 'OR', 'pennsylvania': 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', 'tennessee': 'TN', 'texas': 'TX', 'utah': 'UT',
  'vermont': 'VT', 'virginia': 'VA', 'washington': 'WA', 'west virginia': 'WV',
  'wisconsin': 'WI', 'wyoming': 'WY', 'district of columbia': 'DC',
};

const US_STATE_ABBREVS = new Set(Object.values(STATE_FULL_TO_ABBREV));

/** Strip zip codes and trailing numbers from a location part */
const stripZip = (part: string): string => part.replace(/\s*\d{4,5}(-\d{4})?\s*$/, '').trim();

/** Normalize a state string to its 2-letter abbreviation, or return as-is */
const normalizeState = (raw: string): string => {
  const cleaned = stripZip(raw);
  // Already an abbreviation?
  if (US_STATE_ABBREVS.has(cleaned.toUpperCase())) return cleaned.toUpperCase();
  // Full name?
  const abbrev = STATE_FULL_TO_ABBREV[cleaned.toLowerCase()];
  if (abbrev) return abbrev;
  return cleaned;
};

/** Returns true if a string (after cleaning) is a US state name or abbreviation */
const isUSState = (raw: string): boolean => {
  const cleaned = stripZip(raw);
  return US_STATE_ABBREVS.has(cleaned.toUpperCase()) || cleaned.toLowerCase() in STATE_FULL_TO_ABBREV;
};

/**
 * Extract a normalized country from a venue_location string.
 * US addresses → "United States", international → last comma-separated part.
 */
export const getCountryFromLocation = (location: string): string => {
  const parts = location.split(',').map(p => p.trim());
  const lastPart = stripZip(parts[parts.length - 1]);

  // Explicit US labels
  if (['USA', 'US', 'United States', 'U.S.', 'U.S.A.'].includes(lastPart)) {
    return 'United States';
  }

  // Any part is a US state?
  for (const part of parts) {
    if (isUSState(part)) return 'United States';
  }

  // International: last part is the country
  return parts.length >= 2 ? lastPart : 'United States';
};

/**
 * Extract a normalized "City, ST" key from a venue_location string.
 * Handles street addresses, zip codes, and full state names.
 * Output is always "CityName, ST" for US addresses for consistent deduplication.
 */
export const getCityFromLocation = (location: string): string => {
  const parts = location.split(',').map(p => stripZip(p).trim()).filter(Boolean);

  // International addresses with 4+ parts: skip leading street/neighborhood parts
  // e.g. "Andador Careyes, Tonalá, Jalisco, Mexico" → "Tonalá, Jalisco"
  if (parts.length >= 4) {
    const country = parts[parts.length - 1];
    const isUS = ['USA', 'US', 'United States', 'U.S.', 'U.S.A.'].includes(country) ||
      isUSState(parts[parts.length - 2] || '');

    if (isUS) {
      // Find the state part (usually second-to-last or third-to-last)
      for (let i = parts.length - 1; i >= 1; i--) {
        if (isUSState(parts[i])) {
          const city = parts[i - 1].replace(/^\d+\s+/, ''); // strip leading street numbers
          return `${city}, ${normalizeState(parts[i])}`;
        }
      }
    }
    // International: take city + region (2nd-to-last, 3rd-to-last)
    return `${parts[parts.length - 3]}, ${parts[parts.length - 2]}`;
  }

  // 3-part: "Street, City, State" or "City, State, Country"
  if (parts.length === 3) {
    const thirdIsUS = isUSState(parts[2]) ||
      ['USA', 'US', 'United States', 'U.S.', 'U.S.A.'].includes(parts[2]);
    // If first part starts with a number → street address
    if (/^\d/.test(parts[0])) {
      const state = isUSState(parts[2]) ? normalizeState(parts[2]) : parts[2];
      return `${parts[1]}, ${state}`;
    }
    // If third part is a US state
    if (isUSState(parts[2])) {
      return `${parts[1]}, ${normalizeState(parts[2])}`;
    }
    // "City, State, Country"
    if (thirdIsUS) {
      return `${parts[0]}, ${normalizeState(parts[1])}`;
    }
    // International: "City, Region, Country" → "City, Region"
    return `${parts[0]}, ${parts[1]}`;
  }

  // 2-part: "City, State" or "City, Country"
  if (parts.length === 2) {
    const state = normalizeState(parts[1]);
    return `${parts[0]}, ${state}`;
  }

  return parts[0] || location;
};
