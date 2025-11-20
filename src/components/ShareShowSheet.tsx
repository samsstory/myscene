import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Music2, MapPin, Calendar as CalendarIcon, Download, Link as LinkIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";

interface Artist {
  name: string;
  isHeadliner: boolean;
}

interface Show {
  id: string;
  artists: Artist[];
  venue: { name: string; location: string };
  date: string;
  rating: number;
}

interface ShareShowSheetProps {
  show: Show | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const getRatingEmoji = (rating: number) => {
  const emojis = ["😞", "😕", "😐", "😊", "🤩"];
  return emojis[rating - 1] || "😐";
};

export const ShareShowSheet = ({ show, open, onOpenChange }: ShareShowSheetProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  if (!show) return null;

  const headliners = show.artists.filter(a => a.isHeadliner);
  const openers = show.artists.filter(a => !a.isHeadliner);
  const displayArtists = headliners.length > 0 ? headliners : show.artists;

  const handleCopyLink = () => {
    const shareText = `I saw ${displayArtists.map(a => a.name).join(", ")} at ${show.venue.name} on ${format(parseISO(show.date), "MMM d, yyyy")} ${getRatingEmoji(show.rating)}`;
    navigator.clipboard.writeText(shareText);
    toast({
      title: "Copied to clipboard!",
      description: "Share text copied successfully.",
    });
  };

  const handleDownloadImage = async () => {
    setIsGenerating(true);
    try {
      // Create a canvas to generate the share image
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');

      // Background gradient
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'hsl(222, 47%, 8%)');
      gradient.addColorStop(1, 'hsl(222, 47%, 6%)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Artist name
      ctx.fillStyle = 'hsl(210, 40%, 98%)';
      ctx.font = 'bold 72px system-ui';
      ctx.textAlign = 'center';
      const artistNames = displayArtists.map(a => a.name).join(", ");
      ctx.fillText(artistNames, canvas.width / 2, 960 - 200);

      // Venue
      ctx.fillStyle = 'hsl(215, 20%, 65%)';
      ctx.font = '48px system-ui';
      ctx.fillText(show.venue.name, canvas.width / 2, 960 - 100);

      // Date
      ctx.fillText(format(parseISO(show.date), "MMM d, yyyy"), canvas.width / 2, 960);

      // Rating emoji
      ctx.font = '200px system-ui';
      ctx.fillText(getRatingEmoji(show.rating), canvas.width / 2, 960 + 200);

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `show-${show.id}.png`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: "Image downloaded!",
          description: "Your show card has been saved.",
        });
      });
    } catch (error) {
      console.error('Error generating image:', error);
      toast({
        title: "Error",
        description: "Failed to generate image.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleShareToInstagram = () => {
    handleDownloadImage();
    toast({
      title: "Image ready!",
      description: "Open Instagram and upload the downloaded image to your story.",
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh]">
        <SheetHeader>
          <SheetTitle>Share Show</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Preview Card */}
          <div className="bg-gradient-to-b from-card to-background p-8 rounded-lg border border-border">
            <div className="space-y-6 text-center">
              <div className="text-6xl mb-4">{getRatingEmoji(show.rating)}</div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 text-muted-foreground text-sm">
                  <Music2 className="h-4 w-4" />
                  <span>Artist{displayArtists.length > 1 ? 's' : ''}</span>
                </div>
                <h3 className="text-2xl font-bold">
                  {displayArtists.map(a => a.name).join(", ")}
                </h3>
                {openers.length > 0 && (
                  <p className="text-sm text-muted-foreground">
                    with {openers.map(a => a.name).join(", ")}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-center gap-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span>{show.venue.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="h-4 w-4" />
                  <span>{format(parseISO(show.date), "MMM d, yyyy")}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Share Options */}
          <div className="space-y-3">
            <Button
              onClick={handleShareToInstagram}
              className="w-full bg-gradient-to-r from-[#f09433] via-[#e6683c] to-[#bc1888] hover:opacity-90 text-white"
              disabled={isGenerating}
            >
              {isGenerating ? "Generating..." : "Share to Instagram Story"}
            </Button>

            <Button
              onClick={handleDownloadImage}
              variant="outline"
              className="w-full"
              disabled={isGenerating}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Image
            </Button>

            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="w-full"
            >
              <LinkIcon className="h-4 w-4 mr-2" />
              Copy Share Text
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
