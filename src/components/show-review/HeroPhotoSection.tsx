import { useRef } from "react";
import { Camera, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SceneLogo from "@/components/ui/SceneLogo";
import { ShowRankBadge } from "@/components/feed/ShowRankBadge";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { getScoreGradient } from "@/lib/utils";

interface Artist {
  name: string;
  isHeadliner: boolean;
}

interface HeroPhotoSectionProps {
  photoUrl: string | null;
  uploading: boolean;
  score: number;
  artists: Artist[];
  venue: { name: string; location: string };
  date: string;
  rankPosition: number;
  rankTotal: number;
  comparisonsCount?: number;
  onPhotoUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

export const HeroPhotoSection = ({
  photoUrl,
  uploading,
  score,
  artists,
  venue,
  date,
  rankPosition,
  rankTotal,
  comparisonsCount = 0,
  onPhotoUpload,
  fileInputRef,
}: HeroPhotoSectionProps) => {
  const headliner = artists.find(a => a.isHeadliner) || artists[0];
  const formattedDate = format(parseISO(date), "MMM d, yyyy");

  if (photoUrl) {
    return (
      <div className="relative aspect-[4/3] rounded-xl overflow-hidden">
        {/* Photo */}
        <img
          src={photoUrl}
          alt="Show photo"
          className="w-full h-full object-cover"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />

        {/* Top Left: Rank Badge */}
        <div className="absolute top-3 left-3 px-2.5 py-1.5 rounded-full bg-white/10 backdrop-blur-sm border border-white/10">
          <ShowRankBadge 
            position={rankPosition} 
            total={rankTotal} 
            comparisonsCount={comparisonsCount}
          />
        </div>

        {/* Top Right: Score Badge */}
        <div 
          className={cn(
            "absolute top-3 right-3 px-3 py-1.5 rounded-full",
            "bg-gradient-to-r backdrop-blur-sm border border-white/20",
            getScoreGradient(score)
          )}
        >
          <span 
            className="text-sm font-black text-white tracking-wide"
            style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
          >
            {score.toFixed(1)}
          </span>
        </div>

        {/* Bottom: Glass Metadata Bar */}
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <div className="bg-white/[0.05] backdrop-blur-md rounded-xl border border-white/[0.1] p-4">
            <h2 
              className="font-black text-xl text-white tracking-wide truncate"
              style={{ textShadow: "0 0 12px rgba(255,255,255,0.4)" }}
            >
              {headliner?.name}
            </h2>
            <p className="text-white/60 text-sm mt-1 truncate">
              {venue.name} · {formattedDate}
            </p>
          </div>
        </div>

        {/* Watermark */}
        <div className="absolute bottom-20 right-4">
          <SceneLogo size="sm" />
        </div>

        {/* Hidden file input */}
        <Input
          ref={fileInputRef}
          type="file"
          accept=".jpg,.jpeg,.png,.webp"
          className="hidden"
          onChange={onPhotoUpload}
        />
      </div>
    );
  }

  // No Photo State
  return (
    <div 
      className={cn(
        "relative aspect-[4/3] rounded-xl overflow-hidden",
        "bg-gradient-to-br from-primary/20 via-background to-primary-glow/10",
        "border border-white/10"
      )}
    >
      {/* Animated glow effect */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
      
      {/* Score Badge (top right even without photo) */}
      <div 
        className={cn(
          "absolute top-3 right-3 px-3 py-1.5 rounded-full",
          "bg-gradient-to-r backdrop-blur-sm border border-white/20",
          getScoreGradient(score)
        )}
      >
        <span 
          className="text-sm font-black text-white tracking-wide"
          style={{ textShadow: "0 0 10px rgba(255,255,255,0.5)" }}
        >
          {score.toFixed(1)}
        </span>
      </div>

      {/* Center: Upload Prompt */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
        <div 
          className="p-4 rounded-full bg-white/10 backdrop-blur-sm border border-white/20"
          style={{ 
            animation: "pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite",
            boxShadow: "0 0 20px rgba(255,255,255,0.1)"
          }}
        >
          <Camera className="h-8 w-8 text-white/60" />
        </div>
        <Button
          variant="outline"
          className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
        >
          <Upload className="h-4 w-4 mr-2" />
          {uploading ? "Uploading..." : "Add Photo"}
        </Button>
      </div>

      {/* Bottom: Glass Metadata Bar */}
      <div className="absolute bottom-0 left-0 right-0 p-4">
        <div className="bg-white/[0.05] backdrop-blur-md rounded-xl border border-white/[0.1] p-4">
          <h2 
            className="font-black text-xl text-white tracking-wide truncate"
            style={{ textShadow: "0 0 12px rgba(255,255,255,0.4)" }}
          >
            {headliner?.name}
          </h2>
          <p className="text-white/60 text-sm mt-1 truncate">
            {venue.name} · {formattedDate}
          </p>
        </div>
      </div>

      {/* Hidden file input */}
      <Input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.webp"
        className="hidden"
        onChange={onPhotoUpload}
      />
    </div>
  );
};

export default HeroPhotoSection;
