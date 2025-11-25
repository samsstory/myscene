import { useState } from "react";
import Draggable from "react-draggable";
import { Resizable } from "re-resizable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Download } from "lucide-react";
import { toast } from "sonner";

interface Artist {
  name: string;
  is_headliner: boolean;
}

interface Show {
  id: string;
  artists: Artist[];
  venue_name: string;
  show_date: string;
  rating: number;
  artist_performance?: number;
  sound?: number;
  lighting?: number;
  crowd?: number;
  venue_vibe?: number;
  notes?: string;
  photo_url?: string;
}

interface PhotoOverlayEditorProps {
  show: Show;
  onClose: () => void;
}

const getRatingEmoji = (rating: number): string => {
  const emojiMap: { [key: number]: string } = {
    1: "😴",
    2: "😐",
    3: "🙂",
    4: "😊",
    5: "🤩",
  };
  return emojiMap[rating] || "🙂";
};

const getRatingGradient = (rating: number): string => {
  if (rating >= 4.5) return "linear-gradient(135deg, hsl(220, 90%, 56%), hsl(280, 70%, 55%))";
  if (rating >= 3.5) return "linear-gradient(135deg, hsl(45, 100%, 60%), hsl(330, 85%, 65%))";
  if (rating >= 2.5) return "linear-gradient(135deg, hsl(30, 100%, 55%), hsl(45, 100%, 60%))";
  return "linear-gradient(135deg, hsl(0, 70%, 50%), hsl(30, 100%, 55%))";
};

