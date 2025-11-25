import { useState } from "react";
import Draggable from "react-draggable";
import { Resizable } from "re-resizable";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Download, MapPin } from "lucide-react";
import { toast } from "sonner";
import { calculateShowScore, getScoreGradient } from "@/lib/utils";

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

const getRatingGradient = (rating: number): string => {
  // Darker, more muted gradients that blend better with photos
  if (rating >= 4.5) return "linear-gradient(135deg, rgba(45, 55, 72, 0.85), rgba(26, 32, 44, 0.90))";
  if (rating >= 3.5) return "linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.90))";
  if (rating >= 2.5) return "linear-gradient(135deg, rgba(55, 48, 45, 0.85), rgba(28, 25, 23, 0.90))";
  return "linear-gradient(135deg, rgba(60, 35, 35, 0.85), rgba(30, 20, 20, 0.90))";
};

const getRatingAccent = (rating: number): string => {
  // Subtle accent colors for text highlights
  if (rating >= 4.5) return "hsl(45, 93%, 58%)"; // Gold
  if (rating >= 3.5) return "hsl(189, 94%, 55%)"; // Blue
  if (rating >= 2.5) return "hsl(17, 88%, 60%)"; // Orange
  return "hsl(0, 84%, 60%)"; // Red
};

export const PhotoOverlayEditor = ({ show, onClose }: PhotoOverlayEditorProps) => {
  const [overlayConfig, setOverlayConfig] = useState({
    showArtists: true,
    showVenue: true,
    showDate: true,
    showRating: true,
    showDetailedRatings: true,
    showNotes: true,
    showBackground: true,
  });

  const [overlaySize, setOverlaySize] = useState<number>(0.35); // 0.25, 0.35, 0.45
  const [overlayOpacity, setOverlayOpacity] = useState<number>(90);
  const [isGenerating, setIsGenerating] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string>("hsl(45, 93%, 58%)");

  // Extract primary color from image
  const extractPrimaryColor = (imageUrl: string) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Sample colors from the image (every 10th pixel for performance)
      const colorCounts: { [key: string]: number } = {};
      for (let i = 0; i < data.length; i += 40) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        
        // Skip transparent and very dark/light pixels
        if (a < 128 || (r + g + b) < 50 || (r + g + b) > 700) continue;
        
        // Round to nearest 32 for grouping similar colors
        const key = `${Math.round(r / 32) * 32},${Math.round(g / 32) * 32},${Math.round(b / 32) * 32}`;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
      }

      // Find most common color
      let maxCount = 0;
      let dominantColor = "255,255,255";
      for (const [color, count] of Object.entries(colorCounts)) {
        if (count > maxCount) {
          maxCount = count;
          dominantColor = color;
        }
      }

      const [r, g, b] = dominantColor.split(",").map(Number);
      
      // Convert RGB to HSL for better color matching
      const rNorm = r / 255;
      const gNorm = g / 255;
      const bNorm = b / 255;
      const max = Math.max(rNorm, gNorm, bNorm);
      const min = Math.min(rNorm, gNorm, bNorm);
      let h = 0, s = 0, l = (max + min) / 2;

      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rNorm: h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6; break;
          case gNorm: h = ((bNorm - rNorm) / d + 2) / 6; break;
          case bNorm: h = ((rNorm - gNorm) / d + 4) / 6; break;
        }
      }

      // Boost saturation and adjust lightness for better visibility
      s = Math.min(s * 1.3, 1);
      l = Math.max(0.55, Math.min(0.7, l));
      
      setPrimaryColor(`hsl(${Math.round(h * 360)}, ${Math.round(s * 100)}%, ${Math.round(l * 100)}%)`);
    };
    img.src = imageUrl;
  };

  // Extract color when component mounts or image changes
  useState(() => {
    if (show.photo_url) {
      extractPrimaryColor(show.photo_url);
    }
  });

  const handleSizeChange = (value: number[]) => {
    const sizeMap = [0.25, 0.35, 0.45];
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

      // Overall rating - numerical score
      if (overlayConfig.showRating) {
        const score = calculateShowScore(
          show.rating,
          show.artist_performance,
          show.sound,
          show.lighting,
          show.crowd,
          show.venue_vibe
        );
        ctx.font = `bold ${64 * overlaySize * scaleX}px system-ui`;
        ctx.fillText(`${score.toFixed(1)}/10`, overlayX + padding, yPos);
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
          className="relative bg-black overflow-visible"
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
          <Draggable 
            bounds={{
              left: -200,
              top: -200,
              right: 540,
              bottom: 960
            }}
            defaultPosition={{ x: 40, y: 100 }}
          >
            <div style={{ position: "absolute", cursor: "move", zIndex: 10 }}>
              <Resizable
                defaultSize={{ width: 400, height: "auto" }}
                minWidth={200}
                maxWidth={500}
                enable={{
                  top: false,
                  right: true,
                  bottom: false,
                  left: false,
                  topRight: false,
                  bottomRight: false,
                  bottomLeft: false,
                  topLeft: false,
                }}
              >
                <div
                  id="rating-overlay"
                  className="rounded-3xl p-6 text-white shadow-2xl backdrop-blur-sm border border-white/10 relative"
                  style={{
                    background: overlayConfig.showBackground ? getRatingGradient(show.rating) : "transparent",
                    opacity: overlayOpacity / 100,
                    transform: `scale(${overlaySize})`,
                    transformOrigin: "top left",
                  }}
                >
                  {/* Artist name and rating on same row */}
                  <div className="flex items-start justify-between gap-4 mb-2">
                    {overlayConfig.showArtists && (
                      <h2 className="text-2xl font-bold flex-1" style={{ color: primaryColor }}>
                        {headliners.map(a => a.name).join(", ")}
                      </h2>
                    )}
                    
                    {overlayConfig.showRating && (
                      <div className={`text-4xl font-black bg-gradient-to-r ${getScoreGradient(calculateShowScore(show.rating, show.artist_performance, show.sound, show.lighting, show.crowd, show.venue_vibe))} bg-clip-text text-transparent leading-none flex-shrink-0`}>
                        {calculateShowScore(show.rating, show.artist_performance, show.sound, show.lighting, show.crowd, show.venue_vibe).toFixed(1)}
                      </div>
                    )}
                  </div>
                  
                  {overlayConfig.showVenue && (
                    <p className="text-lg mb-1 flex items-center gap-2">
                      <MapPin className="h-4 w-4" />
                      {show.venue_name}
                    </p>
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

                  {overlayConfig.showDetailedRatings && (show.artist_performance || show.sound || show.lighting || show.crowd || show.venue_vibe) && (
                    <div className="space-y-2 text-xs mb-3">
                      {show.artist_performance && (
                        <div className="flex items-center gap-2">
                          <span className="w-20">Performance</span>
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
                          <span className="w-20">Sound</span>
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
                          <span className="w-20">Lighting</span>
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
                          <span className="w-20">Crowd</span>
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
                          <span className="w-20">Vibe</span>
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

                  {/* Scene logo at bottom */}
                  <div className="mt-4 text-center">
                    <span className="text-xs font-bold tracking-wider opacity-30" style={{ filter: "grayscale(100%)" }}>
                      SCENE
                    </span>
                  </div>
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

            <div className="flex items-center justify-between">
              <Label htmlFor="show-background">Background Overlay</Label>
              <Switch
                id="show-background"
                checked={overlayConfig.showBackground}
                onCheckedChange={(checked) => 
                  setOverlayConfig({ ...overlayConfig, showBackground: checked })
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
              value={[overlaySize === 0.25 ? 0 : overlaySize === 0.35 ? 1 : 2]}
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
