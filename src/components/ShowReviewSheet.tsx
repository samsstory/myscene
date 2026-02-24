import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Instagram, Send, Trash2, Share2 } from "lucide-react";
import { parseISO, format } from "date-fns";
import { formatShowDate } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useRef, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { useShareShow } from "@/hooks/useShareShow";

import { cn } from "@/lib/utils";
import { HeroPhotoSection } from "./show-review/HeroPhotoSection";
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

import type { Show, ShowRanking } from "@/types/show";

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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { shareShow, shareFestivalInvite } = useShareShow();

  // Fix: Sync photoUrl state when show changes
  useEffect(() => {
    setPhotoUrl(show?.photo_url || null);
  }, [show?.id, show?.photo_url]);

  if (!show) return null;

  const hasTags = show.tags && show.tags.length > 0;

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
    if (onShareToEditor) {
      onOpenChange(false);
      onShareToEditor(show);
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

  const handleEditShow = () => {
    onOpenChange(false);
    onEdit(show);
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
      ctx.fillText('★', canvas.width / 2, canvas.height / 2 + 300);

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
        <SheetContent
          side="bottom"
          className="h-[92dvh] rounded-t-3xl border-t border-white/[0.08] bg-background/95 backdrop-blur-2xl p-0 overflow-hidden"
        >
          {/* Ambient background bleed from photo */}
          {photoUrl && (
            <>
              <img
                src={photoUrl}
                alt=""
                aria-hidden
                className="absolute inset-0 w-full h-full object-cover scale-110 pointer-events-none"
                style={{ filter: "blur(60px)", opacity: 0.06 }}
              />
              <div className="absolute inset-0 bg-gradient-to-b from-background/70 to-background pointer-events-none" />
            </>
          )}

          <div className="relative z-10 h-full overflow-y-auto overscroll-contain">
            {/* Drag handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-[3px] rounded-full bg-white/20" />
            </div>

            <div className="px-5 pb-10 pt-2 space-y-5">
              {/* Hero Photo Section */}
              <HeroPhotoSection
                photoUrl={photoUrl}
                uploading={uploading}
                artists={show.artists}
                venue={show.venue}
                date={show.date}
                datePrecision={show.datePrecision}
                rankPosition={rankData.position}
                rankTotal={rankData.total}
                comparisonsCount={rankData.comparisons}
                onPhotoUpload={handlePhotoUpload}
                fileInputRef={fileInputRef}
                onEditShow={handleEditShow}
                onRankThisShow={onNavigateToRank ? handleRankThisShow : undefined}
              />

              {/* Highlights / Tags */}
              {hasTags && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 space-y-3">
                  <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/30">
                    Highlights
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {show.tags!.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1.5 rounded-full text-[11px] font-medium bg-primary/10 border border-primary/25 text-primary/80 backdrop-blur-sm"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Notes Quote Card */}
              <NotesQuoteCard notes={show.notes} />

              {/* Divider */}
              <div className="border-t border-white/[0.06]" />

              {/* Primary CTA */}
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full h-12 rounded-xl font-semibold text-base bg-gradient-to-r from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:scale-[1.02] active:scale-[0.98] transition-all duration-200 border-0"
              >
                Done
              </Button>

              {/* Secondary actions row */}
              <div className="flex gap-2">
                <Button
                  onClick={handleShareClick}
                  data-tour="share-instagram"
                  variant="ghost"
                  className="flex-1 h-11 rounded-xl font-medium text-sm bg-white/[0.04] border border-white/[0.08] text-foreground/60 hover:text-foreground hover:bg-white/[0.08] transition-all"
                >
                  <Instagram className="h-4 w-4 mr-2" />
                  Share
                </Button>

                <Button
                  variant="ghost"
                  className="flex-1 h-11 rounded-xl font-medium text-sm bg-white/[0.04] border border-white/[0.08] text-foreground/60 hover:text-foreground hover:bg-white/[0.08] transition-all"
                  onClick={() => {
                    onOpenChange(false);
                    setTimeout(() => shareShow({ showId: show.id, type: "logged", artistName: show.artists?.[0]?.name ?? "", venueName: show.venue?.name ?? undefined }), 300);
                  }}
                >
                  <Send className="h-4 w-4 mr-2" />
                  Invite to Compare
                </Button>
              </div>

              {/* Share Festival Invite — only for festival-type shows */}
              {show.showType === "festival" && (show.eventName || show.venue?.name) && (
                <Button
                  variant="ghost"
                  className="w-full h-11 rounded-xl font-medium text-sm bg-white/[0.04] border border-white/[0.08] text-foreground/60 hover:text-foreground hover:bg-white/[0.08] transition-all"
                  onClick={() => shareFestivalInvite({ showId: show.id, eventName: show.eventName || show.venue?.name || "", showDate: show.date })}
                >
                  <Share2 className="h-4 w-4 mr-2" />
                  Share Festival Invite
                </Button>
              )}

              {onDelete && (
                <div className="flex justify-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowDeleteConfirm(true)}
                    className="text-red-400/40 hover:text-red-400 hover:bg-red-500/10 transition-all rounded-xl px-4 h-9 text-xs"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                    Delete show
                  </Button>
                </div>
              )}

              {/* Added to Scene timestamp */}
              <p className="text-center text-foreground/25 text-[11px]">
                Added to Scene on {formatShowDate(show.date, show.datePrecision)}
              </p>
            </div>
          </div>

          {/* Hidden file input for photo changes */}
          <Input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp"
            className="hidden"
            onChange={handlePhotoUpload}
          />
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

    </>
  );
};
