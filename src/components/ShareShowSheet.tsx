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

      // Dynamic color scheme based on rating
      const getRatingColors = (rating: number) => {
        if (rating >= 4.5) return { 
          start: 'hsl(222, 47%, 8%)', 
          middle: 'hsl(250, 50%, 15%)', 
          end: 'hsl(222, 47%, 6%)', 
          accent: 'hsl(45, 93%, 58%)', // Gold
          glow: 'rgba(255, 215, 0, 0.4)',
          barColors: ['hsl(45, 93%, 58%)', 'hsl(39, 100%, 50%)']
        };
        if (rating >= 3.5) return { 
          start: 'hsl(222, 47%, 8%)', 
          middle: 'hsl(189, 60%, 20%)', 
          end: 'hsl(222, 47%, 6%)', 
          accent: 'hsl(189, 94%, 55%)', // Primary blue
          glow: 'rgba(96, 213, 242, 0.4)',
          barColors: ['hsl(189, 94%, 55%)', 'hsl(217, 91%, 60%)']
        };
        if (rating >= 2.5) return { 
          start: 'hsl(222, 47%, 8%)', 
          middle: 'hsl(30, 50%, 20%)', 
          end: 'hsl(222, 47%, 6%)', 
          accent: 'hsl(17, 88%, 60%)', // Secondary orange
          glow: 'rgba(245, 158, 11, 0.4)',
          barColors: ['hsl(17, 88%, 60%)', 'hsl(25, 95%, 53%)']
        };
        return { 
          start: 'hsl(222, 47%, 8%)', 
          middle: 'hsl(0, 50%, 15%)', 
          end: 'hsl(222, 47%, 6%)', 
          accent: 'hsl(0, 84%, 60%)', // Destructive red
          glow: 'rgba(239, 68, 68, 0.4)',
          barColors: ['hsl(0, 84%, 60%)', 'hsl(0, 72%, 51%)']
        };
      };

      const colors = getRatingColors(show.rating);

      // Background gradient with dynamic colors
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, colors.start);
      bgGradient.addColorStop(0.5, colors.middle);
      bgGradient.addColorStop(1, colors.end);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add sparkles for high ratings
      if (show.rating >= 4.5) {
        ctx.font = '40px system-ui';
        ctx.fillStyle = colors.accent;
        const sparkles = [[120, 280], [930, 300], [90, 530], [960, 560], [150, 1600], [900, 1650]];
        sparkles.forEach(([x, y]) => ctx.fillText('✨', x, y));
      }

      let yPos = 180;

      // App branding
      ctx.fillStyle = colors.accent;
      ctx.font = 'bold 52px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Scene', canvas.width / 2, yPos);
      yPos += 120;

      // Large emoji with glow
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 60;
      ctx.font = '200px system-ui';
      ctx.fillText(getRatingEmoji(show.rating), canvas.width / 2, yPos);
      ctx.shadowBlur = 0;
      yPos += 100;

      // Bold rating score
      ctx.fillStyle = colors.accent;
      ctx.font = 'bold 80px system-ui';
      ctx.fillText(`${show.rating}/5 ⭐`, canvas.width / 2, yPos);
      yPos += 120;

      // Artist names with gradient
      const artistText = displayArtists.map(a => a.name).join(", ");
      const textGradient = ctx.createLinearGradient(0, yPos - 60, 0, yPos + 60);
      textGradient.addColorStop(0, 'hsl(210, 40%, 98%)');
      textGradient.addColorStop(1, colors.accent);
      ctx.fillStyle = textGradient;
      ctx.font = 'bold 64px system-ui';
      
      // Wrap artist names
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
      
      lines.forEach((textLine, i) => {
        ctx.fillText(textLine.trim(), canvas.width / 2, yPos + (i * 75));
      });
      yPos += lines.length * 75 + 40;

      // Venue
      ctx.fillStyle = 'hsl(215, 20%, 75%)';
      ctx.font = '42px system-ui';
      ctx.fillText(show.venue.name, canvas.width / 2, yPos);
      yPos += 60;

      // Date
      ctx.font = '36px system-ui';
      ctx.fillText(format(parseISO(show.date), "MMMM d, yyyy"), canvas.width / 2, yPos);
      yPos += 120;

      // Detailed ratings with progress bars
      const hasDetailedRatings = show.artistPerformance || show.sound || show.lighting || show.crowd || show.venueVibe;
      
      if (hasDetailedRatings) {
        const ratings = [
          { label: 'Artist Performance', emoji: '🎤', value: show.artistPerformance },
          { label: 'Sound', emoji: '🔊', value: show.sound },
          { label: 'Lighting', emoji: '💡', value: show.lighting },
          { label: 'Crowd', emoji: '👥', value: show.crowd },
          { label: 'Venue Vibe', emoji: '✨', value: show.venueVibe },
        ];

        ctx.textAlign = 'left';

        ratings.forEach(({ label, emoji, value }) => {
          if (value) {
            // Emoji
            ctx.font = '36px system-ui';
            ctx.fillStyle = 'hsl(210, 40%, 98%)';
            ctx.fillText(emoji, 100, yPos);
            
            // Label
            ctx.font = '32px system-ui';
            ctx.fillStyle = 'hsl(215, 20%, 75%)';
            ctx.fillText(label, 160, yPos);
            
            // Progress bar background
            const barX = 520;
            const barWidth = 400;
            const barHeight = 28;
            const barY = yPos - 22;
            const radius = 14;
            
            ctx.fillStyle = 'hsl(222, 47%, 12%)';
            ctx.beginPath();
            ctx.roundRect(barX, barY, barWidth, barHeight, radius);
            ctx.fill();
            
            // Progress bar fill with gradient
            const fillWidth = (value / 5) * barWidth;
            const barGradient = ctx.createLinearGradient(barX, 0, barX + barWidth, 0);
            barGradient.addColorStop(0, colors.barColors[0]);
            barGradient.addColorStop(1, colors.barColors[1]);
            
            ctx.fillStyle = barGradient;
            ctx.beginPath();
            ctx.roundRect(barX, barY, fillWidth, barHeight, radius);
            ctx.fill();
            
            // Rating score
            ctx.font = 'bold 32px system-ui';
            ctx.fillStyle = 'hsl(210, 40%, 98%)';
            ctx.textAlign = 'right';
            ctx.fillText(`${value}/5`, 980, yPos);
            
            ctx.textAlign = 'left';
            yPos += 70;
          }
        });
        
        yPos += 40;
      }

      // "My Take" section with styled card
      if (show.notes && show.notes.trim()) {
        const cardX = 80;
        const cardWidth = canvas.width - 160;
        const cardPadding = 50;
        
        // Measure text for card height
        ctx.font = '34px system-ui';
        const notesWords = show.notes.split(' ');
        let notesLine = '';
        let lineCount = 0;
        
        for (const word of notesWords) {
          const testLine = notesLine + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > cardWidth - (cardPadding * 2) && notesLine !== '') {
            lineCount++;
            notesLine = word + ' ';
          } else {
            notesLine = testLine;
          }
        }
        if (notesLine) lineCount++;
        
        const cardHeight = (lineCount * 50) + (cardPadding * 2) + 80;
        
        // Card background with border
        ctx.fillStyle = 'rgba(255, 255, 255, 0.03)';
        ctx.strokeStyle = colors.accent;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.roundRect(cardX, yPos - 20, cardWidth, cardHeight, 24);
        ctx.fill();
        ctx.stroke();
        
        // Header with quotation mark
        ctx.fillStyle = colors.accent;
        ctx.font = 'bold 40px system-ui';
        ctx.textAlign = 'left';
        ctx.fillText('"My Take"', cardX + cardPadding, yPos + 30);
        yPos += 90;
        
        // Notes text
        ctx.fillStyle = 'hsl(215, 20%, 85%)';
        ctx.font = '34px system-ui';
        
        notesLine = '';
        const noteX = cardX + cardPadding;
        
        for (const word of notesWords) {
          const testLine = notesLine + word + ' ';
          const metrics = ctx.measureText(testLine);
          if (metrics.width > cardWidth - (cardPadding * 2) && notesLine !== '') {
            ctx.fillText(notesLine.trim(), noteX, yPos);
            yPos += 50;
            notesLine = word + ' ';
          } else {
            notesLine = testLine;
          }
        }
        if (notesLine) {
          ctx.fillText(notesLine.trim(), noteX, yPos);
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
    toast({
      title: "Coming soon.. 🤫",
      description: "Direct Instagram Story sharing is in development. Use 'Download Image' for now!",
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
