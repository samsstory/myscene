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
    const tags = ExifReader.load(arrayBuffer);
    
    let date: Date | null = null;
    
    // Try different date fields
    const dateTimeOriginal = tags['DateTimeOriginal']?.description;
    const createDate = tags['CreateDate']?.description;
    const dateTime = tags['DateTime']?.description;
    
    const dateString = dateTimeOriginal || createDate || dateTime;
    
    if (dateString) {
      // EXIF date format is usually "YYYY:MM:DD HH:MM:SS"
      const parsedDate = parseExifDate(dateString);
      if (parsedDate && !isNaN(parsedDate.getTime())) {
        date = parsedDate;
      }
    }
    
    // Extract GPS coordinates if available
    let gps: { latitude: number; longitude: number } | undefined;
    
    const gpsLatitude = tags['GPSLatitude']?.description;
    const gpsLongitude = tags['GPSLongitude']?.description;
    
    if (gpsLatitude && gpsLongitude) {
      const lat = parseFloat(gpsLatitude);
      const lng = parseFloat(gpsLongitude);
      
      if (!isNaN(lat) && !isNaN(lng)) {
        gps = { latitude: lat, longitude: lng };
      }
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