export const PhotoOverlayEditor = ({ show, onClose }: PhotoOverlayEditorProps) => {
  const [overlayConfig, setOverlayConfig] = useState({
    showArtists: true,
    showVenue: true,
    showDate: true,
    showRating: true,
    showDetailedRatings: true,
    showNotes: true,
  });

  const [overlaySize, setOverlaySize] = useState<number>(1); // 0.6, 1, 1.4
  const [overlayOpacity, setOverlayOpacity] = useState<number>(90);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSizeChange = (value: number[]) => {
    const sizeMap = [0.6, 1, 1.4];
    setOverlaySize(sizeMap[value[0]]);
  };

  const handleDownloadImage = async () => {
    if (!show.photo_url) {
      toast.error("No photo available");
      return;
    }

    setIsGenerating(true);
    try {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Canvas not supported");

      // Instagram Story dimensions
      canvas.width = 1080;
      canvas.height = 1920;

      // Load background photo
      const img = new Image();
      img.crossOrigin = "anonymous";
      
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = show.photo_url!;
      });

      // Draw photo (cover fit)
      const imgAspect = img.width / img.height;
      const canvasAspect = canvas.width / canvas.height;
      
      let drawWidth, drawHeight, offsetX, offsetY;
      if (imgAspect > canvasAspect) {
        drawHeight = canvas.height;
        drawWidth = img.width * (canvas.height / img.height);
        offsetX = (canvas.width - drawWidth) / 2;
        offsetY = 0;
      } else {
        drawWidth = canvas.width;
        drawHeight = img.height * (canvas.width / img.width);
        offsetX = 0;
        offsetY = (canvas.height - drawHeight) / 2;
      }

      ctx.drawImage(img, offsetX, offsetY, drawWidth, drawHeight);

      // Get overlay element and its position
      const overlayElement = document.getElementById("rating-overlay");
      if (!overlayElement) throw new Error("Overlay element not found");

      const overlayRect = overlayElement.getBoundingClientRect();
      const canvasContainer = document.getElementById("canvas-container");
      if (!canvasContainer) throw new Error("Canvas container not found");
      
      const containerRect = canvasContainer.getBoundingClientRect();

      // Calculate overlay position and size relative to canvas
      const scaleX = canvas.width / containerRect.width;
      const scaleY = canvas.height / containerRect.height;

      const overlayX = (overlayRect.left - containerRect.left) * scaleX;
      const overlayY = (overlayRect.top - containerRect.top) * scaleY;
      const overlayWidth = overlayRect.width * scaleX;
      const overlayHeight = overlayRect.height * scaleY;

      // Draw overlay background
      const gradient = ctx.createLinearGradient(overlayX, overlayY, overlayX + overlayWidth, overlayY + overlayHeight);
      const ratingValue = show.rating;
      
      if (ratingValue >= 4.5) {
        gradient.addColorStop(0, "hsl(220, 90%, 56%)");
        gradient.addColorStop(1, "hsl(280, 70%, 55%)");
      } else if (ratingValue >= 3.5) {
        gradient.addColorStop(0, "hsl(45, 100%, 60%)");
        gradient.addColorStop(1, "hsl(330, 85%, 65%)");
      } else if (ratingValue >= 2.5) {
        gradient.addColorStop(0, "hsl(30, 100%, 55%)");
        gradient.addColorStop(1, "hsl(45, 100%, 60%)");
      } else {
        gradient.addColorStop(0, "hsl(0, 70%, 50%)");
        gradient.addColorStop(1, "hsl(30, 100%, 55%)");
      }

      ctx.globalAlpha = overlayOpacity / 100;
      ctx.fillStyle = gradient;
      ctx.roundRect(overlayX, overlayY, overlayWidth, overlayHeight, 24);
      ctx.fill();
      ctx.globalAlpha = 1;

      // Draw overlay text content
      const padding = 32 * scaleX;
      let yPos = overlayY + padding;
      const lineHeight = 40 * scaleY;

      ctx.fillStyle = "white";
      ctx.textAlign = "left";

      // Artist names
      if (overlayConfig.showArtists) {
        const headliners = show.artists.filter(a => a.is_headliner);
        const artistText = headliners.map(a => a.name).join(", ");
        ctx.font = `bold ${48 * overlaySize * scaleX}px system-ui`;
        ctx.fillText(artistText, overlayX + padding, yPos);
        yPos += lineHeight * 1.5;
      }

      // Venue
      if (overlayConfig.showVenue) {
        ctx.font = `${32 * overlaySize * scaleX}px system-ui`;
        ctx.fillText(show.venue_name, overlayX + padding, yPos);
        yPos += lineHeight;
      }

      // Date
      if (overlayConfig.showDate) {
        ctx.font = `${28 * overlaySize * scaleX}px system-ui`;
        const dateStr = new Date(show.show_date).toLocaleDateString("en-US", {
          month: "long",
          day: "numeric",
          year: "numeric",
        });
        ctx.fillText(dateStr, overlayX + padding, yPos);
        yPos += lineHeight * 1.5;
      }

      // Overall rating
      if (overlayConfig.showRating) {
        const emoji = getRatingEmoji(show.rating);
        ctx.font = `${64 * overlaySize * scaleX}px system-ui`;
        ctx.fillText(`${emoji} ${show.rating}/5`, overlayX + padding, yPos);
        yPos += lineHeight * 2;
      }

      // Detailed ratings
      if (overlayConfig.showDetailedRatings && (show.artist_performance || show.sound || show.lighting || show.crowd || show.venue_vibe)) {
        const detailedRatings = [
          { label: "🎤 Performance", value: show.artist_performance },
          { label: "🔊 Sound", value: show.sound },
          { label: "💡 Lighting", value: show.lighting },
          { label: "👥 Crowd", value: show.crowd },
          { label: "✨ Vibe", value: show.venue_vibe },
        ].filter(r => r.value !== undefined && r.value !== null);

        ctx.font = `${24 * overlaySize * scaleX}px system-ui`;
        detailedRatings.forEach(rating => {
          ctx.fillText(`${rating.label} ${"█".repeat(rating.value!)}`, overlayX + padding, yPos);
          yPos += lineHeight * 0.8;
        });
        yPos += lineHeight * 0.5;
      }

      // Notes
      if (overlayConfig.showNotes && show.notes) {
        ctx.font = `italic ${26 * overlaySize * scaleX}px system-ui`;
        const maxWidth = overlayWidth - (padding * 2);
        const words = show.notes.split(" ");
        let line = "";

        words.forEach(word => {
          const testLine = line + word + " ";
          const metrics = ctx.measureText(testLine);
          if (metrics.width > maxWidth) {
            ctx.fillText(line, overlayX + padding, yPos);
            line = word + " ";
            yPos += lineHeight * 0.9;
          } else {
            line = testLine;
          }
        });
        ctx.fillText(line, overlayX + padding, yPos);
      }

      // Download
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${show.artists[0]?.name || "show"}-review.png`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success("Image downloaded!");
      }, "image/png");

    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
    } finally {
      setIsGenerating(false);
    }
  };

  if (!show.photo_url) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">No photo available for this show</p>
      </div>
    );
  }

  const headliners = show.artists.filter(a => a.is_headliner);

  return (
    <div className="flex flex-col lg:flex-row h-full gap-6">
      {/* Canvas Preview */}
      <div className="flex-1 flex items-center justify-center bg-muted/20 rounded-lg overflow-hidden relative">
        <div
          id="canvas-container"
          className="relative bg-black"
          style={{
            width: "100%",
            maxWidth: "540px",
            aspectRatio: "9/16",
          }}
        >
          {/* Background Photo */}
          <img
            src={show.photo_url}
            alt="Show"
            className="absolute inset-0 w-full h-full object-cover"
          />

          {/* Draggable Overlay */}
          <Draggable bounds="parent" defaultPosition={{ x: 40, y: 100 }}>
            <div style={{ position: "absolute", cursor: "move" }}>
              <Resizable
                defaultSize={{ width: 400, height: 300 }}
                minWidth={200}
                minHeight={150}
                maxWidth={500}
                maxHeight={600}
                enable={{
                  top: false,
                  right: true,
                  bottom: true,
                  left: false,
                  topRight: false,
                  bottomRight: true,
                  bottomLeft: false,
                  topLeft: false,
                }}
              >
                <div
                  id="rating-overlay"
                  className="h-full w-full rounded-3xl p-6 text-white shadow-2xl"
                  style={{
                    background: getRatingGradient(show.rating),
                    opacity: overlayOpacity / 100,
                    transform: `scale(${overlaySize})`,
                    transformOrigin: "top left",
                  }}
                >
                  {overlayConfig.showArtists && (
                    <h2 className="text-2xl font-bold mb-2">
                      {headliners.map(a => a.name).join(", ")}
                    </h2>
                  )}
                  
                  {overlayConfig.showVenue && (
                    <p className="text-lg mb-1">{show.venue_name}</p>
                  )}
                  
                  {overlayConfig.showDate && (
                    <p className="text-sm opacity-90 mb-3">
                      {new Date(show.show_date).toLocaleDateString("en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                  )}

                  {overlayConfig.showRating && (
                    <div className="text-4xl font-bold mb-3">
                      {getRatingEmoji(show.rating)} {show.rating}/5
                    </div>
                  )}

                  {overlayConfig.showDetailedRatings && (show.artist_performance || show.sound || show.lighting || show.crowd || show.venue_vibe) && (
                    <div className="space-y-2 text-xs mb-3">
                      {show.artist_performance && (
                        <div className="flex items-center gap-2">
                          <span className="w-20">🎤 Performance</span>
                          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white rounded-full"
                              style={{ width: `${(show.artist_performance / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {show.sound && (
                        <div className="flex items-center gap-2">
                          <span className="w-20">🔊 Sound</span>
                          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white rounded-full"
                              style={{ width: `${(show.sound / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {show.lighting && (
                        <div className="flex items-center gap-2">
                          <span className="w-20">💡 Lighting</span>
                          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white rounded-full"
                              style={{ width: `${(show.lighting / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {show.crowd && (
                        <div className="flex items-center gap-2">
                          <span className="w-20">👥 Crowd</span>
                          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white rounded-full"
                              style={{ width: `${(show.crowd / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {show.venue_vibe && (
                        <div className="flex items-center gap-2">
                          <span className="w-20">✨ Vibe</span>
                          <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-white rounded-full"
                              style={{ width: `${(show.venue_vibe / 5) * 100}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {overlayConfig.showNotes && show.notes && (
                    <p className="text-sm italic opacity-90 line-clamp-3">
                      "{show.notes}"
                    </p>
                  )}
                </div>
              </Resizable>
            </div>
          </Draggable>
        </div>
      </div>

      {/* Controls Panel */}
      <div className="w-full lg:w-80 space-y-6 overflow-y-auto">
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Customize Overlay</h3>

          {/* Toggle Switches */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="show-artists">Artist Names</Label>
              <Switch
                id="show-artists"
                checked={overlayConfig.showArtists}
                onCheckedChange={(checked) => 
                  setOverlayConfig({ ...overlayConfig, showArtists: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-venue">Venue Name</Label>
              <Switch
                id="show-venue"
                checked={overlayConfig.showVenue}
                onCheckedChange={(checked) => 
                  setOverlayConfig({ ...overlayConfig, showVenue: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-date">Show Date</Label>
              <Switch
                id="show-date"
                checked={overlayConfig.showDate}
                onCheckedChange={(checked) => 
                  setOverlayConfig({ ...overlayConfig, showDate: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-rating">Overall Rating</Label>
              <Switch
                id="show-rating"
                checked={overlayConfig.showRating}
                onCheckedChange={(checked) => 
                  setOverlayConfig({ ...overlayConfig, showRating: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-detailed">Detailed Ratings</Label>
              <Switch
                id="show-detailed"
                checked={overlayConfig.showDetailedRatings}
                onCheckedChange={(checked) => 
                  setOverlayConfig({ ...overlayConfig, showDetailedRatings: checked })
                }
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="show-notes">My Take</Label>
              <Switch
                id="show-notes"
                checked={overlayConfig.showNotes}
                onCheckedChange={(checked) => 
                  setOverlayConfig({ ...overlayConfig, showNotes: checked })
                }
              />
            </div>
          </div>

          {/* Size Slider */}
          <div className="space-y-2">
            <Label>Overlay Size</Label>
            <Slider
              min={0}
              max={2}
              step={1}
              value={[overlaySize === 0.6 ? 0 : overlaySize === 1 ? 1 : 2]}
              onValueChange={handleSizeChange}
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Small</span>
              <span>Medium</span>
              <span>Large</span>
            </div>
          </div>

          {/* Opacity Slider */}
          <div className="space-y-2">
            <Label>Overlay Opacity</Label>
            <Slider
              min={80}
              max={100}
              step={5}
              value={[overlayOpacity]}
              onValueChange={(value) => setOverlayOpacity(value[0])}
            />
            <div className="text-xs text-muted-foreground text-right">
              {overlayOpacity}%
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-4 border-t">
          <Button
            onClick={handleDownloadImage}
            disabled={isGenerating}
            className="w-full"
          >
            <Download className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Download Image"}
          </Button>
          <Button variant="outline" onClick={onClose} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
};
