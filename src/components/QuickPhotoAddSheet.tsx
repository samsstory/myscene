import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Camera, Check, ChevronRight } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

import type { Show } from "@/types/show";

interface QuickPhotoAddSheetProps {
  show: Show | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoAdded: (photoUrl: string) => void;
  onShareWithoutPhoto: () => void;
}

export const QuickPhotoAddSheet = ({
  show,
  open,
  onOpenChange,
  onPhotoAdded,
  onShareWithoutPhoto,
}: QuickPhotoAddSheetProps) => {
  const [uploading, setUploading] = useState(false);
  const [settingArtistPhoto, setSettingArtistPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!show) return null;

  const headliner = show.artists.find(a => a.isHeadliner) || show.artists[0];
  const artistName = headliner?.name || "Unknown Artist";
  const artistImageUrl = headliner?.imageUrl;
  
  const formattedDate = format(
    parseISO(show.date),
    parseISO(show.date).getFullYear() === new Date().getFullYear() ? "MMM d" : "MMM d, yyyy"
  );

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("Please sign in to upload photos");
        return;
      }

      const fileExt = file.name.split('.').pop();
      const fileName = `${show.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('show-photos')
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('show-photos')
        .getPublicUrl(filePath);

      // Update show with photo URL
      const { error: updateError } = await supabase
        .from('shows')
        .update({ photo_url: publicUrl })
        .eq('id', show.id);

      if (updateError) throw updateError;

      toast.success("Photo added!");
      onPhotoAdded(publicUrl);
    } catch (error) {
      console.error('Error uploading photo:', error);
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUseArtistPhoto = async () => {
    if (!artistImageUrl) return;
    setSettingArtistPhoto(true);
    try {
      const { error } = await supabase
        .from('shows')
        .update({ photo_url: artistImageUrl })
        .eq('id', show.id);

      if (error) throw error;

      toast.success("Artist photo added!");
      onPhotoAdded(artistImageUrl);
    } catch (error) {
      console.error('Error setting artist photo:', error);
      toast.error("Failed to set artist photo");
    } finally {
      setSettingArtistPhoto(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-auto max-h-[80vh] flex flex-col">
        <SheetHeader className="flex-shrink-0 text-left">
          <SheetTitle className="text-xl font-bold">{artistName}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {show.venue.name} · {formattedDate}
          </p>
        </SheetHeader>

        <div className="flex-1 flex flex-col items-center justify-center gap-4 py-6 overflow-y-auto min-h-0">
          {/* Upload zone - compact size */}
          <button
            onClick={handleUploadClick}
            disabled={uploading}
            className="w-full max-w-xs aspect-square rounded-2xl border-2 border-dashed border-white/20 bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/30 transition-all flex flex-col items-center justify-center gap-3 disabled:opacity-50"
          >
            {uploading ? (
              <>
                <div className="h-12 w-12 rounded-full border-4 border-white/20 border-t-primary animate-spin" />
                <span className="text-white/60 text-sm">Uploading...</span>
              </>
            ) : (
              <>
                <div className="h-14 w-14 rounded-full bg-white/10 flex items-center justify-center">
                  <Camera className="h-7 w-7 text-white/60" />
                </div>
                <div className="text-center space-y-0.5">
                  <p className="text-white/80 font-medium">Add a photo</p>
                  <p className="text-white/40 text-sm">Tap to upload from camera roll</p>
                </div>
              </>
            )}
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
          />

          {/* Use artist photo option */}
          {artistImageUrl && (
            <button
              onClick={handleUseArtistPhoto}
              disabled={settingArtistPhoto}
              className="w-full max-w-xs flex items-center gap-3 p-3 rounded-xl border border-white/[0.08] bg-white/[0.03] hover:bg-white/[0.06] hover:border-white/20 transition-all disabled:opacity-50"
            >
              <img 
                src={artistImageUrl} 
                alt={artistName}
                className="h-10 w-10 rounded-full object-cover flex-shrink-0"
              />
              <div className="text-left flex-1 min-w-0">
                <p className="text-white/80 text-sm font-medium truncate">
                  {settingArtistPhoto ? 'Setting...' : 'Use artist photo'}
                </p>
                <p className="text-white/40 text-xs truncate">{artistName}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-white/30 flex-shrink-0" />
            </button>
          )}
        </div>

        {/* Save button - closes sheet */}
        <div className="flex-shrink-0 pb-4">
          <button
            onClick={() => onOpenChange(false)}
            className="w-full py-3 text-center text-white/50 hover:text-white/70 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Check className="h-4 w-4" />
            <span>Save</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
