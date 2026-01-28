import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Edit, MapPin, Calendar as CalendarIcon, Music2, Upload, X, Image as ImageIcon, ChevronDown, Instagram } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { calculateShowScore, getScoreGradient } from "@/lib/utils";
import { ShareShowSheet } from "./ShareShowSheet";

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
  datePrecision?: string;
  artistPerformance?: number | null;
  sound?: number | null;
  lighting?: number | null;
  crowd?: number | null;
  venueVibe?: number | null;
  notes?: string | null;
  venueId?: string | null;
  photo_url?: string | null;
}

interface ShowRanking {
  show_id: string;
  elo_score: number;
  comparisons_count: number;
}

interface ShowReviewSheetProps {
  show: Show | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (show: Show) => void;
  onShareToEditor?: (show: Show) => void;
  allShows?: Show[];
  rankings?: ShowRanking[];
}

const getRatingLabel = (rating: number) => {
  const labels = ["Terrible", "Bad", "Okay", "Great", "Amazing"];
  return labels[rating - 1] || "Not rated";
};

const RatingBar = ({ label, value }: { label: string; value: number | null | undefined }) => {
  if (!value) return null;
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{getRatingLabel(value)}</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-primary to-primary-glow transition-all"
          style={{ width: `${(value / 5) * 100}%` }}
        />
      </div>
    </div>
  );
};

