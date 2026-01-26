import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { VenueSuggestion, PhotoWithExif } from '@/lib/exif-utils';

export interface VenueMatchResult {
  primaryVenue: VenueSuggestion | null;
  alternativeVenues: VenueSuggestion[];
  matchSource: 'database' | 'places_api' | 'none';
}

export function useVenueFromLocation() {
  const [isMatching, setIsMatching] = useState(false);

  const matchVenue = useCallback(async (
    latitude: number,
    longitude: number
  ): Promise<VenueMatchResult> => {
    const { data, error } = await supabase.functions.invoke('match-venue-from-location', {
      body: { latitude, longitude }
    });

    if (error) {
      console.error('Venue matching error:', error);
      return {
        primaryVenue: null,
        alternativeVenues: [],
        matchSource: 'none',
      };
    }

    return data as VenueMatchResult;
  }, []);

  const matchVenuesForPhotos = useCallback(async (
    photos: PhotoWithExif[]
  ): Promise<PhotoWithExif[]> => {
    setIsMatching(true);

    try {
      const updatedPhotos = await Promise.all(
        photos.map(async (photo) => {
          // Skip if no GPS data
          if (!photo.exifData.gps) {
            return {
              ...photo,
              venueMatchStatus: 'no_gps' as const,
            };
          }

          try {
            const result = await matchVenue(
              photo.exifData.gps.latitude,
              photo.exifData.gps.longitude
            );

            if (result.primaryVenue) {
              return {
                ...photo,
                suggestedVenue: result.primaryVenue,
                alternativeVenues: result.alternativeVenues,
                venueMatchStatus: 'found' as const,
              };
            } else {
              return {
                ...photo,
                venueMatchStatus: 'not_found' as const,
              };
            }
          } catch (error) {
            console.error('Error matching venue for photo:', photo.id, error);
            return {
              ...photo,
              venueMatchStatus: 'not_found' as const,
            };
          }
        })
      );

      return updatedPhotos;
    } finally {
      setIsMatching(false);
    }
  }, [matchVenue]);

  return {
    matchVenue,
    matchVenuesForPhotos,
    isMatching,
  };
}
