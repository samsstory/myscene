import { useState, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Camera, Upload, Share2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Artist {
  name: string;
  isHeadliner: boolean;
}

interface Show {
  id: string;
  artists: Artist[];
  venue: {
    name: string;
    location: string;
  };
  date: string;
  photo_url?: string | null;
}

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!show) return null;

  const headliner = show.artists.find(a => a.isHeadliner) || show.artists[0];
  const artistName = headliner?.name || "Unknown Artist";
  
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
        </div>

        {/* Share without photo option */}
        <div className="flex-shrink-0 pb-4">
          <button
            onClick={onShareWithoutPhoto}
            className="w-full py-3 text-center text-white/50 hover:text-white/70 transition-colors text-sm flex items-center justify-center gap-2"
          >
            <Share2 className="h-4 w-4" />
            <span>Share without photo</span>
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
};
