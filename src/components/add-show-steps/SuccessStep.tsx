import { useState } from "react";
import { CheckCircle2, Camera, Instagram, Trophy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { toast } from "sonner";

interface AddedShowData {
  id: string;
  artists: Array<{ name: string; isHeadliner: boolean }>;
  venue: { name: string; location: string };
  date: string;
  rating: number | null;
}

interface SuccessStepProps {
  show: AddedShowData;
  onAddPhoto: (file: File) => Promise<void>;
  onShare: () => void;
  onRank: () => void;
  onDone: () => void;
}

const SuccessStep = ({ show, onAddPhoto, onShare, onRank, onDone }: SuccessStepProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [photoAdded, setPhotoAdded] = useState(false);

  const headliner = show.artists.find(a => a.isHeadliner)?.name || show.artists[0]?.name || "Show";
  const formattedDate = format(new Date(show.date), "MMM d, yyyy");

  const handlePhotoClick = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        setIsUploading(true);
        try {
          await onAddPhoto(file);
          setPhotoAdded(true);
          toast.success("Photo added!");
        } catch (error) {
          console.error("Error uploading photo:", error);
          toast.error("Failed to upload photo");
        } finally {
          setIsUploading(false);
        }
      }
    };
    input.click();
  };

  return (
    <div className="text-center space-y-6 py-4">
      {/* Success icon */}
      <div className="relative inline-block">
        <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
          <CheckCircle2 className="h-10 w-10 text-primary" />
        </div>
      </div>

      {/* Message */}
      <div className="space-y-2">
        <h2 className="text-2xl font-bold">Show Added!</h2>
        <p className="text-muted-foreground text-sm">
          {headliner} @ {show.venue.name}
        </p>
        <p className="text-muted-foreground text-xs">{formattedDate}</p>
      </div>

      {/* Action cards */}
      <div className="space-y-3 pt-2">
        <Card 
          className={`cursor-pointer transition-all hover:border-primary ${photoAdded ? 'border-primary bg-primary/5' : ''}`}
          onClick={!isUploading && !photoAdded ? handlePhotoClick : undefined}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              {isUploading ? (
                <Loader2 className="h-5 w-5 text-primary animate-spin" />
              ) : (
                <Camera className="h-5 w-5 text-primary" />
              )}
            </div>
            <div className="text-left flex-1">
              <div className="font-medium">
                {photoAdded ? "Photo Added!" : "Add a Photo"}
              </div>
              <div className="text-sm text-muted-foreground">
                {photoAdded ? "Looking good 📸" : "Capture the memory"}
              </div>
            </div>
            {photoAdded && <CheckCircle2 className="h-5 w-5 text-primary" />}
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:border-primary"
          onClick={onShare}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Instagram className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">Share to Instagram</div>
              <div className="text-sm text-muted-foreground">Create a story or post</div>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer transition-all hover:border-primary"
          onClick={onRank}
        >
          <CardContent className="flex items-center gap-3 p-4">
            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Trophy className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left">
              <div className="font-medium">Rank It</div>
              <div className="text-sm text-muted-foreground">Compare against other shows</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Done button */}
      <Button onClick={onDone} variant="outline" className="w-full mt-4">
        Done
      </Button>
    </div>
  );
};

export default SuccessStep;
