import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Upload, Instagram, Mic2, Volume2, Lightbulb, Users, Sparkles, Send, Pencil, Trash2, Download } from "lucide-react";
import { parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { calculateShowScore } from "@/lib/utils";
import { ShareShowSheet } from "./ShareShowSheet";
import { cn } from "@/lib/utils";
import { HeroPhotoSection } from "./show-review/HeroPhotoSection";
import { CompactRatingBar } from "./show-review/CompactRatingBar";
import { NotesQuoteCard } from "./show-review/NotesQuoteCard";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  onDelete?: (showId: string) => void;
  onNavigateToRank?: () => void;
  allShows?: Show[];
  rankings?: ShowRanking[];
}

export const ShowReviewSheet = ({ 
  show, 
  open, 
  onOpenChange, 
  onEdit, 
  onShareToEditor,
  onDelete,
  onNavigateToRank,
  allShows = [], 
  rankings = [] 
}: ShowReviewSheetProps) => {
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [shareSheetOpen, setShareSheetOpen] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fix: Sync photoUrl state when show changes
  useEffect(() => {
    setPhotoUrl(show?.photo_url || null);
  }, [show?.id, show?.photo_url]);

  if (!show) return null;

  const score = calculateShowScore(
    show.rating,
    show.artistPerformance,
    show.sound,
    show.lighting,
    show.crowd,
    show.venueVibe
  );

  const hasDetailedRatings = show.artistPerformance || show.sound || show.lighting || show.crowd || show.venueVibe;

  // Calculate rank data
  const calculateRankData = () => {
    if (allShows.length === 0) {
      return { position: 0, total: 0, comparisons: 0 };
    }

    // Use ELO-based ranking
    const filteredRankings = rankings.filter(r => allShows.some(s => s.id === r.show_id));
    const sorted = [...filteredRankings].sort((a, b) => b.elo_score - a.elo_score);
    const position = sorted.findIndex(r => r.show_id === show.id) + 1;
    const currentRanking = sorted.find(r => r.show_id === show.id);

    return { 
      position, 
      total: allShows.length, 
      comparisons: currentRanking?.comparisons_count || 0 
    };
  };

  const rankData = calculateRankData();

  // Image compression utility
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

          let width = img.width;
          let height = img.height;
          const maxWidth = 2000;

          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }

          canvas.width = width;
          canvas.height = height;
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (!blob) {
                reject(new Error('Compression failed'));
                return;
              }

              if (blob.size > 2 * 1024 * 1024) {
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

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>, retryCount = 0) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, or WEBP image", variant: "destructive" });
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 10MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const compressedFile = await compressImage(file);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${show.id}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('show-photos')
        .upload(filePath, compressedFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('show-photos')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('shows')
        .update({ photo_url: publicUrl })
        .eq('id', show.id);

      if (updateError) throw updateError;

      setPhotoUrl(publicUrl);
      toast({ title: "Photo uploaded", description: "Your show photo has been saved" });
    } catch (error) {
      console.error('Photo upload error:', error);
      if (retryCount < 2) {
        toast({ title: "Upload failed, retrying...", description: `Attempt ${retryCount + 2} of 3` });
        setTimeout(() => handlePhotoUpload(e, retryCount + 1), 1000);
      } else {
        toast({ title: "Upload failed", description: "Failed to upload photo after 3 attempts.", variant: "destructive" });
      }
    } finally {
      setUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      if (photoUrl) {
        const filePath = photoUrl.split('/show-photos/')[1];
        await supabase.storage.from('show-photos').remove([filePath]);
      }

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

  const handleShareClick = () => {
    if (onShareToEditor && photoUrl) {
      onOpenChange(false);
      onShareToEditor(show);
    } else {
      onOpenChange(false);
      setShareSheetOpen(true);
    }
  };

  const handleSendToFriends = async () => {
    const headliner = show.artists.find(a => a.isHeadliner) || show.artists[0];
    const shareText = `Check out this show: ${headliner?.name} at ${show.venue.name}!`;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${headliner?.name} at ${show.venue.name}`,
          text: shareText,
        });
      } catch (err) {
        if ((err as Error).name !== 'AbortError') {
          toast({ title: "Share failed", variant: "destructive" });
        }
      }
    } else {
      await navigator.clipboard.writeText(shareText);
      toast({ title: "Copied to clipboard", description: shareText });
    }
  };

  const handleDeleteConfirm = () => {
    if (onDelete) {
      onDelete(show.id);
      onOpenChange(false);
    }
    setShowDeleteConfirm(false);
  };

  const handleRankThisShow = () => {
    onOpenChange(false);
    onNavigateToRank?.();
  };

  const handleDownloadImage = async () => {
    if (photoUrl) {
      // If photo exists, download it directly
      try {
        const response = await fetch(photoUrl);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${headliner?.name}-${show.venue.name}.jpg`;
        a.click();
        URL.revokeObjectURL(url);
        toast({ title: "Image saved", description: "Photo downloaded to your device" });
      } catch (error) {
        toast({ title: "Download failed", description: "Could not save the image", variant: "destructive" });
      }
    } else {
      // No photo - create a simple card image
      const canvas = document.createElement('canvas');
      canvas.width = 1080;
      canvas.height = 1920;
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        toast({ title: "Download failed", variant: "destructive" });
        return;
      }

      // Draw gradient background
      const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
      gradient.addColorStop(0, '#1a1a2e');
      gradient.addColorStop(1, '#16213e');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw show info
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px system-ui, -apple-system, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(headliner?.name || '', canvas.width / 2, canvas.height / 2 - 100);
      
      ctx.font = '48px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.fillText(show.venue.name, canvas.width / 2, canvas.height / 2);
      
      ctx.font = '36px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
      const formattedDate = new Date(show.date).toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: 'numeric' 
      });
      ctx.fillText(formattedDate, canvas.width / 2, canvas.height / 2 + 80);

      // Draw score
      ctx.font = 'bold 120px system-ui, -apple-system, sans-serif';
      ctx.fillStyle = '#ffffff';
      ctx.fillText(score.toFixed(1), canvas.width / 2, canvas.height / 2 + 300);

      // Download
      canvas.toBlob((blob) => {
        if (blob) {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${headliner?.name}-${show.venue.name}.png`;
          a.click();
          URL.revokeObjectURL(url);
          toast({ title: "Image saved", description: "Show card downloaded to your device" });
        }
      }, 'image/png');
    }
  };

  const headliner = show.artists.find(a => a.isHeadliner) || show.artists[0];

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent side="bottom" className="h-[90vh] overflow-y-auto bg-background/95 backdrop-blur-xl">
          <div className="space-y-6 pt-4">
            {/* Hero Photo Section */}
            <HeroPhotoSection
              photoUrl={photoUrl}
              uploading={uploading}
              score={score}
              artists={show.artists}
              venue={show.venue}
              date={show.date}
              rankPosition={rankData.position}
              rankTotal={rankData.total}
              comparisonsCount={rankData.comparisons}
              onPhotoUpload={handlePhotoUpload}
              fileInputRef={fileInputRef}
              onChangePhoto={() => fileInputRef.current?.click()}
              onRankThisShow={onNavigateToRank ? handleRankThisShow : undefined}
            />

            {/* Compact Ratings */}
            {hasDetailedRatings && (
              <div 
                className={cn(
                  "rounded-xl p-4 space-y-3",
                  "bg-white/[0.03] backdrop-blur-sm",
                  "border border-white/[0.08]"
                )}
              >
                <CompactRatingBar 
                  icon={<Mic2 className="h-4 w-4" />} 
                  label="Show" 
                  value={show.artistPerformance} 
                />
                <CompactRatingBar 
                  icon={<Volume2 className="h-4 w-4" />} 
                  label="Sound" 
                  value={show.sound} 
                />
                <CompactRatingBar 
                  icon={<Lightbulb className="h-4 w-4" />} 
                  label="Lighting" 
                  value={show.lighting} 
                />
                <CompactRatingBar 
                  icon={<Users className="h-4 w-4" />} 
                  label="Crowd" 
                  value={show.crowd} 
                />
                <CompactRatingBar 
                  icon={<Sparkles className="h-4 w-4" />} 
                  label="Vibe" 
                  value={show.venueVibe} 
                />
              </div>
            )}

            {/* Notes Quote Card */}
            <NotesQuoteCard notes={show.notes} />

            {/* Primary CTA: Share to Instagram */}
            <Button
              onClick={handleShareClick}
              className={cn(
                "w-full py-6 rounded-xl font-semibold text-base",
                "bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500",
                "shadow-lg shadow-purple-500/30",
                "hover:shadow-purple-500/50 hover:scale-[1.02] transition-all duration-200",
                "border-0"
              )}
            >
              <Instagram className="h-5 w-5 mr-2" />
              Share to Instagram
            </Button>

            {/* Secondary Actions - Always visible */}
            <div className="flex gap-2 justify-center flex-wrap">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSendToFriends}
                className="text-white/50 hover:text-white hover:bg-white/10"
              >
                <Send className="h-4 w-4 mr-2" />
                Send
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDownloadImage}
                className="text-white/50 hover:text-white hover:bg-white/10"
              >
                <Download className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  onOpenChange(false);
                  onEdit(show);
                }}
                className="text-white/50 hover:text-white hover:bg-white/10"
              >
                <Pencil className="h-4 w-4 mr-2" />
                Edit Review
              </Button>
              {onDelete && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-red-400/70 hover:text-red-400 hover:bg-red-500/10"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>

            {/* Hidden file input for photo changes */}
            <Input
              ref={fileInputRef}
              type="file"
              accept=".jpg,.jpeg,.png,.webp"
              className="hidden"
              onChange={handlePhotoUpload}
            />
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this show?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{headliner?.name}</strong> at {show.venue.name}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Separate ShareShowSheet for fallback sharing */}
      <ShareShowSheet
        show={show}
        open={shareSheetOpen}
        onOpenChange={setShareSheetOpen}
        allShows={allShows}
        rankings={rankings}
      />
    </>
  );
};
