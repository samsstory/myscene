import { Camera, Upload, Pencil, MapPin, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SceneLogo from "@/components/ui/SceneLogo";
import ConfirmationRing from "@/components/ui/ConfirmationRing";
import { cn } from "@/lib/utils";
import { formatShowDate } from "@/lib/utils";


import type { BaseArtist as Artist } from "@/types/show";

interface HeroPhotoSectionProps {
  photoUrl: string | null;
  uploading: boolean;
  artists: Artist[];
  venue: {
    name: string;
    location: string;
  };
  date: string;
  datePrecision?: string | null;
  rankPosition: number;
  rankTotal: number;
  comparisonsCount?: number;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  onEditShow?: () => void;
  onRankThisShow?: () => void;
}

// Calculate per-show confirmation percentage
const calculateShowConfirmation = (comparisons: number): number => {
  const MAX_BACK_TO_BACKS = 10;
  return Math.min(comparisons, MAX_BACK_TO_BACKS) / MAX_BACK_TO_BACKS * 100;
};

export const HeroPhotoSection = ({
  photoUrl,
  uploading,
  artists,
  venue,
  date,
  datePrecision,
  rankPosition,
  rankTotal,
  comparisonsCount = 0,
  onPhotoUpload,
  fileInputRef,
  onEditShow,
  onRankThisShow
}: HeroPhotoSectionProps) => {
  const headliner = artists.find((a) => a.isHeadliner) || artists[0];
  const supportingArtists = artists.filter((a) => !a.isHeadliner && a.name !== headliner?.name);
  const formattedDate = formatShowDate(date, datePrecision);
  const showConfirmation = calculateShowConfirmation(comparisonsCount);
  const needsMoreRanking = comparisonsCount < 3 && rankTotal > 1;

  const openInMaps = () => {
    const query = encodeURIComponent(`${venue.name}, ${venue.location}`);
    window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
  };

  // Shared metadata bar content
  const MetadataBar = () =>
  <div className="bg-white/[0.05] backdrop-blur-md rounded-xl border border-white/[0.1] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <h2 className="font-black text-xl text-white tracking-wide truncate" style={{
          textShadow: "0 0 12px rgba(255,255,255,0.4)"
        }}>
            {headliner?.name}
          </h2>
          {supportingArtists.length > 0 &&
        <p className="text-white/50 text-xs mt-0.5 truncate">
              + {supportingArtists.map((a) => a.name).join(', ')}
            </p>
        }
          <div className="flex items-center gap-1 text-white/60 text-sm mt-1">
            <button onClick={openInMaps} className="flex items-center gap-1 hover:text-white/80 transition-colors truncate">
              <MapPin className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{venue.name}</span>
            </button>
          </div>
          <p className="text-white/50 text-xs mt-0.5">{formattedDate}</p>
        </div>
        {/* Rank & Confirmation Column */}
        <div className="gap-2 flex-shrink-0 flex-col flex items-end justify-center py-[12px]">
          {/* Rank Badge - Prominent with glow */}
          <span className="text-sm font-bold text-primary tracking-wide" style={{
          textShadow: "0 0 8px hsl(var(--primary)), 0 0 16px hsl(var(--primary) / 0.5)"
        }}>
            {rankPosition > 0 ? `#${rankPosition} All Time` : "Unranked"}
          </span>
          {/* Per-show confirmation ring OR rank button */}
          {rankTotal > 1 && (
        needsMoreRanking && onRankThisShow ?
        <button
          onClick={onRankThisShow}
          className="px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 
                           text-amber-400/80 text-[10px] font-medium hover:bg-amber-500/20 transition-colors
                           flex items-center gap-0.5">

                <Scale className="h-2.5 w-2.5" />
                Rank
              </button> :

        <div className="flex items-center gap-1.5">
                <ConfirmationRing
            percentage={showConfirmation}
            size="sm"
            showLabel={false} />

                


              </div>)

        }
        </div>
      </div>
    </div>;


  if (photoUrl) {
    return (
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
        {/* Photo */}
        <img src={photoUrl} alt="Show photo" className="w-full h-full object-cover" />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top Left: Edit Show Button */}
        <button onClick={onEditShow} className="absolute top-3 left-3 h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
          <Pencil className="h-4 w-4 text-white/80" />
        </button>

        {/* Top Right: Scene Logo */}
        <div className="absolute top-3 right-3 px-2.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
          <SceneLogo size="sm" />
        </div>

        {/* Bottom: Glass Metadata Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <MetadataBar />
        </div>

        {/* Hidden file input */}
        <Input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={onPhotoUpload} />
      </div>);

  }

  // No Photo State - updated to match photo version
  return (
    <div className={cn(
      "relative aspect-[4/3] rounded-xl overflow-hidden",
      "bg-gradient-to-br from-primary/20 via-background to-primary-glow/10",
      "border border-white/10"
    )}>
      {/* Animated glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />

      {/* Top Left: Edit Show Button */}
      <button onClick={onEditShow} className="absolute top-3 left-3 z-10 h-8 w-8 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors">
        <Pencil className="h-4 w-4 text-white/80" />
      </button>

      {/* Top Right: Scene Logo */}
      <div className="absolute top-3 right-3 z-10 px-2.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10 flex items-center justify-center">
        <SceneLogo size="sm" />
      </div>

      {/* Center: Upload Prompt */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div className="p-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 py-[14px] my-0" style={{
          animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
          boxShadow: "0 0 20px rgba(255,255,255,0.1)"
        }}>
          <Camera className="h-8 w-8 text-white/60" />
        </div>
        <Button variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Add Photo"}
        </Button>
      </div>

      {/* Bottom: Glass Metadata Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <MetadataBar />
      </div>

      {/* Hidden file input */}
      <Input ref={fileInputRef} type="file" accept=".jpg,.jpeg,.png,.webp" className="hidden" onChange={onPhotoUpload} />
    </div>);

};

export default HeroPhotoSection;