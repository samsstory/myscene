import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Music2, MapPin, Calendar as CalendarIcon, Download, Link as LinkIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { PhotoOverlayEditor } from "./PhotoOverlayEditor";
import { calculateShowScore, getScoreGradient } from "@/lib/utils";

interface Artist {
  name: string;
  isHeadliner: boolean;
  is_headliner?: boolean;
}

interface Show {
  id: string;
  artists: Artist[];
  venue: { name: string; location: string };
  venue_name?: string;
  date: string;
  show_date?: string;
  rating: number;
  artistPerformance?: number | null;
  artist_performance?: number | null;
  sound?: number | null;
  lighting?: number | null;
  crowd?: number | null;
  venueVibe?: number | null;
  venue_vibe?: number | null;
  notes?: string | null;
  photo_url?: string | null;
}

interface ShareShowSheetProps {
  show: Show | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}


export const ShareShowSheet = ({ show, open, onOpenChange }: ShareShowSheetProps) => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [showOverlayEditor, setShowOverlayEditor] = useState(false);
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '4:5' | '1:1'>('9:16');

  if (!show) return null;

  const headliners = show.artists.filter(a => a.isHeadliner);
  const openers = show.artists.filter(a => !a.isHeadliner);
  const displayArtists = headliners.length > 0 ? headliners : show.artists;

  const handleCopyLink = () => {
    const score = calculateShowScore(show.rating, show.artistPerformance, show.sound, show.lighting, show.crowd, show.venueVibe);
    const shareText = `I saw ${displayArtists.map(a => a.name).join(", ")} at ${show.venue.name} on ${format(parseISO(show.date), "MMM d, yyyy")} - ${score.toFixed(1)}/10`;
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

      // Calculate score
      const score = calculateShowScore(
        show.rating,
        show.artistPerformance || show.artist_performance,
        show.sound,
        show.lighting,
        show.crowd,
        show.venueVibe || show.venue_vibe
      );

      // Dynamic color scheme based on score
      const getRatingColors = (score: number) => {
        if (score >= 9.0) return {
          start: 'hsl(222, 47%, 8%)', 
          middle: 'hsl(250, 50%, 15%)', 
          end: 'hsl(222, 47%, 6%)', 
          accent: 'hsl(45, 93%, 58%)', // Gold
          glow: 'rgba(255, 215, 0, 0.4)',
          barColors: ['hsl(45, 93%, 58%)', 'hsl(39, 100%, 50%)']
        };
        if (score >= 7.0) return { 
          start: 'hsl(222, 47%, 8%)', 
          middle: 'hsl(189, 60%, 20%)', 
          end: 'hsl(222, 47%, 6%)', 
          accent: 'hsl(189, 94%, 55%)', // Primary blue
          glow: 'rgba(96, 213, 242, 0.4)',
          barColors: ['hsl(189, 94%, 55%)', 'hsl(217, 91%, 60%)']
        };
        if (score >= 5.0) return { 
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

      const colors = getRatingColors(score);

      // Background gradient with dynamic colors
      const bgGradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
      bgGradient.addColorStop(0, colors.start);
      bgGradient.addColorStop(0.5, colors.middle);
      bgGradient.addColorStop(1, colors.end);
      ctx.fillStyle = bgGradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Add sparkles for high scores
      if (score >= 9.0) {
        ctx.font = '40px system-ui';
        ctx.fillStyle = colors.accent;
        const sparkles = [[120, 280], [930, 300], [90, 530], [960, 560], [150, 1600], [900, 1650]];
        sparkles.forEach(([x, y]) => ctx.fillText('✨', x, y));
      }

      let yPos = 160;

      // App branding
      ctx.fillStyle = colors.accent;
      ctx.font = 'bold 52px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Scene', canvas.width / 2, yPos);
      yPos += 200;

      // Large numerical score with glow
      ctx.shadowColor = colors.glow;
      ctx.shadowBlur = 80;
      ctx.fillStyle = colors.accent;
      ctx.font = 'bold 180px system-ui';
      ctx.fillText(score.toFixed(1), canvas.width / 2, yPos);
      ctx.shadowBlur = 0;
      yPos += 100;

      // "/10" label
      ctx.fillStyle = 'hsl(215, 20%, 75%)';
      ctx.font = 'bold 64px system-ui';
      ctx.fillText('/10', canvas.width / 2, yPos);
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

  // Normalize show data for PhotoOverlayEditor
  const normalizedShow = {
    ...show,
    artists: show.artists.map(a => ({
      ...a,
      is_headliner: a.isHeadliner ?? a.is_headliner ?? false,
    })),
    venue_name: show.venue?.name || show.venue_name || "",
    show_date: show.date || show.show_date || "",
    artist_performance: show.artistPerformance ?? show.artist_performance,
    venue_vibe: show.venueVibe ?? show.venue_vibe,
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[90vh] overflow-hidden flex flex-col">
        <SheetHeader className="flex-shrink-0">
          <SheetTitle>
            {showOverlayEditor && show.photo_url ? "Customize Share Image" : "Share Show"}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto mt-6">
          {showOverlayEditor && show.photo_url ? (
            <div className="flex flex-col gap-6">
              {/* Aspect Ratio Selection */}
              <div className="flex gap-2 justify-center">
                <Button
                  variant={aspectRatio === '9:16' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAspectRatio('9:16')}
                >
                  Story (9:16)
                </Button>
                <Button
                  variant={aspectRatio === '4:5' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAspectRatio('4:5')}
                >
                  Post (4:5)
                </Button>
                <Button
                  variant={aspectRatio === '1:1' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setAspectRatio('1:1')}
                >
                  Square (1:1)
                </Button>
              </div>

              <PhotoOverlayEditor 
                show={normalizedShow} 
                onClose={() => setShowOverlayEditor(false)}
                aspectRatio={aspectRatio}
              />
            </div>
          ) : (
            <>
              {/* Preview Card */}
              <div className="bg-gradient-to-b from-card to-background p-8 rounded-lg border border-border">
                <div className="space-y-6 text-center">
                  <div className={`text-6xl font-black bg-gradient-to-r ${getScoreGradient(calculateShowScore(show.rating, show.artistPerformance, show.sound, show.lighting, show.crowd, show.venueVibe))} bg-clip-text text-transparent`}>
                    {calculateShowScore(show.rating, show.artistPerformance, show.sound, show.lighting, show.crowd, show.venueVibe).toFixed(1)}/10
                  </div>
                  
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
              <div className="space-y-3 mt-6">
                {show.photo_url && (
                  <>
                    <Button
                      onClick={() => setShowOverlayEditor(true)}
                      className="w-full"
                      size="lg"
                    >
                      Edit & Share Photo
                    </Button>
                    <p className="text-xs text-center text-muted-foreground">
                      or share text-only version below
                    </p>
                  </>
                )}

                {!show.photo_url && (
                  <Button
                    onClick={handleDownloadImage}
                    variant="default"
                    className="w-full"
                    disabled={isGenerating}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    {isGenerating ? "Generating..." : "Download Share Image"}
                  </Button>
                )}

                <Button
                  onClick={handleCopyLink}
                  variant="outline"
                  className="w-full"
                >
                  <LinkIcon className="h-4 w-4 mr-2" />
                  Copy Share Text
                </Button>
              </div>
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};
