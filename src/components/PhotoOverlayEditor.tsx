import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Download, MapPin, Instagram, Move, Eye, EyeOff,
  Mic2, Building2, Calendar, Star, BarChart3, MessageSquareQuote, 
  Layers, Trophy, RotateCcw, SunDim
} from "lucide-react";
import { toast } from "sonner";
import { calculateShowScore, getScoreGradient } from "@/lib/utils";
import { useMultiTouchTransform } from "@/hooks/useMultiTouchTransform";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
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

interface ShowRanking {
  show_id: string;
  elo_score: number;
  comparisons_count: number;
}

interface PhotoOverlayEditorProps {
  show: Show;
  onClose: () => void;
  allShows?: Show[];
  rankings?: ShowRanking[];
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

export const PhotoOverlayEditor = ({ show, onClose, allShows = [], rankings = [] }: PhotoOverlayEditorProps) => {
  const [overlayConfig, setOverlayConfig] = useState({
    showArtists: true,
    showVenue: true,
    showDate: true,
    showRating: true,
    showDetailedRatings: true,
    showNotes: true,
    showBackground: true,
    showRank: false,
  });
  
  const [rankingMethod, setRankingMethod] = useState<"score" | "elo">("score");
  const [rankingTimeFilter, setRankingTimeFilter] = useState<"all-time" | "this-year" | "this-month">("all-time");

  const [overlayOpacity, setOverlayOpacity] = useState<number>(90);
  const [isGenerating, setIsGenerating] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string>("hsl(45, 93%, 58%)");
  const [imageDimensions, setImageDimensions] = useState<{ width: number; height: number } | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showRankOptions, setShowRankOptions] = useState(false);
  
