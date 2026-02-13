import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Download, MapPin, Instagram, Move, Eye, EyeOff, Mic2, Building2, Calendar, MessageSquareQuote, Trophy, RotateCcw, SunDim, MessageCircle, Camera, Upload, Link2 } from "lucide-react";
import { toast } from "sonner";
import { useMultiTouchTransform } from "@/hooks/useMultiTouchTransform";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import html2canvas from "html2canvas";
interface Artist {
  name: string;
  is_headliner: boolean;
}
interface Show {
  id: string;
  artists: Artist[];
  venue_name: string;
  show_date: string;
  notes?: string;
  photo_url?: string;
  tags?: string[];
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
// Neutral overlay gradient (no longer rating-based)
const getOverlayGradient = (): string => {
  return "linear-gradient(135deg, rgba(30, 41, 59, 0.85), rgba(15, 23, 42, 0.90))";
};
export const PhotoOverlayEditor = ({
  show,
  onClose,
  allShows = [],
  rankings = []
}: PhotoOverlayEditorProps) => {
  const [overlayConfig, setOverlayConfig] = useState({
    showArtists: true,
    showVenue: true,
    showDate: true,
    showNotes: true,
    showBackground: true,
    showRank: false
  });
  const [rankingTimeFilter, setRankingTimeFilter] = useState<"all-time" | "this-year" | "last-year">("all-time");

  // Determine show age category for context-aware rank options
  const getShowAgeCategory = (): "this-year" | "last-year" | "older" => {
    const showDate = new Date(show.show_date);
    const showYear = showDate.getFullYear();
    const currentYear = new Date().getFullYear();
    if (showYear === currentYear) return "this-year";
    if (showYear === currentYear - 1) return "last-year";
    return "older";
  };
  const showAgeCategory = getShowAgeCategory();
  const [overlayOpacity, setOverlayOpacity] = useState<number>(90);
  const [isGenerating, setIsGenerating] = useState(false);
  const [primaryColor, setPrimaryColor] = useState<string>("hsl(45, 93%, 58%)");
  const [imageDimensions, setImageDimensions] = useState<{
    width: number;
    height: number;
  } | null>(null);
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [showRankOptions, setShowRankOptions] = useState(false);

  // Photo upload state - allows adding photos from this view
  const [uploading, setUploading] = useState(false);
  const [localPhotoUrl, setLocalPhotoUrl] = useState<string | null>(show.photo_url || null);
  const uploadInputRef = useRef<HTMLInputElement>(null);

  // Referral link state
  const [referralCode, setReferralCode] = useState<string | null>(null);

  // Effective photo URL (local upload takes precedence)
  const effectivePhotoUrl = localPhotoUrl || show.photo_url;

  // Aspect ratio mode: 'story' (9:16) or 'native' (original image ratio)
  const [aspectMode, setAspectMode] = useState<"story" | "native">("story");

  // Multi-touch transform for Instagram-style overlay manipulation
  const {
    transform,
    setTransform,
    handlers,
    handleWheel
  } = useMultiTouchTransform({
    initialTransform: {
      x: 20,
      y: 60,
      scale: 1,
      rotation: 0
    },
    minScale: 0.3,
    maxScale: 1.5
  });
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset overlay position
  const handleReset = () => {
    setTransform({
      x: 20,
      y: 60,
      scale: 1,
      rotation: 0
    });
  };

  // Toggle helper for tap-to-toggle
  const toggleConfig = (key: keyof typeof overlayConfig) => {
    setOverlayConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  // Attach wheel handler for desktop zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const wheelHandler = (e: WheelEvent) => {
      e.preventDefault();
      handleWheel(e);
    };
    container.addEventListener('wheel', wheelHandler, {
      passive: false
    });
    return () => container.removeEventListener('wheel', wheelHandler);
  }, [handleWheel]);

  // Detect image dimensions on mount or when photo changes
  useEffect(() => {
    if (effectivePhotoUrl) {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        setImageDimensions({
          width: img.width,
          height: img.height
        });
      };
      img.src = effectivePhotoUrl;
    }
  }, [effectivePhotoUrl]);

  // Fetch user's referral code
  useEffect(() => {
    const fetchReferralCode = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('referral_code')
        .eq('id', user.id)
        .single();
      
      if (profile?.referral_code) {
        setReferralCode(profile.referral_code);
      }
    };
    fetchReferralCode();
  }, []);

  // Copy referral link handler
  const handleCopyReferralLink = async () => {
    if (!referralCode) {
      toast.error("Referral link not available");
      return;
    }
    
    const referralUrl = `${window.location.origin}/?ref=${referralCode}`;
    
    try {
      await navigator.clipboard.writeText(referralUrl);
      toast.success("Referral link copied! Share it with friends.");
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement('textarea');
      textArea.value = referralUrl;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      toast.success("Referral link copied!");
    }
  };

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
      } else if (timeFilter === "last-year") {
        return showDate.getFullYear() === currentYear - 1;
      } else if (timeFilter === "this-month") {
        return showDate.getFullYear() === currentYear && showDate.getMonth() === currentMonth;
      }
      return true;
    });
  };

  // Calculate rank data (always ELO-based)
  const calculateRankData = () => {
    const filteredShows = filterShowsByTime(allShows, rankingTimeFilter);
    if (filteredShows.length === 0) {
      return {
        position: 0,
        total: 0,
        percentile: 0
      };
    }

    // ELO-based ranking
    const filteredShowIds = new Set(filteredShows.map(s => s.id));
    const filteredRankings = rankings.filter(r => filteredShowIds.has(r.show_id));
    const sorted = [...filteredRankings].sort((a, b) => b.elo_score - a.elo_score);
    const position = sorted.findIndex(r => r.show_id === show.id) + 1;
    const total = sorted.length;
    const percentile = position > 0 ? (total - position + 1) / total * 100 : 0;
    return {
      position,
      total,
      percentile
    };
  };
  const rankData = calculateRankData();

  // Debug logging
  console.log('PhotoOverlayEditor - Rank Debug:', {
    showRankEnabled: overlayConfig.showRank,
    allShowsCount: allShows.length,
    rankingsCount: rankings.length,
    rankData,
    rankingTimeFilter
  });

  // Rank gradient aligned with score tier colors (red→orange→gold→green→teal)
  const getRankGradient = (percentile: number) => {
    if (percentile >= 90) return "from-[hsl(170,80%,50%)] to-[hsl(189,94%,55%)]"; // Top 10% - Teal (exceptional)
    if (percentile >= 75) return "from-[hsl(85,85%,50%)] to-[hsl(120,75%,45%)]"; // Top 25% - Green (great)
    if (percentile >= 50) return "from-[hsl(45,100%,55%)] to-[hsl(60,90%,50%)]"; // Top 50% - Gold (good)
    if (percentile >= 25) return "from-[hsl(30,100%,50%)] to-[hsl(45,100%,55%)]"; // Bottom 50% - Orange
    return "from-[hsl(0,84%,55%)] to-[hsl(20,90%,50%)]"; // Bottom 25% - Red
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
      const colorCounts: {
        [key: string]: number;
      } = {};
      for (let i = 0; i < data.length; i += 40) {
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];

        // Skip transparent and very dark/light pixels
        if (a < 128 || r + g + b < 50 || r + g + b > 700) continue;

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
      let h = 0,
        s = 0,
        l = (max + min) / 2;
      if (max !== min) {
        const d = max - min;
        s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
        switch (max) {
          case rNorm:
            h = ((gNorm - bNorm) / d + (gNorm < bNorm ? 6 : 0)) / 6;
            break;
          case gNorm:
            h = ((bNorm - rNorm) / d + 2) / 6;
            break;
          case bNorm:
            h = ((rNorm - gNorm) / d + 4) / 6;
            break;
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
  useEffect(() => {
    if (effectivePhotoUrl) {
      extractPrimaryColor(effectivePhotoUrl);
    }
  }, [effectivePhotoUrl]);

  // Use transform.scale for canvas generation
  const overlayScale = transform.scale;

  // Capture the photo wrapper as a canvas using html2canvas (pixel-perfect)
  const generateCanvas = async (): Promise<HTMLCanvasElement> => {
    if (!effectivePhotoUrl) {
      throw new Error("No photo available");
    }

    const canvasContainer = document.getElementById("canvas-container");
    if (!canvasContainer) throw new Error("Container not found");
    const photoWrapper = canvasContainer.querySelector('.touch-none') as HTMLElement;
    if (!photoWrapper) throw new Error("Photo wrapper not found");

    // Hide UI controls temporarily (opacity slider, etc.)
    const uiElements = canvasContainer.querySelectorAll('[data-export-hide]');
    uiElements.forEach(el => (el as HTMLElement).style.display = 'none');

    // Use html2canvas to screenshot the photo wrapper at high resolution
    const wrapperRect = photoWrapper.getBoundingClientRect();
    const scaleFactor = Math.min(1920 / wrapperRect.width, 1920 / wrapperRect.height, 3);

    const canvas = await html2canvas(photoWrapper, {
      scale: scaleFactor,
      useCORS: true,
      allowTaint: false,
      backgroundColor: null,
      logging: false,
      // Ensure we capture the full element
      width: wrapperRect.width,
      height: wrapperRect.height,
    });

    // Restore hidden UI elements
    uiElements.forEach(el => (el as HTMLElement).style.display = '');

    return canvas;
  };
  const handleDownloadImage = async () => {
    if (!effectivePhotoUrl) {
      toast.error("No photo available");
      return;
    }
    setIsGenerating(true);
    try {
      const canvas = await generateCanvas();

      // Download
      canvas.toBlob(blob => {
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
    if (!effectivePhotoUrl) {
      toast.error("No photo available");
      return;
    }
    setIsGenerating(true);
    try {
      const canvas = await generateCanvas();
      canvas.toBlob(async blob => {
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
        if (navigator.canShare?.({
          files: [file]
        })) {
          try {
            await navigator.share({
              files: [file],
              title: 'My Show on Scene'
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
    if (!effectivePhotoUrl) {
      toast.error("No photo available");
      return;
    }
    setIsGenerating(true);
    try {
      const canvas = await generateCanvas();
      canvas.toBlob(async blob => {
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
        if (navigator.canShare?.({
          files: [file]
        })) {
          try {
            await navigator.share({
              files: [file],
              title: `${artistNames} at ${show.venue_name}`,
              text: `Check out my show: ${artistNames} at ${show.venue_name}! 🎵`
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

  // Image compression utility
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = e => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
          }
          let width = img.width;
          let height = img.height;
          const maxWidth = 2000;
          if (width > maxWidth) {
            height = Math.round(height * maxWidth / width);
            width = maxWidth;
          }
          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob(blob => {
            if (!blob) {
              reject(new Error('Compression failed'));
              return;
            }
            if (blob.size > 2 * 1024 * 1024) {
              canvas.toBlob(smallerBlob => {
                if (!smallerBlob) {
                  reject(new Error('Compression failed'));
                  return;
                }
                resolve(new File([smallerBlob], file.name, {
                  type: 'image/jpeg'
                }));
              }, 'image/jpeg', 0.7);
            } else {
              resolve(new File([blob], file.name, {
                type: 'image/jpeg'
              }));
            }
          }, 'image/jpeg', 0.85);
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WEBP image");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Please upload an image smaller than 10MB");
      return;
    }
    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${show.id}.${fileExt}`;
      const {
        error: uploadError
      } = await supabase.storage.from('show-photos').upload(filePath, compressedFile, {
        upsert: true
      });
      if (uploadError) throw uploadError;
      const {
        data: {
          publicUrl
        }
      } = supabase.storage.from('show-photos').getPublicUrl(filePath);
      const {
        error: updateError
      } = await supabase.from('shows').update({
        photo_url: publicUrl
      }).eq('id', show.id);
      if (updateError) throw updateError;
      setLocalPhotoUrl(publicUrl);
      toast.success("Photo uploaded! You can now customize and share.");
    } catch (error) {
      console.error('Photo upload error:', error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
    }
  };

  // Format show data for no-photo state display
  const headlinerForDisplay = show.artists.find(a => a.is_headliner) || show.artists[0];
  const artistName = headlinerForDisplay?.name || "Unknown Artist";
  const supportingArtists = show.artists.filter(a => !a.is_headliner && a.name !== headlinerForDisplay?.name);
  const formattedDateForDisplay = new Date(show.show_date).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric"
  });
  if (!effectivePhotoUrl) {
    return <TooltipProvider>
        <div className="flex flex-col h-full">
          {/* Card-style no-photo state */}
          <div className="flex-1 flex items-center justify-center bg-black/20 rounded-lg overflow-hidden">
            <div className="relative w-full h-full overflow-hidden rounded-xl border border-white/10" style={{
            background: `linear-gradient(135deg, hsl(var(--primary) / 0.15), hsl(var(--background)), hsl(var(--primary-glow) / 0.1))`
          }}>
              {/* Upload CTA area - centered above metadata */}
              <div className="absolute inset-0 bottom-[120px] flex flex-col items-center justify-center gap-4">
                <input ref={uploadInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" className="hidden" onChange={handlePhotoUpload} />
                
                <Button onClick={() => uploadInputRef.current?.click()} disabled={uploading} variant="outline" className="bg-white/10 backdrop-blur-sm border-white/20 hover:bg-white/20 text-white font-medium px-6 py-5 rounded-xl">
                  {uploading ? <>
                      <Upload className="h-5 w-5 mr-2 animate-pulse" />
                      Uploading...
                    </> : <>
                      <Camera className="h-5 w-5 mr-2" />
                      Add Photo
                    </>}
                </Button>
              </div>
              
              {/* Scene logo - top right */}
              <div className="absolute top-3 right-3 z-10">
                <span className="text-xs font-black tracking-[0.25em] text-white/60 uppercase" style={{
                textShadow: "0 0 8px rgba(255,255,255,0.3)"
              }}>
                  SCENE ✦
                </span>
              </div>
              
              {/* Bottom metadata bar - matching HeroPhotoSection style */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <div className="bg-white/[0.08] rounded-xl border border-white/[0.1] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="font-black text-xl text-white tracking-wide truncate" style={{
                      textShadow: "0 0 12px rgba(255,255,255,0.4)"
                    }}>
                        {artistName}
                      </h2>
                      {supportingArtists.length > 0 && <p className="text-white/50 text-xs mt-0.5 truncate">
                          + {supportingArtists.map(a => a.name).join(', ')}
                        </p>}
                      <div className="flex items-center gap-1 text-white/60 text-sm mt-1">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{show.venue_name}</span>
                      </div>
                      <p className="text-white/50 text-xs mt-0.5">{formattedDateForDisplay}</p>
                    </div>
                    {/* Rank badge */}
                    <div className="flex-shrink-0">
                      <span className="text-xs font-bold text-primary tracking-wide" style={{
                      textShadow: "0 0 8px hsl(var(--primary)), 0 0 16px hsl(var(--primary) / 0.5)"
                    }}>
                        {rankData.position > 0 ? `#${rankData.position} All Time` : "Unranked"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Instagram share button - bottom of sheet */}
          <div className="pt-4 pb-2">
            <Button onClick={() => uploadInputRef.current?.click()} disabled={uploading} className="w-full bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:opacity-90 text-white font-semibold py-6 rounded-xl shadow-lg" style={{
            boxShadow: "0 0 20px rgba(168, 85, 247, 0.4)"
          }}>
              <Camera className="h-5 w-5 mr-2" />
              Add Photo to Share
            </Button>
          </div>
        </div>
      </TooltipProvider>;
  }
  const headliners = show.artists.filter(a => a.is_headliner);

  // Toolbar toggle items with color-coded groups
  const toggleItems = [
  // Content group - cyan
  {
    key: "showArtists" as const,
    icon: Mic2,
    label: "Artist",
    active: overlayConfig.showArtists,
    group: "content" as const
  }, {
    key: "showVenue" as const,
    icon: Building2,
    label: "Venue",
    active: overlayConfig.showVenue,
    group: "content" as const
  }, {
    key: "showDate" as const,
    icon: Calendar,
    label: "Date",
    active: overlayConfig.showDate,
    group: "content" as const
  },
  // Notes group - amber
  {
    key: "showNotes" as const,
    icon: MessageSquareQuote,
    label: "Notes",
    active: overlayConfig.showNotes,
    disabled: !show.notes,
    group: "ratings" as const
  },
  // Meta group - purple
  {
    key: "showRank" as const,
    icon: Trophy,
    label: "Rank",
    active: overlayConfig.showRank,
    group: "meta" as const
  }];

  // Color-coded styling based on group
  const getToggleStyle = (item: typeof toggleItems[number]) => {
    const base = "p-1.5 transition-all";
    if (item.disabled) return `${base} opacity-20 cursor-not-allowed`;
    const styles = {
      content: item.active ? "text-cyan-400" : "text-cyan-400/30 hover:text-cyan-400/60",
      ratings: item.active ? "text-amber-400" : "text-amber-400/30 hover:text-amber-400/60",
      meta: item.active ? "text-purple-400" : "text-purple-400/30 hover:text-purple-400/60"
    };
    return `${base} ${styles[item.group]}`;
  };

  // Determine if background should show based on opacity (0 = no background)
  const showBackground = overlayOpacity > 0;
  return <TooltipProvider delayDuration={300}>
      <div className="flex flex-col h-full">
        {/* Hero image area - takes remaining space */}
        <div className="flex-1 flex flex-col items-center justify-center bg-black/20 rounded-lg relative min-h-0 overflow-hidden">
          {/* Main image container - fills available space */}
          <div ref={containerRef} id="canvas-container" className="relative bg-black overflow-hidden rounded-lg h-full w-full flex items-center justify-center">
            {/* Photo wrapper - scales to fit, handlers here constrain overlay to image bounds */}
            <div className="relative touch-none overflow-hidden" style={{
            width: aspectMode === "story" ? "auto" : "100%",
            height: aspectMode === "story" ? "100%" : "auto",
            aspectRatio: aspectMode === "story" ? "9/16" : imageDimensions ? `${imageDimensions.width}/${imageDimensions.height}` : "9/16",
            maxWidth: "100%",
            maxHeight: "100%"
          }} {...handlers}>
            {/* Background Photo */}
            <img src={effectivePhotoUrl} alt="Show" className="absolute inset-0 w-full h-full object-cover pointer-events-none" crossOrigin="anonymous" onError={e => {
              e.currentTarget.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="100" height="100"%3E%3Crect fill="%23ddd" width="100" height="100"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999"%3EPhoto Unavailable%3C/text%3E%3C/svg%3E';
            }} />

            {/* Touch-controlled Overlay - Vertical Stacked Layout */}
            <div id="rating-overlay" className="absolute rounded-2xl p-4 text-white text-center shadow-2xl backdrop-blur-sm border border-white/10 cursor-move select-none" style={{
              left: transform.x,
              top: transform.y,
              transform: `scale(${transform.scale}) rotate(${transform.rotation}deg)`,
              transformOrigin: "center center",
              background: showBackground ? getOverlayGradient() : "transparent",
              opacity: showBackground ? overlayOpacity / 100 : 1,
              width: 160,
              touchAction: "none"
            }}>
              {/* Artist name - the visual anchor */}
              {overlayConfig.showArtists && <h2 className="text-base font-bold mb-1 cursor-pointer transition-opacity hover:opacity-70 leading-tight text-white" style={{
                textShadow: "0 0 8px rgba(255,255,255,0.5), 0 0 16px rgba(255,255,255,0.25)"
              }} onClick={e => {
                e.stopPropagation();
                toggleConfig("showArtists");
              }}>
                  {headliners.map(a => a.name).join(", ")}
                </h2>}
              
              {/* Venue - centered compact */}
              {overlayConfig.showVenue && <p className="text-xs mb-0.5 flex items-center justify-center gap-1 cursor-pointer transition-opacity hover:opacity-70" onClick={e => {
                e.stopPropagation();
                toggleConfig("showVenue");
              }}>
                  <MapPin className="h-3 w-3 flex-shrink-0" />
                  <span className="truncate">{show.venue_name}</span>
                </p>}
              
              {/* Date - centered compact */}
              {overlayConfig.showDate && <p className="text-[10px] opacity-80 mb-2 cursor-pointer transition-opacity hover:opacity-70" onClick={e => {
                e.stopPropagation();
                toggleConfig("showDate");
              }}>
                  {new Date(show.show_date).toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  year: "numeric"
                })}
                </p>}

              {/* (Legacy detailed ratings removed) */}

              {/* Notes - centered, smaller */}
              {overlayConfig.showNotes && show.notes && <p className="text-[10px] italic opacity-80 line-clamp-2 mb-2 cursor-pointer transition-opacity hover:opacity-70" onClick={e => {
                e.stopPropagation();
                toggleConfig("showNotes");
              }}>
                  "{show.notes}"
                </p>}
              
              {/* Footer - rank and logo - centered */}
              <div className="mt-2 text-[10px] flex flex-col items-center gap-0.5">
                {overlayConfig.showRank && rankData.total > 0 ? <span 
                  className="text-[15px] font-semibold text-white cursor-pointer transition-opacity hover:opacity-70"
                  style={{
                    textShadow: "0 0 8px rgba(255,255,255,0.6), 0 0 16px rgba(255,255,255,0.3)"
                  }}
                  onClick={e => {
                    e.stopPropagation();
                    toggleConfig("showRank");
                  }}>
                    #{rankData.position} {rankingTimeFilter === 'this-year' ? 'This Year' : rankingTimeFilter === 'last-year' ? 'Last Year' : 'All Time'}
                  </span> : null}
                <span className="font-black tracking-[0.25em] text-white/75 uppercase" style={{
                  textShadow: "0 0 8px rgba(255,255,255,0.5), 0 0 20px rgba(255,255,255,0.2)"
                }}>
                  SCENE ✦
                </span>
              </div>
            </div>
            </div>{/* Close photo wrapper */}
            
            {/* Vertical Opacity Slider - inside image on right edge, hidden in preview mode */}
            {!isPreviewMode && <div data-export-hide className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5" onClick={e => e.stopPropagation()} onTouchStart={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()} onTouchEnd={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()} onMouseMove={e => e.stopPropagation()} onMouseUp={e => e.stopPropagation()}>
                <SunDim className="h-3.5 w-3.5 text-white/60" />
                <div className="relative h-20 w-4 flex items-center justify-center">
                  <input type="range" min={0} max={100} step={5} value={overlayOpacity} onChange={e => setOverlayOpacity(Number(e.target.value))} className="absolute h-1 w-16 cursor-pointer origin-center" style={{
                transform: 'rotate(-90deg)',
                WebkitAppearance: 'none',
                appearance: 'none',
                background: `linear-gradient(to right, rgba(255,255,255,0.9) ${overlayOpacity}%, rgba(255,255,255,0.2) ${overlayOpacity}%)`,
                borderRadius: '4px'
              }} />
                </div>
              </div>}
            
            {/* Exit preview mode button - inside container */}
            {isPreviewMode && <button onClick={() => setIsPreviewMode(false)} className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/70 backdrop-blur-md px-4 py-2 rounded-full border border-white/10 text-white/80 hover:text-white transition-colors">
                <EyeOff className="h-4 w-4" />
                <span className="text-sm">Exit Preview</span>
              </button>}
          </div>
          
          {/* Floating Toolbar - Color-coded with separators */}
          {!isPreviewMode && <div className="flex items-center justify-center gap-1 mt-3">
              <div className="flex items-center gap-0.5 bg-card/80 backdrop-blur-md px-2 py-1.5 rounded-full border border-border/50 relative">
                {/* Content group - cyan */}
                {toggleItems.filter(i => i.group === "content").map(item => <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <button onClick={e => {
                  e.stopPropagation();
                  toggleConfig(item.key);
                }} disabled={item.disabled} className={getToggleStyle(item)}>
                        <item.icon className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>)}
                
                <div className="w-px h-3 bg-border/50 mx-1" />
                
                {/* Ratings group - amber */}
                {toggleItems.filter(i => i.group === "ratings").map(item => <Tooltip key={item.key}>
                    <TooltipTrigger asChild>
                      <button onClick={e => {
                  e.stopPropagation();
                  toggleConfig(item.key);
                }} disabled={item.disabled} className={getToggleStyle(item)}>
                        <item.icon className="h-3.5 w-3.5" />
                      </button>
                    </TooltipTrigger>
                    <TooltipContent side="top" className="text-xs">
                      {item.label}
                    </TooltipContent>
                  </Tooltip>)}
                
                <div className="w-px h-3 bg-border/50 mx-1" />
                
                {/* Meta group - purple (rank with options) */}
                {toggleItems.filter(i => i.group === "meta").map(item => <div key={item.key} className="relative">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button onClick={e => {
                    e.stopPropagation();
                    if (item.key === "showRank") {
                      if (showAgeCategory === "older") {
                        // Old shows: just toggle rank on/off, no popup
                        toggleConfig("showRank");
                        setRankingTimeFilter("all-time"); // Force all-time for old shows
                      } else {
                        // Recent shows: show popup
                        if (!overlayConfig.showRank) {
                          toggleConfig("showRank");
                        }
                        setShowRankOptions(!showRankOptions);
                      }
                    } else {
                      toggleConfig(item.key);
                    }
                  }} disabled={item.disabled} className={getToggleStyle(item)}>
                          <item.icon className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="text-xs">
                        {item.label}
                      </TooltipContent>
                    </Tooltip>
                    
                    {/* Rank options - context-aware based on show date, positioned above this icon */}
                    {item.key === "showRank" && showRankOptions && overlayConfig.showRank && showAgeCategory !== "older" && <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 flex items-center gap-0.5 p-1 rounded-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-xl" onClick={e => e.stopPropagation()}>
                        <button onClick={() => {
                  setRankingTimeFilter("all-time");
                  setShowRankOptions(false);
                }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${rankingTimeFilter === "all-time" ? "bg-white/20 text-white shadow-sm" : "text-white/60 hover:text-white/80"}`}>
                          All Time
                        </button>
                        <button onClick={() => {
                  setRankingTimeFilter(showAgeCategory === "this-year" ? "this-year" : "last-year");
                  setShowRankOptions(false);
                }} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${showAgeCategory === "this-year" && rankingTimeFilter === "this-year" || showAgeCategory === "last-year" && rankingTimeFilter === "last-year" ? "bg-white/20 text-white shadow-sm" : "text-white/60 hover:text-white/80"}`}>
                          {showAgeCategory === "this-year" ? "This Year" : "Last Year"}
                        </button>
                      </div>}
                  </div>)}
                
                <div className="w-px h-3 bg-border/30 mx-1" />
                
                {/* Utilities - muted */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={e => {
                  e.stopPropagation();
                  handleReset();
                }} className="p-1.5 rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-all">
                      <RotateCcw className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Reset
                  </TooltipContent>
                </Tooltip>
                
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button onClick={e => {
                  e.stopPropagation();
                  setIsPreviewMode(true);
                  setShowRankOptions(false);
                }} className="p-1.5 rounded-full text-muted-foreground/50 hover:text-muted-foreground hover:bg-muted/50 transition-all">
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="text-xs">
                    Preview
                  </TooltipContent>
                </Tooltip>
              </div>
              
              {/* Aspect ratio pill - separate element */}
              <button onClick={() => setAspectMode(aspectMode === "story" ? "native" : "story")} className="text-[10px] bg-muted/50 px-2 py-1 rounded-full text-muted-foreground hover:text-foreground transition-colors">
                {aspectMode === "story" ? "9:16" : "1:1"}
              </button>
            </div>}
        </div>
        
        {/* Bottom controls - fixed height */}
        <div className="flex-shrink-0 pt-3 space-y-3 px-1">
          {/* Instagram Hero Button */}
          <Button onClick={handleShareToInstagram} disabled={isGenerating} className="w-full h-12 text-base font-semibold bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 hover:from-pink-600 hover:via-purple-600 hover:to-indigo-600 border-0 shadow-lg shadow-purple-500/25">
            <Instagram className="mr-2 h-5 w-5" />
            {isGenerating ? "Generating..." : "Share to Instagram"}
          </Button>
          
          {/* Secondary actions - compact row */}
          <div className="flex gap-2">
            <Button onClick={handleShareWithFriends} disabled={isGenerating} variant="secondary" className="flex-1 h-10">
              <MessageCircle className="mr-2 h-4 w-4" />
              Send
            </Button>
            <Button onClick={handleDownloadImage} disabled={isGenerating} variant="ghost" className="flex-1 h-10">
              <Download className="mr-2 h-4 w-4" />
              Save
            </Button>
          </div>
          
          {/* Referral link */}
          <Button 
            onClick={handleCopyReferralLink} 
            variant="outline" 
            className="w-full h-9 text-sm text-muted-foreground hover:text-foreground"
          >
            <Link2 className="mr-2 h-4 w-4" />
            Copy Invite Link
          </Button>
        </div>
      </div>
    </TooltipProvider>;
};