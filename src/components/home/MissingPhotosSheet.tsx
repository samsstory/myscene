import { useState, useEffect, useRef } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Camera, ImageIcon, X, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";

interface ShowWithoutPhoto {
  id: string;
  artistName: string;
  artistImageUrl?: string | null;
  venueName: string;
  showDate: string;
  // optimistic state
  status?: "pending" | "saved" | "skipped";
  savedPhotoUrl?: string;
}

interface MissingPhotosSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onComplete?: () => void;
}

export const MissingPhotosSheet = ({
  open,
  onOpenChange,
  onComplete,
}: MissingPhotosSheetProps) => {
  const [shows, setShows] = useState<ShowWithoutPhoto[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pendingShowIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchShowsWithoutPhotos();
    }
  }, [open]);

  const fetchShowsWithoutPhotos = async () => {
    setLoading(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: showsData, error } = await supabase
        .from("shows")
        .select("id, venue_name, show_date")
        .eq("user_id", user.id)
        .is("photo_url", null)
        .eq("photo_declined", false)
        .order("show_date", { ascending: false });

      if (error) throw error;

      const showsWithArtists = await Promise.all(
        (showsData || []).map(async (show) => {
          const { data: artistData } = await supabase
            .from("show_artists")
            .select("artist_name, artist_image_url")
            .eq("show_id", show.id)
            .eq("is_headliner", true)
            .limit(1);

          return {
            id: show.id,
            artistName: artistData?.[0]?.artist_name || "Unknown Artist",
            artistImageUrl: artistData?.[0]?.artist_image_url || null,
            venueName: show.venue_name,
            showDate: show.show_date,
            status: "pending" as const,
          };
        })
      );

      setShows(showsWithArtists);
    } catch (error) {
      console.error("Error fetching shows without photos:", error);
      toast.error("Failed to load shows");
    } finally {
      setLoading(false);
    }
  };

  // ── Use artist photo ──────────────────────────────────────────────
  const handleUseArtistPhoto = async (show: ShowWithoutPhoto) => {
    if (!show.artistImageUrl) return;
    setUploadingId(show.id);
    try {
      const { error } = await supabase
        .from("shows")
        .update({ photo_url: show.artistImageUrl })
        .eq("id", show.id);
      if (error) throw error;

      setShows((prev) =>
        prev.map((s) =>
          s.id === show.id
            ? { ...s, status: "saved", savedPhotoUrl: show.artistImageUrl! }
            : s
        )
      );
      toast.success(`Artist photo set for ${show.artistName}`);
    } catch {
      toast.error("Failed to set photo");
    } finally {
      setUploadingId(null);
    }
  };

  // ── Upload own photo ──────────────────────────────────────────────
  const triggerUpload = (showId: string) => {
    pendingShowIdRef.current = showId;
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    const showId = pendingShowIdRef.current;
    if (!file || !showId) return;

    // Reset so same file can be re-selected
    e.target.value = "";

    setUploadingId(showId);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const ext = file.name.split(".").pop();
      const fileName = `${user.id}/${showId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("show-photos")
        .upload(fileName, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from("show-photos")
        .getPublicUrl(fileName);

      const { error: updateError } = await supabase
        .from("shows")
        .update({ photo_url: urlData.publicUrl })
        .eq("id", showId);
      if (updateError) throw updateError;

      const show = shows.find((s) => s.id === showId);
      setShows((prev) =>
        prev.map((s) =>
          s.id === showId
            ? { ...s, status: "saved", savedPhotoUrl: urlData.publicUrl }
            : s
        )
      );
      toast.success(`Photo added for ${show?.artistName}`);
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to upload photo");
    } finally {
      setUploadingId(null);
      pendingShowIdRef.current = null;
    }
  };

  // ── Skip (no photo ever) ─────────────────────────────────────────
  const handleSkip = async (show: ShowWithoutPhoto) => {
    try {
      await supabase
        .from("shows")
        .update({ photo_declined: true })
        .eq("id", show.id);
      setShows((prev) =>
        prev.map((s) => (s.id === show.id ? { ...s, status: "skipped" } : s))
      );
    } catch {
      toast.error("Failed to update");
    }
  };

  // ── Undo skip ───────────────────────────────────────────────────
  const handleUndoSkip = async (show: ShowWithoutPhoto) => {
    try {
      await supabase
        .from("shows")
        .update({ photo_declined: false })
        .eq("id", show.id);
      setShows((prev) =>
        prev.map((s) => (s.id === show.id ? { ...s, status: "pending" } : s))
      );
    } catch {
      toast.error("Failed to undo");
    }
  };

  const handleClose = () => {
    onOpenChange(false);
    const anyChanged = shows.some((s) => s.status !== "pending");
    if (anyChanged) onComplete?.();
  };

  const pendingCount = shows.filter((s) => s.status === "pending").length;
  const doneCount = shows.filter((s) => s.status === "saved").length;

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent
        side="bottom"
        className="h-[90vh] overflow-hidden flex flex-col bg-background/95 backdrop-blur-xl"
      >
        {/* Header */}
        <SheetHeader className="flex-shrink-0 border-b border-white/10 pb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-9 w-9"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <SheetTitle className="text-lg font-bold text-left">
                Shows Without Photos
              </SheetTitle>
              {!loading && shows.length > 0 && (
                <p className="text-xs text-white/40 mt-0.5">
                  {pendingCount > 0
                    ? `${pendingCount} remaining`
                    : "All done! 🎉"}
                </p>
              )}
            </div>
          </div>
        </SheetHeader>

        {/* Hidden file input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-white/40 text-sm">
              Loading shows…
            </div>
          ) : shows.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-center gap-2">
              <Check className="h-10 w-10 text-primary" />
              <p className="text-white/60">All your shows have photos!</p>
            </div>
          ) : (
            shows.map((show) => (
              <ShowPhotoCard
                key={show.id}
                show={show}
                uploading={uploadingId === show.id}
                onUseArtistPhoto={handleUseArtistPhoto}
                onUploadPhoto={triggerUpload}
                onSkip={handleSkip}
                onUndoSkip={handleUndoSkip}
              />
            ))
          )}
        </div>

        {/* Footer */}
        {!loading && doneCount > 0 && (
          <div className="flex-shrink-0 pt-4 border-t border-white/10">
            <Button className="w-full" size="lg" onClick={handleClose}>
              Done — {doneCount} photo{doneCount !== 1 ? "s" : ""} added
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

// ── Per-show card ─────────────────────────────────────────────────────────────

interface ShowPhotoCardProps {
  show: ShowWithoutPhoto;
  uploading: boolean;
  onUseArtistPhoto: (show: ShowWithoutPhoto) => void;
  onUploadPhoto: (showId: string) => void;
  onSkip: (show: ShowWithoutPhoto) => void;
  onUndoSkip: (show: ShowWithoutPhoto) => void;
}

const ShowPhotoCard = ({
  show,
  uploading,
  onUseArtistPhoto,
  onUploadPhoto,
  onSkip,
  onUndoSkip,
}: ShowPhotoCardProps) => {
  const isSaved = show.status === "saved";
  const isSkipped = show.status === "skipped";

  return (
    <div
      className={cn(
        "rounded-xl border transition-all duration-300 overflow-hidden",
        isSaved && "border-primary/30 bg-primary/5",
        isSkipped && "border-white/[0.05] opacity-50",
        !isSaved && !isSkipped && "border-white/[0.08] bg-white/[0.03]"
      )}
    >
      <div className="flex items-center gap-3 p-3">
        {/* Thumbnail — saved photo, artist image, or placeholder */}
        <div className="relative w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 bg-white/[0.06]">
          {isSaved && show.savedPhotoUrl ? (
            <img
              src={show.savedPhotoUrl}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : show.artistImageUrl ? (
            <img
              src={show.artistImageUrl}
              alt=""
              className={cn(
                "w-full h-full object-cover",
                isSkipped && "grayscale"
              )}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white/20">
              <ImageIcon className="h-5 w-5" />
            </div>
          )}

          {/* Saved checkmark overlay */}
          {isSaved && (
            <div className="absolute inset-0 bg-primary/30 flex items-center justify-center">
              <Check className="h-5 w-5 text-white" />
            </div>
          )}
        </div>

        {/* Show info */}
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white/90 truncate">
            {show.artistName}
          </p>
          <p className="text-xs text-white/50 truncate">{show.venueName}</p>
          <p className="text-xs text-white/35 mt-0.5">
            {format(parseISO(show.showDate), "MMM d, yyyy")}
          </p>
        </div>

        {/* State indicator */}
        {isSaved && (
          <span className="text-[10px] font-semibold text-primary tracking-wide uppercase flex-shrink-0">
            Added
          </span>
        )}
        {isSkipped && (
          <button
            onClick={() => onUndoSkip(show)}
            className="text-[10px] font-medium text-white/40 hover:text-white/70 transition-colors flex-shrink-0 underline underline-offset-2"
          >
            Undo
          </button>
        )}
      </div>

      {/* Action row — only shown when pending */}
      {show.status === "pending" && (
        <div className="flex gap-1.5 px-3 pb-3">
          {/* Use artist photo — primary if available */}
          {show.artistImageUrl ? (
            <button
              disabled={uploading}
              onClick={() => onUseArtistPhoto(show)}
              className={cn(
                "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all",
                "bg-white/[0.07] border border-white/[0.1] text-white/80",
                "hover:bg-white/[0.12] hover:border-primary/30 active:scale-[0.97]",
                uploading && "opacity-50 cursor-not-allowed"
              )}
            >
              <img
                src={show.artistImageUrl}
                alt=""
                className="w-4 h-4 rounded-full object-cover flex-shrink-0"
              />
              Use artist photo
            </button>
          ) : null}

          {/* Upload my photo */}
          <button
            disabled={uploading}
            onClick={() => onUploadPhoto(show.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium transition-all",
              show.artistImageUrl
                ? "bg-primary/15 border border-primary/25 text-primary"
                : "bg-primary/20 border border-primary/30 text-primary",
              "hover:bg-primary/25 hover:border-primary/40 active:scale-[0.97]",
              uploading && "opacity-50 cursor-not-allowed"
            )}
          >
            {uploading ? (
              <span className="animate-pulse">Uploading…</span>
            ) : (
              <>
                <Camera className="h-3.5 w-3.5" />
                {show.artistImageUrl ? "Upload mine" : "Upload photo"}
              </>
            )}
          </button>

          {/* Skip */}
          <button
            disabled={uploading}
            onClick={() => onSkip(show)}
            className="px-2.5 py-2 rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all active:scale-[0.97] flex-shrink-0"
            title="No photo for this show"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

export default MissingPhotosSheet;
