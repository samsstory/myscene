import ExifReader from 'exifreader';

export interface ExifData {
  date: Date | null;
  hasExif: boolean;
  gps?: {
    latitude: number;
    longitude: number;
  };
}

export async function extractExifData(file: File): Promise<ExifData> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const tags = ExifReader.load(arrayBuffer, { expanded: true });
    
    let date: Date | null = null;
    
    // Flatten tags - ExifReader with expanded:true returns nested structure
    const exifTags = tags.exif || {};
    const xmpTags = tags.xmp || {};
    const iptcTags = tags.iptc || {};
    const pngTags = (tags as any).pHYs || (tags as any).tEXt || {}; // PNG-specific chunks
    
    // Try different date fields from various metadata sources
    // EXIF fields (most common for camera photos)
    const dateTimeOriginal = exifTags['DateTimeOriginal']?.description;
    const createDate = exifTags['CreateDate']?.description;
    const dateTime = exifTags['DateTime']?.description;
    
    // XMP fields (common in edited/exported images)
    const xmpCreateDate = xmpTags['CreateDate']?.description;
    const xmpDateCreated = xmpTags['DateCreated']?.description;
    const xmpModifyDate = xmpTags['ModifyDate']?.description;
    
    // PNG tEXt chunks (sometimes contain dates)
    const pngCreationTime = (tags as any)['CreationTime']?.description;
    const pngDate = (tags as any)['date:create']?.description || (tags as any)['date:modify']?.description;
    
    // File metadata fallback
    const fileModifyDate = (tags as any)['FileModifyDate']?.description;
    
    const dateString = dateTimeOriginal || createDate || dateTime || 
                       xmpCreateDate || xmpDateCreated || xmpModifyDate ||
                       pngCreationTime || pngDate || fileModifyDate;
    
    if (dateString) {
      // EXIF date format is usually "YYYY:MM:DD HH:MM:SS"
      const parsedDate = parseExifDate(dateString);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }
    
    // Debug logging to help diagnose extraction issues
    if (!date) {
      console.log('EXIF extraction - no date found. Available tags:', Object.keys(tags));
      console.log('EXIF tags:', Object.keys(exifTags));
      console.log('XMP tags:', Object.keys(xmpTags));
    }
    
    // Extract GPS coordinates if available
    let gps: { latitude: number; longitude: number } | undefined;

    const rawLat = tags['GPSLatitude'];
    const rawLng = tags['GPSLongitude'];
    const latRef = parseGpsRef(tags['GPSLatitudeRef']); // 'N' | 'S' | null
    const lngRef = parseGpsRef(tags['GPSLongitudeRef']); // 'E' | 'W' | null

    const lat = parseGpsCoordinate(rawLat);
    const lng = parseGpsCoordinate(rawLng);

    if (lat != null && lng != null) {
      // If ref is missing, keep whatever sign the coordinate already has.
      // If ref exists, enforce sign accordingly.
      let signedLat = lat;
      let signedLng = lng;

      if (latRef === 'S') signedLat = -Math.abs(lat);
      else if (latRef === 'N') signedLat = Math.abs(lat);

      if (lngRef === 'W') signedLng = -Math.abs(lng);
      else if (lngRef === 'E') signedLng = Math.abs(lng);

      gps = { latitude: signedLat, longitude: signedLng };
    }
    
    return {
      date,
      hasExif: !!date,
      gps,
    };
  } catch (error) {
    console.error('Error extracting EXIF data:', error);
    return {
      date: null,
      hasExif: false,
    };
  }
}

function parseExifDate(dateString: string): Date | null {
  // Common EXIF date format: "YYYY:MM:DD HH:MM:SS"
  const exifPattern = /^(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})$/;
  const match = dateString.match(exifPattern);
  
  if (match) {
    const [, year, month, day, hour, minute, second] = match;
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
  }
  
  // Try standard date parsing as fallback
  const fallbackDate = new Date(dateString);
  if (!isNaN(fallbackDate.getTime())) {
    return fallbackDate;
  }
  
  return null;
}

type ExifTag = {
  description?: string;
  value?: unknown;
};

