import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { 
  Download, MapPin, Instagram, Move, Eye, EyeOff,
  Mic2, Building2, Calendar, Star, BarChart3, MessageSquareQuote, 
  Trophy, RotateCcw, SunDim, MessageCircle
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
  
  // Aspect ratio mode: 'story' (9:16) or 'native' (original image ratio)
  const [aspectMode, setAspectMode] = useState<"story" | "native">("story");
  
  // Multi-touch transform for Instagram-style overlay manipulation
  const { transform, setTransform, handlers, handleWheel } = useMultiTouchTransform({
    initialTransform: { x: 20, y: 60, scale: 1, rotation: 0 },
    minScale: 0.3,
    maxScale: 1.5,
  });
  
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Reset overlay position
  const handleReset = () => {
    setTransform({ x: 20, y: 60, scale: 1, rotation: 0 });
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

    // Draw text matching screen layout exactly - VERTICAL STACKED LAYOUT
    const padding = 16 * scaleX;
    let yPos = overlayY + padding;
    
    ctx.fillStyle = "white";
    ctx.textAlign = "center";
    const centerX = overlayX + overlayWidth / 2;

    // Large score at top - the visual anchor
    if (overlayConfig.showRating) {
      const score = calculateShowScore(show.rating, show.artist_performance, show.sound, show.lighting, show.crowd, show.venue_vibe);
      ctx.font = `900 ${48 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
      
      // Score gradient
      const scoreGradient = ctx.createLinearGradient(centerX - 30 * scaleX, yPos, centerX + 30 * scaleX, yPos);
      if (score >= 9) {
        scoreGradient.addColorStop(0, "hsl(170, 80%, 50%)");
        scoreGradient.addColorStop(1, "hsl(189, 94%, 55%)");
      } else if (score >= 7) {
        scoreGradient.addColorStop(0, "hsl(85, 85%, 50%)");
        scoreGradient.addColorStop(1, "hsl(120, 75%, 45%)");
      } else if (score >= 5) {
        scoreGradient.addColorStop(0, "hsl(45, 100%, 55%)");
        scoreGradient.addColorStop(1, "hsl(60, 90%, 50%)");
      } else if (score >= 3) {
        scoreGradient.addColorStop(0, "hsl(30, 100%, 50%)");
        scoreGradient.addColorStop(1, "hsl(45, 100%, 55%)");
      } else {
        scoreGradient.addColorStop(0, "hsl(0, 84%, 55%)");
        scoreGradient.addColorStop(1, "hsl(20, 90%, 50%)");
      }
      
      ctx.fillStyle = scoreGradient;
      ctx.fillText(score.toFixed(1), centerX, yPos + 36 * scaleY);
      yPos += 52 * scaleY;
    }

    // Artist name below score
    if (overlayConfig.showArtists) {
      const headliners = show.artists.filter((a) => a.is_headliner);
      const artistText = headliners.map((a) => a.name).join(", ");
      ctx.font = `bold ${16 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = overlayOpacity > 0 ? primaryColor : "white";
      if (overlayOpacity === 0) {
        ctx.shadowColor = "rgba(0, 0, 0, 0.8)";
        ctx.shadowBlur = 8 * scaleX;
        ctx.shadowOffsetY = 2 * scaleY;
      }
      ctx.fillText(artistText, centerX, yPos);
      ctx.shadowBlur = 0;
      ctx.shadowOffsetY = 0;
      yPos += 20 * scaleY;
    }

    // Venue - centered compact
    if (overlayConfig.showVenue) {
      ctx.font = `${12 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "white";
      ctx.fillText(show.venue_name, centerX, yPos);
      yPos += 16 * scaleY;
    }

    // Date - centered compact
    if (overlayConfig.showDate) {
      ctx.font = `${10 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      const dateStr = new Date(show.show_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
      ctx.fillText(dateStr, centerX, yPos);
      yPos += 18 * scaleY;
    }

    // Detailed ratings - 5-column grid with initials
    if (overlayConfig.showDetailedRatings && (show.artist_performance || show.sound || show.lighting || show.crowd || show.venue_vibe)) {
      const ratings = [
        { label: "P", value: show.artist_performance },
        { label: "S", value: show.sound },
        { label: "L", value: show.lighting },
        { label: "C", value: show.crowd },
        { label: "V", value: show.venue_vibe },
      ].filter((r) => r.value);

      const columnWidth = (overlayWidth - padding * 2) / ratings.length;
      const barHeight = 4 * scaleY;
      const barWidth = columnWidth - 4 * scaleX;

      ctx.font = `${10 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
      
      ratings.forEach((rating, index) => {
        const colCenterX = overlayX + padding + columnWidth * index + columnWidth / 2;
        
        // Label
        ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
        ctx.fillText(rating.label, colCenterX, yPos);
        
        // Bar background
        const barX = colCenterX - barWidth / 2;
        const barY = yPos + 4 * scaleY;
        ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
        ctx.beginPath();
        ctx.roundRect(barX, barY, barWidth, barHeight, barHeight / 2);
        ctx.fill();
        
        // Bar fill
        const fillWidth = (rating.value! / 5) * barWidth;
        ctx.fillStyle = "rgba(255, 255, 255, 1)";
        ctx.beginPath();
        ctx.roundRect(barX, barY, fillWidth, barHeight, barHeight / 2);
        ctx.fill();
      });
      
      yPos += 22 * scaleY;
    }

    // Notes - centered, smaller
    if (overlayConfig.showNotes && show.notes) {
      ctx.font = `italic ${10 * overlayScale * scaleX}px system-ui, -apple-system, sans-serif`;
      ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
      const maxWidth = overlayWidth - padding * 2;
      const words = `"${show.notes}"`.split(" ");
      let line = "";
      let lineCount = 0;

      words.forEach((word) => {
        const testLine = line + word + " ";
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && line !== "") {
          if (lineCount < 2) {
            ctx.fillText(line.trim(), centerX, yPos);
            line = word + " ";
            yPos += 14 * scaleY;
            lineCount++;
          }
        } else {
          line = testLine;
        }
      });
      if (lineCount < 2 && line !== "") {
        ctx.fillText(line.trim(), centerX, yPos);
      }
      yPos += 10 * scaleY;
    }
    
    // Footer: Rank on left, Scene logo on right
    const bottomY = overlayY + overlayHeight - 10 * scaleY;
    
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
      ctx.fillText(`#${rankData.position}`, overlayX + padding, bottomY);
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

  const handleShareWithFriends = async () => {
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
        const headliners = show.artists.filter(a => a.is_headliner);
        const artistNames = headliners.map(a => a.name).join(", ");
        const file = new File([blob], `scene-${artistName.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase()}.png`, { 
          type: 'image/png' 
        });
        
        // Check if Web Share API with files is supported
        if (navigator.canShare?.({ files: [file] })) {
          try {
            await navigator.share({
              files: [file],
              title: `${artistNames} at ${show.venue_name}`,
              text: `Check out my show: ${artistNames} at ${show.venue_name}! 🎵`,
            });
            toast.success("Shared successfully!");
          } catch (err) {
            // User cancelled share - not an error
            if ((err as Error).name !== 'AbortError') {
              console.error("Share failed:", err);
              toast.error("Share failed. Downloading instead...");
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

  // Toolbar toggle items with color-coded groups
  const toggleItems = [
    // Content group - cyan
    { key: "showArtists" as const, icon: Mic2, label: "Artist", active: overlayConfig.showArtists, group: "content" as const },
    { key: "showVenue" as const, icon: Building2, label: "Venue", active: overlayConfig.showVenue, group: "content" as const },
    { key: "showDate" as const, icon: Calendar, label: "Date", active: overlayConfig.showDate, group: "content" as const },
    // Ratings group - amber
    { key: "showRating" as const, icon: Star, label: "Score", active: overlayConfig.showRating, group: "ratings" as const },
    { key: "showDetailedRatings" as const, icon: BarChart3, label: "Details", active: overlayConfig.showDetailedRatings, group: "ratings" as const },
    { key: "showNotes" as const, icon: MessageSquareQuote, label: "Notes", active: overlayConfig.showNotes, disabled: !show.notes, group: "ratings" as const },
    // Meta group - purple
    { key: "showRank" as const, icon: Trophy, label: "Rank", active: overlayConfig.showRank, group: "meta" as const },
  ];
  
  // Color-coded styling based on group
  const getToggleStyle = (item: typeof toggleItems[number]) => {
    const base = "p-1.5 transition-all";
    if (item.disabled) return `${base} opacity-20 cursor-not-allowed`;
    
    const styles = {
      content: item.active 
        ? "text-cyan-400" 
        : "text-cyan-400/30 hover:text-cyan-400/60",
      ratings: item.active 
        ? "text-amber-400" 
        : "text-amber-400/30 hover:text-amber-400/60",
      meta: item.active 
        ? "text-purple-400" 
        : "text-purple-400/30 hover:text-purple-400/60",
    };
    
    return `${base} ${styles[item.group]}`;
  };
  
  // Determine if background should show based on opacity (0 = no background)
  const showBackground = overlayOpacity > 0;

  return (
    <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        {/* Hero image area - takes remaining space */}
        <div className="flex-1 flex flex-col items-center justify-center bg-black/20 rounded-lg relative min-h-0 overflow-hidden">
          {/* Main image container - fills available space */}
          <div
            ref={containerRef}
            id="canvas-container"
            className="relative bg-black overflow-hidden rounded-lg h-full w-full flex items-center justify-center"
          >
            {/* Photo wrapper - scales to fit, handlers here constrain overlay to image bounds */}
            <div 
              className="relative touch-none overflow-hidden"
              style={{
                width: aspectMode === "story" ? "auto" : "100%",
                height: aspectMode === "story" ? "100%" : "auto",
                aspectRatio: aspectMode === "story" ? "9/16" : (imageDimensions 
                  ? `${imageDimensions.width}/${imageDimensions.height}` 
                  : "9/16"),
                maxWidth: "100%",
                maxHeight: "100%",
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

            {/* Touch-controlled Overlay - Vertical Stacked Layout */}
            <div
              id="rating-overlay"
              className="absolute rounded-2xl p-4 text-white text-center shadow-2xl backdrop-blur-sm border border-white/10 cursor-move select-none"
              style={{
                left: transform.x,
                top: transform.y,
                transform: `scale(${transform.scale}) rotate(${transform.rotation}deg)`,
                transformOrigin: "top left",
                background: showBackground ? getRatingGradient(show.rating) : "transparent",
                opacity: showBackground ? overlayOpacity / 100 : 1,
                width: 160,
                touchAction: "none",
              }}
            >
              {/* Large score at top - the visual anchor */}
              {overlayConfig.showRating && (
                <div 
                  className={`text-5xl font-black bg-gradient-to-r ${getScoreGradient(calculateShowScore(show.rating, show.artist_performance, show.sound, show.lighting, show.crowd, show.venue_vibe))} bg-clip-text text-transparent leading-none mb-2 cursor-pointer transition-opacity hover:opacity-70`}
                  onClick={(e) => { e.stopPropagation(); toggleConfig("showRating"); }}
                >
                  {calculateShowScore(show.rating, show.artist_performance, show.sound, show.lighting, show.crowd, show.venue_vibe).toFixed(1)}
                </div>
              )}
              
              {/* Artist name below score */}
              {overlayConfig.showArtists && (
                <h2 
                  className="text-base font-bold mb-1 cursor-pointer transition-opacity hover:opacity-70 leading-tight" 
                  style={{ 
                    color: showBackground ? primaryColor : "white",
                    textShadow: showBackground ? "none" : "0 2px 8px rgba(0, 0, 0, 0.8), 0 0 2px rgba(0, 0, 0, 0.9)"
                  }}
                  onClick={(e) => { e.stopPropagation(); toggleConfig("showArtists"); }}
                >
                  {headliners.map(a => a.name).join(", ")}
                </h2>
              )}
              
              {/* Venue - centered compact */}
              {overlayConfig.showVenue && (
                <p 
                  className="text-xs mb-0.5 flex items-center justify-center gap-1 cursor-pointer transition-opacity hover:opacity-70"
                  onClick={(e) => { e.stopPropagation(); toggleConfig("showVenue"); }}
                >
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{show.venue_name}</span>
                </p>
              )}
              
              {/* Date - centered compact */}
              {overlayConfig.showDate && (
                <p 
                  className="text-[10px] opacity-80 mb-2 cursor-pointer transition-opacity hover:opacity-70"
                  onClick={(e) => { e.stopPropagation(); toggleConfig("showDate"); }}
                >
                  {new Date(show.show_date).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </p>
              )}

              {/* Detailed ratings - 5-column grid with initials */}
              {overlayConfig.showDetailedRatings && (show.artist_performance || show.sound || show.lighting || show.crowd || show.venue_vibe) && (
                <div 
                  className="grid grid-cols-5 gap-1 text-[10px] mb-2 cursor-pointer transition-opacity hover:opacity-70"
                  onClick={(e) => { e.stopPropagation(); toggleConfig("showDetailedRatings"); }}
                >
                  {show.artist_performance && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="opacity-60">P</span>
                      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: `${(show.artist_performance / 5) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {show.sound && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="opacity-60">S</span>
                      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: `${(show.sound / 5) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {show.lighting && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="opacity-60">L</span>
                      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: `${(show.lighting / 5) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {show.crowd && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="opacity-60">C</span>
                      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: `${(show.crowd / 5) * 100}%` }} />
                      </div>
                    </div>
                  )}
                  {show.venue_vibe && (
                    <div className="flex flex-col items-center gap-0.5">
                      <span className="opacity-60">V</span>
                      <div className="w-full h-1 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full" style={{ width: `${(show.venue_vibe / 5) * 100}%` }} />
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Notes - centered, smaller */}
              {overlayConfig.showNotes && show.notes && (
                <p 
                  className="text-[10px] italic opacity-80 line-clamp-2 mb-2 cursor-pointer transition-opacity hover:opacity-70"
                  onClick={(e) => { e.stopPropagation(); toggleConfig("showNotes"); }}
                >
                  "{show.notes}"
                </p>
              )}
              
              {/* Footer - rank and logo */}
              <div className="mt-2 flex items-center justify-between text-[10px]">
                {overlayConfig.showRank && rankData.total > 0 ? (
                  <span 
                    className={`font-semibold bg-gradient-to-r ${getRankGradient(rankData.percentile)} bg-clip-text text-transparent cursor-pointer transition-opacity hover:opacity-70`}
                    onClick={(e) => { e.stopPropagation(); toggleConfig("showRank"); }}
                  >
                    #{rankData.position}
                  </span>
                ) : (
                  <span />
                )}
                <span 
                  className="font-bold tracking-wider opacity-30" 
                  style={{ filter: "grayscale(100%)" }}
                >
                  SCENE
                </span>
              </div>
            </div>
            </div>{/* Close photo wrapper */}
            
            {/* Vertical Opacity Slider - inside image on right edge, hidden in preview mode */}
            {!isPreviewMode && (
              <div 
                className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5"
                onClick={(e) => e.stopPropagation()}
                onTouchStart={(e) => e.stopPropagation()}
                onTouchMove={(e) => e.stopPropagation()}
                onTouchEnd={(e) => e.stopPropagation()}
                onMouseDown={(e) => e.stopPropagation()}
                onMouseMove={(e) => e.stopPropagation()}
                onMouseUp={(e) => e.stopPropagation()}
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
              </div>
            )}
            
            {/* Exit preview mode button - inside container */}
            {isPreviewMode && (
              <button
                onClick={() => setIsPreviewMode(false)}
                className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/80 hover:text-white transition-colors"
              >
                <EyeOff className="h-4 w-4" />
                <span className="text-sm">Exit Preview</span>
              </button>
            )}
          </div>
          
          {/* Floating Toolbar - Color-coded with separators */}
          {!isPreviewMode && (
            <div className="flex items-center justify-center gap-1 mt-3">
              <div className="flex items-center gap-0.5 bg-card/80 backdrop-blur-md px-2 py-1.5 rounded-full border border-border/50 relative">
                {/* Content group - cyan */}
                {toggleItems.filter(i => i.group === "content").map((item) => (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          toggleConfig(item.key);
                        }}
                        disabled={item.disabled}
                        className={getToggleStyle(item)}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ))}
                
                <div className="w-px h-3 bg-border/50 mx-1" />
                
                {/* Ratings group - amber */}
                {toggleItems.filter(i => i.group === "ratings").map((item) => (
                  <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <button
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          toggleConfig(item.key);
                        }}
                        disabled={item.disabled}
                        className={getToggleStyle(item)}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ))}
                
                <div className="w-px h-3 bg-border/50 mx-1" />
                
                {/* Meta group - purple (rank with options) */}
                {toggleItems.filter(i => i.group === "meta").map((item) => (
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
                        className={getToggleStyle(item)}
                      >
                        <item.icon className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>
                ))}
                
                <div className="w-px h-3 bg-border/30 mx-1" />
                
                {/* Utilities - muted */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleReset(); }}
                      className="p-1.5 rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-all"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Reset
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={(e) => { e.stopPropagation(); setIsPreviewMode(true); setShowRankOptions(false); }}
                      className="p-1.5 rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-all"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Preview
                  </TooltipContent>
                </Tooltip>
                
                {/* Rank options popup - positioned above toolbar */}
                {showRankOptions && overlayConfig.showRank && (
                  <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-card backdrop-blur-md p-3 rounded-xl border border-border shadow-lg space-y-3 min-w-[200px]">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Method</Label>
                      <ToggleGroup 
                        type="single" 
                        value={rankingMethod}
                        onValueChange={(value) => value && setRankingMethod(value as "score" | "elo")}
                        className="justify-start"
                      >
                        <ToggleGroupItem value="score" className="text-xs h-7 px-2">By Score</ToggleGroupItem>
                        <ToggleGroupItem value="elo" className="text-xs h-7 px-2">Head to Head</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    
                    <div className="space-y-1.5">
                      <Label className="text-xs text-muted-foreground">Period</Label>
                      <ToggleGroup 
                        type="single" 
                        value={rankingTimeFilter}
                        onValueChange={(value) => value && setRankingTimeFilter(value as "all-time" | "this-year" | "this-month")}
                        className="justify-start flex-wrap"
                      >
                        <ToggleGroupItem value="all-time" className="text-xs h-7 px-2">All</ToggleGroupItem>
                        <ToggleGroupItem value="this-year" className="text-xs h-7 px-2">Year</ToggleGroupItem>
                        <ToggleGroupItem value="this-month" className="text-xs h-7 px-2">Month</ToggleGroupItem>
                      </ToggleGroup>
                    </div>
                    
                    <button
                      onClick={() => setShowRankOptions(false)}
                      className="w-full text-xs text-muted-foreground hover:text-foreground pt-1"
                    >
                      Done
                    </button>
                  </div>
                )}
              </div>
              
              {/* Aspect ratio pill - separate element */}
              <button
                onClick={() => setAspectMode(aspectMode === "story" ? "native" : "story")}
                className="text-[10px] bg-muted/50 px-2 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors"
              >
                {aspectMode === "story" ? "9:16" : "1:1"}
              </button>
            </div>
          )}
        </div>
        
        {/* Bottom controls - fixed height */}
        <div className="flex-shrink-0 pt-3 space-y-3 px-1">
          {/* Instagram Hero Button */}
          <Button
            onClick={handleShareToInstagram}
            disabled={isGenerating}
            className="w-full h-12 text-base font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 border-0 shadow-lg shadow-purple-500/25"
          >
            <Instagram className="mr-2 h-5 w-5" />
            {isGenerating ? "Generating..." : "Share to Instagram"}
          </Button>
          
          {/* Secondary actions - compact row */}
          <div className="flex gap-2">
            <Button
              onClick={handleShareWithFriends}
              disabled={isGenerating}
              variant="secondary"
              className="flex-1 h-10"
            >
              <MessageCircle className="mr-2 h-4 w-4" />
              Friends
            </Button>
            <Button
              onClick={handleDownloadImage}
              disabled={isGenerating}
              variant="ghost"
              className="flex-1 h-10"
            >
              <Download className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
};
