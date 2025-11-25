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
  artistPerformance?: number | null;
  sound?: number | null;
  lighting?: number | null;
  crowd?: number | null;
  venueVibe?: number | null;
  notes?: string | null;
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
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) throw new Error('Could not get canvas context');

      // Background gradient (dark theme)
      const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      gradient.addColorStop(0, 'hsl(222, 47%, 8%)');
      gradient.addColorStop(0.5, 'hsl(222, 47%, 6%)');
      gradient.addColorStop(1, 'hsl(222, 47%, 8%)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      let yPos = 180;

      // App branding at top
      ctx.fillStyle = 'hsl(210, 40%, 98%)';
      ctx.font = 'bold 48px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Scene', canvas.width / 2, yPos);
      yPos += 100;

      // Rating emoji (large)
      ctx.font = '280px system-ui';
      ctx.fillText(getRatingEmoji(show.rating), canvas.width / 2, yPos + 200);
      yPos += 320;

      // Artist names
      ctx.fillStyle = 'hsl(210, 40%, 98%)';
      ctx.font = 'bold 68px system-ui';
      const artistText = displayArtists.map(a => a.name).join(", ");
      
      // Wrap long artist names
      const maxWidth = 950;
      const words = artistText.split(' ');
      let line = '';
      const lines: string[] = [];
      
      for (const word of words) {
        const testLine = line + word + ' ';
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== '') {
          lines.push(line);
          line = word + ' ';
        } else {
          line = testLine;
        }
      }
      lines.push(line);
      
      lines.forEach((line, i) => {
        ctx.fillText(line.trim(), canvas.width / 2, yPos + (i * 80));
      });
      yPos += lines.length * 80 + 40;

      // Venue
      ctx.fillStyle = 'hsl(215, 20%, 65%)';
      ctx.font = '44px system-ui';
      ctx.fillText(show.venue.name, canvas.width / 2, yPos);
      yPos += 60;

      // Date
      ctx.font = '38px system-ui';
      ctx.fillText(format(parseISO(show.date), "MMMM d, yyyy"), canvas.width / 2, yPos);
      yPos += 100;

      // Detailed ratings (if available)
      const hasDetailedRatings = show.artistPerformance || show.sound || show.lighting || show.crowd || show.venueVibe;
      
      if (hasDetailedRatings) {
        ctx.font = 'bold 36px system-ui';
        ctx.fillStyle = 'hsl(210, 40%, 98%)';
        ctx.fillText('The Details', canvas.width / 2, yPos);
        yPos += 60;

        const ratingLabels = [
          { label: 'Artist Performance', value: show.artistPerformance },
          { label: 'Sound', value: show.sound },
          { label: 'Lighting', value: show.lighting },
          { label: 'Crowd', value: show.crowd },
          { label: 'Venue Vibe', value: show.venueVibe },
        ];

        ctx.font = '32px system-ui';
        ctx.textAlign = 'left';
        
        ratingLabels.forEach(({ label, value }) => {
          if (value) {
            ctx.fillStyle = 'hsl(215, 20%, 65%)';
            ctx.fillText(label, 140, yPos);
            
            // Rating dots
            const dotStartX = 680;
            for (let i = 0; i < 5; i++) {
              ctx.fillStyle = i < value ? 'hsl(221, 83%, 53%)' : 'hsl(215, 20%, 35%)';
              ctx.beginPath();
              ctx.arc(dotStartX + (i * 50), yPos - 10, 12, 0, Math.PI * 2);
              ctx.fill();
            }
            
            yPos += 50;
          }
        });
        
        yPos += 30;
      }

      // Notes (if available)
      if (show.notes && show.notes.trim()) {
        ctx.textAlign = 'center';
        ctx.font = 'bold 36px system-ui';
        ctx.fillStyle = 'hsl(210, 40%, 98%)';
        ctx.fillText('My Take', canvas.width / 2, yPos);
        yPos += 60;

        ctx.font = '32px system-ui';
        ctx.fillStyle = 'hsl(215, 20%, 75%)';
        
        // Wrap notes text
        const notesWords = show.notes.split(' ');
        let notesLine = '';
        const notesMaxWidth = 900;
        
        notesWords.forEach(word => {
          const testLine = notesLine + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > notesMaxWidth && notesLine !== '') {
            ctx.fillText(notesLine.trim(), canvas.width / 2, yPos);
            yPos += 45;
            notesLine = word + ' ';
          } else {
            notesLine = testLine;
          }
        });
        if (notesLine) {
          ctx.fillText(notesLine.trim(), canvas.width / 2, yPos);
        }
      }

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) return;
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `scene-${artistText.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${format(parseISO(show.date), "yyyy-MM-dd")}.png`;
        a.click();
        URL.revokeObjectURL(url);
        
        toast({
          title: "Image downloaded!",
          description: "Your show recap has been saved.",
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