export const ShowReviewSheet = ({ show, open, onOpenChange, onEdit, onShareToEditor, allShows = [], rankings = [] }: ShowReviewSheetProps) => {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(show?.photo_url || null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [showRankingOpen, setShowRankingOpen] = useState(false);
  const [rankingMethod, setRankingMethod] = useState<"score" | "elo">("score");
  const [rankingTimeFilter, setRankingTimeFilter] = useState<"all-time" | "this-year" | "this-month">("all-time");
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  if (!show) return null;

  const hasDetailedRatings = show.artistPerformance || show.sound || show.lighting || show.crowd || show.venueVibe;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, retryCount = 0) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, or WEBP image", variant: "destructive" });
      return;
    }

    // Validate file size (10MB initial limit)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 10MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      // Compress and resize image
      const compressedFile = await compressImage(file);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${show.id}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('show-photos')
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('show-photos')
        .getPublicUrl(filePath);

      // Update show record
      const { error: updateError } = await supabase
        .from('shows')
        .update({ photo_url: publicUrl })
        .eq('id', show.id);

      if (updateError) throw updateError;

      setPhotoUrl(publicUrl);
      toast({ title: "Photo uploaded", description: "Your show photo has been saved" });
    } catch (error) {
      console.error('Photo upload error:', error);
      
      // Retry logic (max 3 attempts)
      if (retryCount < 2) {
        toast({ 
          title: "Upload failed, retrying...", 
          description: `Attempt ${retryCount + 2} of 3`,
        });
        setTimeout(() => handlePhotoUpload(e, retryCount + 1), 1000);
      } else {
        toast({ 
          title: "Upload failed", 
          description: "Failed to upload photo after 3 attempts. Please try again later.", 
          variant: "destructive" 
        });
      }
    } finally {
      setUploading(false);
    }
  };

  // Image compression and resizing utility
  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            reject(new Error('Canvas not supported'));
            return;
          }

          // Calculate new dimensions (max 2000px width)
          let width = img.width;
          let height = img.height;
          const maxWidth = 2000;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;

          // Draw and compress
          ctx.drawImage(img, 0, 0, width, height);
          
          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Compression failed'));
                return;
              }
              
              // Check if compressed size is under 2MB
              if (blob.size > 2 * 1024 * 1024) {
                // Further compress with lower quality
                canvas.toBlob(
                  (smallerBlob) => {
                    if (!smallerBlob) {
                      reject(new Error('Compression failed'));
                      return;
                    }
                    resolve(new File([smallerBlob], file.name, { type: 'image/jpeg' }));
                  },
                  'image/jpeg',
                  0.7
                );
              } else {
                resolve(new File([blob], file.name, { type: 'image/jpeg' }));
              }
            },
            'image/jpeg',
            0.85
          );
        };
        img.onerror = () => reject(new Error('Failed to load image'));
      };
      reader.onerror = () => reject(new Error('Failed to read file'));
    });
  };

  const handleRemovePhoto = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Delete from storage
      if (photoUrl) {
        const filePath = photoUrl.split('/show-photos/')[1];
        await supabase.storage.from('show-photos').remove([filePath]);
      }

      // Update show record
      const { error } = await supabase
        .from('shows')
        .update({ photo_url: null })
        .eq('id', show.id);

      if (error) throw error;

      setPhotoUrl(null);
      toast({ title: "Photo removed", description: "Your show photo has been deleted" });
    } catch (error) {
      console.error('Photo removal error:', error);
      toast({ title: "Removal failed", description: "Failed to remove photo", variant: "destructive" });
    }
  };

  const score = calculateShowScore(
    show.rating,
    show.artistPerformance,
    show.sound,
    show.lighting,
    show.crowd,
    show.venueVibe
  );

  // Helper: Filter shows by time period
  const filterShowsByTime = (shows: Show[], timeFilter: string) => {
    if (timeFilter === "all-time") return shows;
    
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    
    return shows.filter(s => {
      const showDate = parseISO(s.date);
      
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
        const scoreA = calculateShowScore(a.rating, a.artistPerformance, a.sound, a.lighting, a.crowd, a.venueVibe);
        const scoreB = calculateShowScore(b.rating, b.artistPerformance, b.sound, b.lighting, b.crowd, b.venueVibe);
        if (scoreB !== scoreA) return scoreB - scoreA;
        return new Date(b.date).getTime() - new Date(a.date).getTime();
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
      const currentRanking = sorted.find(r => r.show_id === show.id);
      
      return { position, total, percentile, elo: currentRanking?.elo_score, comparisons: currentRanking?.comparisons_count };
    }
  };

  const rankData = calculateRankData();
  
  // Determine gradient based on percentile
  const getRankGradient = (percentile: number) => {
    if (percentile >= 90) return "from-[hsl(45,93%,58%)] to-[hsl(189,94%,55%)]"; // Gold
    if (percentile >= 75) return "from-[hsl(189,94%,55%)] to-[hsl(260,80%,60%)]"; // Blue
    if (percentile >= 50) return "from-[hsl(260,80%,60%)] to-[hsl(330,85%,65%)]"; // Purple
    return "from-[hsl(330,85%,65%)] to-[hsl(0,84%,60%)]"; // Pink/Red
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-4">
            <SheetTitle className="text-left">Show Review</SheetTitle>
            <Button
              size="sm"
              onClick={() => {
                onEdit(show);
                onOpenChange(false);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Photo Section */}
          {photoUrl && (
            <div className="space-y-3">
              <div className="relative rounded-xl overflow-hidden aspect-video">
                <img 
                  src={photoUrl} 
                  alt="Show photo" 
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="default"
                  className="flex-1"
                  onClick={() => {
                    if (onShareToEditor) {
                      onOpenChange(false);
                      onShareToEditor(show);
                    } else {
                      onOpenChange(false);
                      setShareSheetOpen(true);
                    }
                  }}
                >
                  <Instagram className="h-4 w-4 mr-2" />
                  Share to Instagram
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Change
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleRemovePhoto}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          )}

          {!photoUrl && (
            <Button
              variant="outline"
              className="w-full h-32 border-dashed"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
            >
              <div className="flex flex-col items-center gap-2">
                <ImageIcon className="h-8 w-8 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {uploading ? "Uploading..." : "Add Photo"}
                </span>
              </div>
            </Button>
          )}
          
          <Input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handlePhotoUpload}
          />

          {/* Overall Rating */}
          <div className="text-center space-y-2">
            <div className={`text-7xl font-black bg-gradient-to-r ${getScoreGradient(calculateShowScore(show.rating, show.artistPerformance, show.sound, show.lighting, show.crowd, show.venueVibe))} bg-clip-text text-transparent`}>
              {calculateShowScore(show.rating, show.artistPerformance, show.sound, show.lighting, show.crowd, show.venueVibe).toFixed(1)}
            </div>
            <div className="text-2xl font-bold text-muted-foreground">/10</div>
          </div>

          <Separator />

          {/* Show Ranking Section */}
          {allShows.length > 0 && (
            <>
              <Collapsible open={showRankingOpen} onOpenChange={setShowRankingOpen}>
                <CollapsibleTrigger className="flex items-center justify-between w-full py-2 hover:opacity-80 transition-opacity">
                  <h3 className="font-semibold text-lg">Show Ranking</h3>
                  <ChevronDown className={`h-5 w-5 transition-transform ${showRankingOpen ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                
                <CollapsibleContent className="space-y-4 pt-4">
                  {/* Method Toggle */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Ranking Method</p>
                    <ToggleGroup type="single" value={rankingMethod} onValueChange={(v) => v && setRankingMethod(v as "score" | "elo")} className="justify-start">
                      <ToggleGroupItem value="score" className="flex-1">By Score</ToggleGroupItem>
                      <ToggleGroupItem value="elo" className="flex-1">Head to Head</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  
                  {/* Time Filter */}
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">Time Period</p>
                    <ToggleGroup 
                      type="single" 
                      value={rankingTimeFilter} 
                      onValueChange={(v) => v && setRankingTimeFilter(v as typeof rankingTimeFilter)}
                      className="justify-start"
                    >
                      <ToggleGroupItem value="all-time" className="flex-1">All Time</ToggleGroupItem>
                      <ToggleGroupItem value="this-year" className="flex-1">This Year</ToggleGroupItem>
                      <ToggleGroupItem value="this-month" className="flex-1">This Month</ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                  
                  {/* Rank Display */}
                  {rankData.position > 0 ? (
                    <div className="text-center space-y-3 py-4">
                      <div className={`text-6xl font-black bg-gradient-to-r ${getRankGradient(rankData.percentile)} bg-clip-text text-transparent`}>
                        #{rankData.position}
                      </div>
                      <div className="text-muted-foreground text-lg">
                        of {rankData.total} show{rankData.total !== 1 ? 's' : ''}
                      </div>
                      <div className="text-sm font-semibold text-primary">
                        Top {Math.round(rankData.percentile)}%
                      </div>
                      
                      {/* Visual Progress Bar */}
                      <div className="w-full max-w-xs mx-auto mt-4">
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div 
                            className={`h-full bg-gradient-to-r ${getRankGradient(rankData.percentile)} transition-all duration-500`}
                            style={{ width: `${rankData.percentile}%` }}
                          />
                        </div>
                      </div>

                      {/* ELO details */}
                      {rankingMethod === "elo" && rankData.elo !== undefined && (
                        <div className="text-sm text-muted-foreground mt-2">
                          ELO: {Math.round(rankData.elo)} • {rankData.comparisons || 0} comparison{rankData.comparisons !== 1 ? 's' : ''}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      {rankingMethod === "elo" 
                        ? "No ranking data yet. Start comparing shows in the Rank tab!"
                        : "No shows found for this time period"}
                    </div>
                  )}
                </CollapsibleContent>
              </Collapsible>
              
              <Separator />
            </>
          )}

          {/* Show Details */}
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Music2 className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-sm text-muted-foreground mb-1">Artists</div>
                <div className="flex flex-wrap gap-2">
                  {show.artists.map((artist, idx) => (
                    <span key={idx} className="text-lg font-bold">
                      {artist.name}
                      {idx < show.artists.length - 1 && <span className="mx-1">•</span>}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-sm text-muted-foreground mb-1">Venue</div>
                <div className="text-lg">{show.venue.name}</div>
                {show.venue.location && (
                  <div className="text-sm text-muted-foreground">{show.venue.location}</div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3">
              <CalendarIcon className="h-5 w-5 text-primary mt-1 flex-shrink-0" />
              <div>
                <div className="font-semibold text-sm text-muted-foreground mb-1">Date</div>
                <div className="text-lg">{format(parseISO(show.date), "MMMM d, yyyy")}</div>
              </div>
            </div>
          </div>

          {/* Detailed Ratings */}
          {hasDetailedRatings && (
            <>
              <Separator />
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Detailed Ratings</h3>
                <div className="space-y-3">
                  <RatingBar label="Artist Performance" value={show.artistPerformance} />
                  <RatingBar label="Sound Quality" value={show.sound} />
                  <RatingBar label="Lighting" value={show.lighting} />
                  <RatingBar label="Crowd Energy" value={show.crowd} />
                  <RatingBar label="Venue Vibe" value={show.venueVibe} />
                </div>
              </div>
            </>
          )}

          {/* Notes */}
          {show.notes && (
            <>
              <Separator />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg">My Take</h3>
                <p className="text-muted-foreground whitespace-pre-wrap">{show.notes}</p>
              </div>
            </>
          )}
        </div>
      </SheetContent>

      {/* Separate ShareShowSheet for photo sharing */}
      <ShareShowSheet 
        show={show} 
        open={shareSheetOpen} 
        onOpenChange={setShareSheetOpen}
        allShows={allShows}
        rankings={rankings}
      />
    </Sheet>
  );
};
