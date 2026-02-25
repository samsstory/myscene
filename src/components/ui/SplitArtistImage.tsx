/**
 * Renders a horizontally split image for B2B/B3B sets.
 * Each artist gets an equal-width slice, cropped to show the face.
 */

import { cn } from "@/lib/utils";

interface ArtistSlice {
  imageUrl?: string | null;
  name: string;
}

interface SplitArtistImageProps {
  artists: ArtistSlice[];
  className?: string;
  /** Fallback when no artists have images */
  fallback?: React.ReactNode;
}

export default function SplitArtistImage({
  artists,
  className,
  fallback,
}: SplitArtistImageProps) {
  const withImages = artists.filter((a) => a.imageUrl);

  if (withImages.length === 0) {
    return <>{fallback}</>;
  }

  // If only one has an image, render it full-width
  if (withImages.length === 1) {
    return (
      <img
        src={withImages[0].imageUrl!}
        alt={withImages[0].name}
        className={cn("w-full h-full object-cover object-top", className)}
      />
    );
  }

  return (
    <div className={cn("flex w-full h-full overflow-hidden", className)}>
      {artists.map((artist, i) => {
        if (!artist.imageUrl) {
          // Render a gradient placeholder for artists without images
          return (
            <div
              key={artist.name}
              className="flex-1 h-full bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center"
              style={{ borderRight: i < artists.length - 1 ? "1px solid rgba(0,0,0,0.3)" : undefined }}
            >
              <span className="text-white/40 font-bold text-sm">
                {artist.name[0]?.toUpperCase()}
              </span>
            </div>
          );
        }
        return (
          <div
            key={artist.name}
            className="flex-1 h-full overflow-hidden relative"
            style={{ borderRight: i < artists.length - 1 ? "1px solid rgba(0,0,0,0.3)" : undefined }}
          >
            <img
              src={artist.imageUrl}
              alt={artist.name}
              className="w-full h-full object-cover object-top"
              // Scale up slightly so the face fills the narrow slice
              style={{ transform: "scale(1.2)" }}
            />
          </div>
        );
      })}
    </div>
  );
}
