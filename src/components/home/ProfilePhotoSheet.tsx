import { memo, useState, useCallback, useRef } from "react";
import { Camera, Loader2, ImagePlus } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProfilePhotoSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPhotoUploaded?: () => void;
}

function ProfilePhotoSheetInner({ open, onOpenChange, onPhotoUploaded }: ProfilePhotoSheetProps) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/jpg", "image/png", "image/webp"].includes(file.type)) {
      toast.error("Please upload a JPG, PNG, or WEBP image");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    // Show preview immediately
    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split(".").pop();
      const filePath = `${user.id}/avatar.${fileExt}`;
      await supabase.storage.from("show-photos").upload(filePath, file, { upsert: true });
      const { data: { publicUrl } } = supabase.storage.from("show-photos").getPublicUrl(filePath);
      // Add cache-buster so Profile page loads the fresh image
      const freshUrl = `${publicUrl}?t=${Date.now()}`;
      await supabase.from("profiles").update({ avatar_url: freshUrl }).eq("id", user.id);

      toast.success("Profile photo added! 📸");
      onOpenChange(false);
      // Small delay to let the sheet close and DB settle before refetching quests
      setTimeout(() => onPhotoUploaded?.(), 400);
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setUploading(false);
      URL.revokeObjectURL(objectUrl);
    }
  }, [onOpenChange, onPhotoUploaded]);

  const handleTapUpload = useCallback(() => {
    fileRef.current?.click();
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-base font-bold tracking-tight">Add a Profile Photo</SheetTitle>
          <SheetDescription className="sr-only">Upload a profile photo to complete your setup</SheetDescription>

        <div className="mt-5 space-y-5">
          {/* Preview / placeholder */}
          <div className="flex justify-center">
            <button
              onClick={handleTapUpload}
              disabled={uploading}
              className="relative w-28 h-28 rounded-full border-2 border-dashed border-white/[0.15] bg-white/[0.04] flex items-center justify-center overflow-hidden hover:border-primary/40 transition-colors"
            >
              {preview ? (
                <img
                  src={preview}
                  alt="Preview"
                  className="w-full h-full object-cover rounded-full"
                />
              ) : (
                <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
                  <Camera className="h-7 w-7" />
                  <span className="text-[11px]">Tap to add</span>
                </div>
              )}
              {uploading && (
                <div className="absolute inset-0 bg-background/60 flex items-center justify-center rounded-full">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </button>
          </div>

          {/* Benefits */}
          <div className="space-y-2.5">
            {[
              { emoji: "👋", text: "Friends can recognize you on Scene" },
              { emoji: "🏆", text: "Your photo shows on leaderboards & profiles" },
              { emoji: "✨", text: "Stand out when sharing show invites" },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-foreground/80">
                <span className="text-base">{emoji}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Upload button */}
          <Button
            onClick={handleTapUpload}
            disabled={uploading}
            className="w-full gap-2.5 h-12 rounded-xl font-semibold text-sm"
          >
            {uploading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="h-5 w-5" />
            )}
            {uploading ? "Uploading…" : "Choose Photo"}
          </Button>

          {/* Hidden file input */}
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />

          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            JPG, PNG, or WEBP · Max 5 MB
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const ProfilePhotoSheet = memo(ProfilePhotoSheetInner);
export default ProfilePhotoSheet;