  // Multi-touch transform for Instagram-style overlay manipulation
  const { transform, setTransform, handlers, handleWheel } = useMultiTouchTransform({
    initialTransform: { x: 20, y: 100, scale: 0.8, rotation: 0 },
    minScale: 0.3,
    maxScale: 1.5,
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Reset overlay position
  const handleReset = () => {
    setTransform({ x: 20, y: 100, scale: 0.8, rotation: 0 });
  };
  
  // Toggle helper for tap-to-toggle
  const toggleConfig = (key: keyof typeof overlayConfig) => {
    setOverlayConfig(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  // Attach wheel handler for desktop zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      handleWheel(e);
    };
    
    container.addEventListener('wheel', wheelHandler, { passive: false });
    return () => container.removeEventListener('wheel', wheelHandler);
  }, [handleWheel]);

  // Detect image dimensions on mount
  useEffect(() => {
    if (show.photo_url) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageDimensions({ width: img.width, height: img.height });
      };
      img.src = show.photo_url;
    }
  }, [show.photo_url]);
  // Helper: Filter shows by time period
  const filterShowsByTime = (shows: Show[], timeFilter: string) => {
    if (timeFilter === "all-time") return shows;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return shows.filter(s => {
      const showDate = new Date(s.show_date);
      
      if (timeFilter === "this-year") {
        return showDate.getFullYear() === currentYear;
      } else if (timeFilter === "this-month") {
        return showDate.getFullYear() === currentYear && 
               showDate.getMonth() === currentMonth;
      }
      return true;
    });
  };

  // Calculate rank data
  const calculateRankData = () => {
    const filteredShows = filterShowsByTime(allShows, rankingTimeFilter);
    
    if (filteredShows.length === 0) {
      return { position: 0, total: 0, percentile: 0 };
    }

    if (rankingMethod === "score") {
      // Sort by calculated score (descending)
      const sorted = [...filteredShows].sort((a, b) => {
        const scoreA = calculateShowScore(a.rating, a.artist_performance, a.sound, a.lighting, a.crowd, a.venue_vibe);
        const scoreB = calculateShowScore(b.rating, b.artist_performance, b.sound, b.lighting, b.crowd, b.venue_vibe);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.show_date).getTime() - new Date(a.show_date).getTime();
      });
      
      const position = sorted.findIndex(s => s.id === show.id) + 1;
      const total = sorted.length;
      const percentile = position > 0 ? ((total - position + 1) / total) * 100 : 0;
      
      return { position, total, percentile };
    } else {
      // ELO-based ranking
      const filteredShowIds = new Set(filteredShows.map(s => s.id));
      const filteredRankings = rankings.filter(r => filteredShowIds.has(r.show_id));
      
      const sorted = [...filteredRankings].sort((a, b) => b.elo_score - a.elo_score);
      
      const position = sorted.findIndex(r => r.show_id === show.id) + 1;
      const total = sorted.length;
      const percentile = position > 0 ? ((total - position + 1) / total) * 100 : 0;
      
      return { position, total, percentile };
    }
  };

  const rankData = calculateRankData();
  
  // Debug logging
  console.log('PhotoOverlayEditor - Rank Debug:', {
    showRankEnabled: overlayConfig.showRank,
    allShowsCount: allShows.length,
    rankingsCount: rankings.length,
    rankData,
    rankingMethod,
    rankingTimeFilter
  });
  
  const getRankGradient = (percentile: number) => {
    if (percentile >= 90) return "from-[hsl(45,93%,58%)] to-[hsl(189,94%,55%)]";
    if (percentile >= 75) return "from-[hsl(189,94%,55%)] to-[hsl(260,80%,60%)]";
    if (percentile >= 50) return "from-[hsl(260,80%,60%)] to-[hsl(330,85%,65%)]";
    return "from-[hsl(330,85%,65%)] to-[hsl(0,84%,60%)]";
  };

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

  // Use transform.scale for canvas generation
  const overlayScale = transform.scale;

  // Reusable canvas generation function
  const generateCanvas = async (): Promise<HTMLCanvasElement> => {
    if (!show.photo_url) {
      throw new Error("No photo available");
    }

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");

    // Load background photo with error handling
    const img = new Image();
    img.crossOrigin = "anonymous";
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Image loading timeout')), 10000);
      
      img.onload = () => {
        clearTimeout(timeout);
        resolve(null);
      };
      img.onerror = () => {
        clearTimeout(timeout);
        reject(new Error('Failed to load image. The photo may have been deleted.'));
      };
      img.src = show.photo_url!;
    });

    // Use the image's natural dimensions, scaled to max 1920px on longest side
    const maxDimension = 1920;
    const scale = Math.min(maxDimension / img.width, maxDimension / img.height, 1);
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);

    // Draw photo at full canvas size (native aspect ratio)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

    // Get overlay position
    const overlayElement = document.getElementById("rating-overlay");
    const canvasContainer = document.getElementById("canvas-container");
    if (!overlayElement || !canvasContainer) throw new Error("Elements not found");
    
    const containerRect = canvasContainer.getBoundingClientRect();
    const overlayRect = overlayElement.getBoundingClientRect();

    const scaleX = canvas.width / containerRect.width;
    const scaleY = canvas.height / containerRect.height;

    const overlayX = (overlayRect.left - containerRect.left) * scaleX;
    const overlayY = (overlayRect.top - containerRect.top) * scaleY;
    const overlayWidth = overlayRect.width * scaleX;
    const overlayHeight = overlayRect.height * scaleY;

    // Draw overlay background if opacity > 0
    if (overlayOpacity > 0) {
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
      ctx.beginPath();
      ctx.roundRect(overlayX, overlayY, overlayWidth, overlayHeight, 24 * scaleX);
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Draw text matching screen layout exactly
    const padding = 24 * scaleX;
    let yPos = overlayY + padding;
    
    ctx.fillStyle = "white";
    ctx.textAlign = "left";

    // Row 1: Artist and Score
    if (overlayConfig.showArtists || overlayConfig.showRating) {
      const headliners = show.artists.filter((a) => a.is_headliner);
      const artistText = headliners.map((a) => a.name).join(", ");
      const score = calculateShowScore(show.rating, show.artist_performance, show.sound, show.lighting, show.crowd, show.venue_vibe);

      if (overlayConfig.showArtists) {
        ctx.font = `bold ${24 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = overlayOpacity > 0 ? primaryColor : "white";
        if (overlayOpacity === 0) {
          ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
          ctx.shadowBlur = 8 * scaleX;
          ctx.shadowOffsetY = 2 * scaleY;
        }
        ctx.fillText(artistText, overlayX + padding, yPos);
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
      }

      if (overlayConfig.showRating) {
        ctx.font = `900 ${36 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
        ctx.fillStyle = "white";
        const scoreText = score.toFixed(1);
        const scoreWidth = ctx.measureText(scoreText).width;
        ctx.fillText(scoreText, overlayX + overlayWidth - padding - scoreWidth, yPos);
      }

      yPos += 40 * scaleY;
    }

    // Venue
    if (overlayConfig.showVenue) {
      ctx.font = `${18 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "white";
      ctx.fillText(show.venue_name, overlayX + padding, yPos);
      yPos += 28 * scaleY;
    }

    // Date
    if (overlayConfig.showDate) {
      ctx.font = `${14 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      const dateStr = new Date(show.show_date).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
      ctx.fillText(dateStr, overlayX + padding, yPos);
      yPos += 36 * scaleY;
    }

    // Detailed ratings
    if (overlayConfig.showDetailedRatings && (show.artist_performance || show.sound || show.lighting || show.crowd || show.venue_vibe)) {
      const detailedRatings = [
        { label: "Performance", value: show.artist_performance },
        { label: "Sound", value: show.sound },
        { label: "Lighting", value: show.lighting },
        { label: "Crowd", value: show.crowd },
        { label: "Vibe", value: show.venue_vibe },
      ].filter((r) => r.value);

      ctx.font = `${12 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
      const labelWidth = 80 * scaleX;
      const barWidth = overlayWidth - padding * 2 - labelWidth - 8 * scaleX;
      const barHeight = 6 * scaleY;

      detailedRatings.forEach((rating) => {
        ctx.fillStyle = "white";
        ctx.fillText(rating.label, overlayX + padding, yPos);

        const barX = overlayX + padding + labelWidth;
        const barY = yPos - barHeight / 2 - 6 * scaleY;

        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, barHeight / 2);
        ctx.fill();

        const fillWidth = (rating.value! / 5) * barWidth;
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillWidth, barHeight, barHeight / 2);
        ctx.fill();

        yPos += 22 * scaleY;
      });
      yPos += 12 * scaleY;
    }

    // Notes
    if (overlayConfig.showNotes && show.notes) {
      ctx.font = `italic ${14 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
      const maxWidth = overlayWidth - padding * 2;
      const words = `"${show.notes}"`.split(" ");
      let line = "";
      let lineCount = 0;

      words.forEach((word) => {
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== "") {
          if (lineCount < 3) {
            ctx.fillText(line, overlayX + padding, yPos);
            line = word + " ";
            yPos += 28 * scaleY;
            lineCount++;
          }
        } else {
          line = testLine;
        }
      });
      if (lineCount < 3 && line !== "") {
        ctx.fillText(line, overlayX + padding, yPos);
      }
      yPos += 12 * scaleY;
    }
    
    // Scene logo and rank at bottom
    const bottomY = overlayY + overlayHeight - 12 * scaleY;
    
    // Rank on the left
    if (overlayConfig.showRank && rankData.total > 0) {
      ctx.font = `600 ${10 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
      
      const rankGradientColors = (() => {
        if (rankData.percentile >= 90) return ["hsl(45, 93%, 58%)", "hsl(189, 94%, 55%)"];
        if (rankData.percentile >= 75) return ["hsl(189, 94%, 55%)", "hsl(260, 80%, 60%)"];
        if (rankData.percentile >= 50) return ["hsl(260, 80%, 60%)", "hsl(330, 85%, 65%)"];
        return ["hsl(330, 85%, 65%)", "hsl(0, 84%, 60%)"];
      })();
      
      const gradient = ctx.createLinearGradient(overlayX + padding, bottomY, overlayX + overlayWidth - padding, bottomY);
      gradient.addColorStop(0, rankGradientColors[0]);
      gradient.addColorStop(1, rankGradientColors[1]);
      
      ctx.fillStyle = gradient;
      ctx.textAlign = "left";
      const timePeriod = rankingTimeFilter === 'this-year' ? 'this year' : rankingTimeFilter === 'this-month' ? 'this month' : 'all time';
      const rankText = `#${rankData.position} of ${rankData.total} shows ${timePeriod}`;
      ctx.fillText(rankText, overlayX + padding, bottomY);
    }
    
    // Scene logo on the right
    ctx.font = `bold ${10 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
    ctx.fillStyle = "rgba(255, 255, 255, 0.3)";
    ctx.textAlign = "right";
    ctx.fillText("SCENE", overlayX + overlayWidth - padding, bottomY);

    return canvas;
  };

  const handleDownloadImage = async () => {
    if (!show.photo_url) {
      toast.error("No photo available");
      return;
    }

    setIsGenerating(true);
    try {
      const canvas = await generateCanvas();
      
      // Download
      canvas.toBlob((blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
          return;
        }
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        
        const artistName = show.artists[0]?.name || "show";
        const date = new Date(show.show_date).toISOString().split('T')[0];
        a.download = `scene-${artistName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${date}.png`;
        
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

  const handleShareToInstagram = async () => {
    if (!show.photo_url) {
      toast.error("No photo available");
      return;
    }

    setIsGenerating(true);
    try {
      const canvas = await generateCanvas();
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          toast.error("Failed to generate image");
          setIsGenerating(false);
          return;
        }
        
        const artistName = show.artists[0]?.name || "show";
        const file = new File([blob], `scene-${artistName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`, { 
          type: 'image/png' 
        });
        
        // Check if Web Share API with files is supported
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: 'My Show on Scene',
            });
            toast.success("Shared successfully!");
          } catch (err) {
            // User cancelled share - not an error
            if ((err as Error).name !== 'AbortError') {
              console.error("Share failed:", err);
              toast.error("Share failed. Downloading instead...");
              // Fallback to download
              downloadBlob(blob, artistName);
            }
          }
        } else {
          // Fallback for browsers that don't support sharing files
          toast.info("Share not supported on this device. Downloading instead...");
          downloadBlob(blob, artistName);
        }
        
        setIsGenerating(false);
      }, "image/png");

    } catch (error) {
      console.error("Error generating image:", error);
      toast.error("Failed to generate image");
      setIsGenerating(false);
    }
  };

  const downloadBlob = (blob: Blob, artistName: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const date = new Date(show.show_date).toISOString().split('T')[0];
    a.download = `scene-${artistName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}-${date}.png`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Image downloaded!");
  };

  if (!show.photo_url) {
    return (
      <div className="flex items-center justify-center h-full min-h-[400px]">
        <div className="text-center space-y-2">
          <p className="text-muted-foreground">No photo available for this show</p>
          <p className="text-sm text-muted-foreground">Add a photo from the show details to customize and share</p>
        </div>
      </div>
    );
  }

  const headliners = show.artists.filter(a => a.is_headliner);

  // Toolbar toggle items configuration (removed Background - now controlled by opacity slider)
  const toggleItems = [
    { key: "showArtists" as const, icon: Mic2, label: "Artist", active: overlayConfig.showArtists },
    { key: "showVenue" as const, icon: Building2, label: "Venue", active: overlayConfig.showVenue },
    { key: "showDate" as const, icon: Calendar, label: "Date", active: overlayConfig.showDate },
    { key: "showRating" as const, icon: Star, label: "Score", active: overlayConfig.showRating },
    { key: "showDetailedRatings" as const, icon: BarChart3, label: "Details", active: overlayConfig.showDetailedRatings },
    { key: "showNotes" as const, icon: MessageSquareQuote, label: "Notes", active: overlayConfig.showNotes, disabled: !show.notes },
    { key: "showRank" as const, icon: Trophy, label: "Rank", active: overlayConfig.showRank },
  ];
  
  // Determine if background should show based on opacity (0 = no background)
  const showBackground = overlayOpacity > 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col gap-4 pb-4">
        {/* Canvas Preview with touch gestures */}
        <div className="flex-1 flex flex-col items-center justify-center bg-muted/20 rounded-lg relative min-h-[400px] p-4">
          {/* Main image container */}
          <div
            ref={containerRef}
            id="canvas-container"
            className="relative bg-black overflow-hidden touch-none rounded-lg"
            style={{
              width: "100%",
              maxWidth: imageDimensions 
                ? (imageDimensions.width >= imageDimensions.height ? "540px" : "400px")
                : "540px",
              aspectRatio: imageDimensions 
                ? `${imageDimensions.width}/${imageDimensions.height}` 
                : "9/16",
            }}
            {...handlers}
          >
            {/* Background Photo */}
            <img
              src={show.photo_url}
              alt="Show"
              className="absolute inset-0 w-full h-full object-cover pointer-events-none"
              crossOrigin="anonymous"
              onError={(e) => {
                e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EPhoto Unavailable%3C/text%3E%3C/svg%3E';
              }}
            />

            {/* Touch-controlled Overlay with tap-to-toggle elements */}
            <div
              id="rating-overlay"
              className="absolute rounded-3xl p-6 text-white shadow-2xl backdrop-blur-sm border border-white/10 cursor-move select-none"
              style={{
                left: transform.x,
                top: transform.y,
                transform: `scale(${transform.scale}) rotate(${transform.rotation}deg)`,
                transformOrigin: "top left",
                background: showBackground ? getRatingGradient(show.rating) : "transparent",
                opacity: showBackground ? overlayOpacity / 100 : 1,
                width: 280,
                touchAction: "none",
              }}
            >
              {/* Artist name and rating on same row - tap to toggle */}
              <div className="flex items-start justify-between gap-4 mb-2">
                {overlayConfig.showArtists && (
                  <h2 
                    className="text-2xl font-bold flex-1 cursor-pointer transition-opacity hover:opacity-70" 
                    style={{ 
                      color: showBackground ? primaryColor : "white",
                      textShadow: showBackground ? "none" : "0 2px 8px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.9)"
                    }}
                    onClick={(e) => { e.stopPropagation(); toggleConfig("showArtists"); }}
                  >
                    {headliners.map(a => a.name).join(", ")}
                  </h2>
                )}
                
                {overlayConfig.showRating && (
                  <div 
                    className={`text-4xl font-black bg-gradient-to-r ${getScoreGradient(calculateShowScore(show.rating, show.artist_performance, show.sound, show.lighting, show.crowd, show.venue_vibe))} bg-clip-text text-transparent leading-none flex-shrink-0 cursor-pointer transition-opacity hover:opacity-70`}
                    onClick={(e) => { e.stopPropagation(); toggleConfig("showRating"); }}
                  >
                    {calculateShowScore(show.rating, show.artist_performance, show.sound, show.lighting, show.crowd, show.venue_vibe).toFixed(1)}
                  </div>
                )}
              </div>
              
              {overlayConfig.showVenue && (
                <p 
                  className="text-lg mb-1 flex items-center gap-2 cursor-pointer transition-opacity hover:opacity-70"
                  onClick={(e) => { e.stopPropagation(); toggleConfig("showVenue"); }}
                >
                  <MapPin className="h-4 w-4" />
                  {show.venue_name}
                </p>
              )}
              
              {overlayConfig.showDate && (
                <p 
                  className="text-sm opacity-90 mb-3 cursor-pointer transition-opacity hover:opacity-70"
                  onClick={(e) => { e.stopPropagation(); toggleConfig("showDate"); }}
                >
                  {new Date(show.show_date).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}

              {overlayConfig.showDetailedRatings && (show.artist_performance || show.sound || show.lighting || show.crowd || show.venue_vibe) && (
                <div 
                  className="space-y-2 text-xs mb-3 cursor-pointer transition-opacity hover:opacity-70"
                  onClick={(e) => { e.stopPropagation(); toggleConfig("showDetailedRatings"); }}
                >
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
                <p 
                  className="text-sm italic opacity-90 line-clamp-3 mb-2 cursor-pointer transition-opacity hover:opacity-70"
                  onClick={(e) => { e.stopPropagation(); toggleConfig("showNotes"); }}
                >
                  "{show.notes}"
                </p>
              )}
              
              {/* Scene logo and rank at bottom */}
              <div className="mt-4 flex items-center justify-between">
                {overlayConfig.showRank && rankData.total > 0 ? (
                  <div 
                    className={`text-xs font-semibold bg-gradient-to-r ${getRankGradient(rankData.percentile)} bg-clip-text text-transparent cursor-pointer transition-opacity hover:opacity-70`}
                    onClick={(e) => { e.stopPropagation(); toggleConfig("showRank"); }}
                  >
                    #{rankData.position} of {rankData.total} shows {rankingTimeFilter === 'this-year' ? 'this year' : rankingTimeFilter === 'this-month' ? 'this month' : 'all time'}
                  </div>
                ) : (
                  <div />
                )}
                <span 
                  className="text-xs font-bold tracking-wider opacity-30" 
                  style={{ filter: "grayscale(100%)" }}
                >
                  SCENE
                </span>
              </div>
            </div>
            
            {/* Floating Toolbar - hidden in preview mode */}
            {!isPreviewMode && (
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/70 backdrop-blur-md px-2 py-1.5 rounded-full border border-white/10 shadow-lg">
                {toggleItems.map((item) => (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          if (item.key === "showRank") {
                            if (!overlayConfig.showRank) {
                              toggleConfig("showRank");
                            }
                            setShowRankOptions(!showRankOptions);
                          } else {
                            toggleConfig(item.key);
                          }
                        }}
                        disabled={item.disabled}
                        className={`p-2 rounded-full transition-all ${
                          item.active 
                            ? "bg-white/20 text-white" 
                            : "text-white/40 hover:text-white/70 hover:bg-white/10"
                        } ${item.disabled ? "opacity-30 cursor-not-allowed" : ""}`}
                      >
                        <item.icon className="h-4 w-4" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ))}
                
                <div className="w-px h-5 bg-white/20 mx-1" />
                
                {/* Reset position */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      className="p-2 rounded-full text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Reset Position
                  </TooltipContent>
                </Tooltip>
                
                {/* Preview toggle */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsPreviewMode(true); setShowRankOptions(false); }}
                      className="p-2 rounded-full text-white/40 hover:text-white/70 hover:bg-white/10 transition-all"
                    >
                      <Eye className="h-4 w-4" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Preview
                  </TooltipContent>
                </Tooltip>
              </div>
            )}
            
            {/* Exit preview mode button */}
            {isPreviewMode && (
              <button
                onClick={() => setIsPreviewMode(false)}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/80 hover:text-white transition-colors"
              >
                <EyeOff className="h-4 w-4" />
                <span className="text-sm">Exit Preview</span>
              </button>
            )}
            
            {/* Rank options popup */}
            {showRankOptions && overlayConfig.showRank && !isPreviewMode && (
              <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md p-3 rounded-xl border border-white/10 shadow-lg space-y-3 min-w-[200px]">
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/70">Method</Label>
                  <ToggleGroup 
                    type="single" 
                    value={rankingMethod}
                    onValueChange={(value) => value && setRankingMethod(value as "score" | "elo")}
                    className="justify-start"
                  >
                    <ToggleGroupItem value="score" className="text-xs h-7 px-2 data-[state=on]:bg-white/20 data-[state=on]:text-white text-white/60">By Score</ToggleGroupItem>
                    <ToggleGroupItem value="elo" className="text-xs h-7 px-2 data-[state=on]:bg-white/20 data-[state=on]:text-white text-white/60">Head to Head</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                
                <div className="space-y-1.5">
                  <Label className="text-xs text-white/70">Period</Label>
                  <ToggleGroup 
                    type="single" 
                    value={rankingTimeFilter}
                    onValueChange={(value) => value && setRankingTimeFilter(value as "all-time" | "this-year" | "this-month")}
                    className="justify-start flex-wrap"
                  >
                    <ToggleGroupItem value="all-time" className="text-xs h-7 px-2 data-[state=on]:bg-white/20 data-[state=on]:text-white text-white/60">All</ToggleGroupItem>
                    <ToggleGroupItem value="this-year" className="text-xs h-7 px-2 data-[state=on]:bg-white/20 data-[state=on]:text-white text-white/60">Year</ToggleGroupItem>
                    <ToggleGroupItem value="this-month" className="text-xs h-7 px-2 data-[state=on]:bg-white/20 data-[state=on]:text-white text-white/60">Month</ToggleGroupItem>
                  </ToggleGroup>
                </div>
                
                <button
                  onClick={() => setShowRankOptions(false)}
                  className="w-full text-xs text-white/50 hover:text-white/70 pt-1"
                >
                  Done
                </button>
              </div>
            )}
            
            {/* Vertical Opacity Slider - inside image on right edge, hidden in preview mode */}
            {!isPreviewMode && (
              <div 
                className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5 bg-black/50 backdrop-blur-sm px-1.5 py-3 rounded-full border border-white/10"
                onClick={(e) => e.stopPropagation()}
              >
                <SunDim className="h-3.5 w-3.5 text-white/60" />
                <div className="relative h-20 w-4 flex items-center justify-center">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={overlayOpacity}
                    onChange={(e) => setOverlayOpacity(Number(e.target.value))}
                    className="absolute h-1 w-16 cursor-pointer origin-center"
                    style={{ 
                      transform: 'rotate(-90deg)',
                      WebkitAppearance: 'none',
                      appearance: 'none',
                      background: `linear-gradient(to right, rgba(255,255,255,0.9) ${overlayOpacity}%, rgba(255,255,255,0.2) ${overlayOpacity}%)`,
                      borderRadius: '4px'
                    }}
                  />
                </div>
                <span className="text-[10px] text-white/60">{overlayOpacity}</span>
              </div>
            )}
          </div>
        </div>
        
        {/* Gesture hint below */}
        <p className="text-xs text-muted-foreground text-center">
          Drag • Pinch to resize • Two fingers to rotate • Tap elements to toggle
        </p>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            onClick={handleShareToInstagram}
            disabled={isGenerating}
            className="flex-1"
          >
            <Instagram className="mr-2 h-4 w-4" />
            {isGenerating ? "Generating..." : "Share"}
          </Button>
          <Button
            onClick={handleDownloadImage}
            disabled={isGenerating}
            variant="outline"
            className="flex-1"
          >
            <Download className="mr-2 h-4 w-4" />
            Download
          </Button>
        </div>
      </div>
    </TooltipProvider>
  );
};