function parseGpsRef(tag: ExifTag | undefined): 'N' | 'S' | 'E' | 'W' | null {
  if (!tag) return null;

  const candidates: unknown[] = [tag.description, tag.value];
  for (const raw of candidates) {
    if (typeof raw === 'string') {
      const c = raw.trim().toUpperCase()[0];
      if (c === 'N' || c === 'S' || c === 'E' || c === 'W') return c;
    }

    // Some EXIF libs expose the ref as a single-char array or char code
    if (Array.isArray(raw) && raw.length > 0) {
      const first = raw[0];
      if (typeof first === 'string') {
        const c = first.trim().toUpperCase()[0];
        if (c === 'N' || c === 'S' || c === 'E' || c === 'W') return c;
      }
      if (typeof first === 'number') {
        const c = String.fromCharCode(first).toUpperCase();
        if (c === 'N' || c === 'S' || c === 'E' || c === 'W') return c;
      }
    }

    if (typeof raw === 'number' && Number.isFinite(raw)) {
      const c = String.fromCharCode(raw).toUpperCase();
      if (c === 'N' || c === 'S' || c === 'E' || c === 'W') return c;
    }
  }

  return null;
}

function parseGpsCoordinate(tag: ExifTag | undefined): number | null {
  if (!tag) return null;

  const toNumber = (v: unknown): number | null => {
    if (typeof v === 'number' && Number.isFinite(v)) return v;
    if (typeof v === 'string') {
      const n = Number(v);
      return Number.isFinite(n) ? n : null;
    }
    // ExifReader sometimes returns rationals like { numerator, denominator }
    if (
      v &&
      typeof v === 'object' &&
      'numerator' in v &&
      'denominator' in v
    ) {
      const num = (v as any).numerator;
      const den = (v as any).denominator;
      if (typeof num === 'number' && typeof den === 'number' && Number.isFinite(num) && Number.isFinite(den) && den !== 0) {
        return num / den;
      }
    }
    // Some variants are tuples like [num, den]
    if (Array.isArray(v) && v.length === 2) {
      const num = toNumber(v[0]);
      const den = toNumber(v[1]);
      if (num != null && den != null && den !== 0) return num / den;
    }
    return null;
  };

  // Prefer description (ExifReader provides a human-friendly string)
  const desc = tag.description;
  if (typeof desc === 'string' && desc.trim()) {
    // Decimal degrees (e.g. "-97.68639" or "97.68639")
    const decimal = Number(desc);
    if (!Number.isNaN(decimal) && Number.isFinite(decimal)) return decimal;

    // DMS (e.g. "97° 41' 11.02\"" or similar)
    const dms = desc.match(/(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)\D+(\d+(?:\.\d+)?)/);
    if (dms) {
      const deg = Number(dms[1]);
      const min = Number(dms[2]);
      const sec = Number(dms[3]);
      if ([deg, min, sec].every(n => Number.isFinite(n))) {
        return deg + min / 60 + sec / 3600;
      }
    }
  }

  // Fallback: value may be decimal or DMS array of rationals
  const v = tag.value;

  // Decimal-ish
  const asNum = toNumber(v);
  if (asNum != null) return asNum;

  // DMS array (common on iOS): [deg, min, sec]
  if (Array.isArray(v) && v.length >= 3) {
    const deg = toNumber(v[0]);
    const min = toNumber(v[1]);
    const sec = toNumber(v[2]);
    if ([deg, min, sec].every(n => typeof n === 'number' && Number.isFinite(n))) {
      return (deg as number) + (min as number) / 60 + (sec as number) / 3600;
    }
  }

  return null;
}

export interface VenueSuggestion {
  id?: string;
  externalPlaceId?: string;
  name: string;
  address: string;
  city?: string;
  distanceMeters: number;
}

export interface PhotoWithExif {
  file: File;
  previewUrl: string;
  exifData: ExifData;
  id: string;
  suggestedVenue?: VenueSuggestion;
  alternativeVenues?: VenueSuggestion[];
  venueMatchStatus?: 'pending' | 'found' | 'not_found' | 'no_gps';
}

export async function processPhotosWithExif(files: File[]): Promise<PhotoWithExif[]> {
  const results: PhotoWithExif[] = [];
  
  for (const file of files) {
    const exifData = await extractExifData(file);
    const previewUrl = URL.createObjectURL(file);
    
    results.push({
      file,
      previewUrl,
      exifData,
      id: `photo-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    });
  }
  
  return results;
}

export function cleanupPhotoUrls(photos: PhotoWithExif[]) {
  photos.forEach(photo => {
    URL.revokeObjectURL(photo.previewUrl);
  });
}
