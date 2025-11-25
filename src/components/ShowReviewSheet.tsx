import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, MapPin, Calendar as CalendarIcon, Music2, Upload, X, Image as ImageIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useState, useRef } from "react";
import { Input } from "@/components/ui/input";
import { calculateShowScore, getScoreGradient } from "@/lib/utils";

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

interface ShowReviewSheetProps {
  show: Show | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (show: Show) => void;
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

export const ShowReviewSheet = ({ show, open, onOpenChange, onEdit }: ShowReviewSheetProps) => {
  if (!show) return null;

  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState(show.photo_url);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasDetailedRatings = show.artistPerformance || show.sound || show.lighting || show.crowd || show.venueVibe;

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a JPG, PNG, or WEBP image", variant: "destructive" });
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: "File too large", description: "Please upload an image smaller than 10MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const filePath = `${user.id}/${show.id}.${fileExt}`;

      // Upload to storage
      const { error: uploadError } = await supabase.storage
        .from('show-photos')
        .upload(filePath, file, { upsert: true });

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
      toast({ title: "Upload failed", description: "Failed to upload photo", variant: "destructive" });
    } finally {
      setUploading(false);
    }
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
          {photoUrl ? (
            <div className="relative rounded-lg overflow-hidden">
              <img 
                src={photoUrl} 
                alt="Show photo" 
                className="w-full h-64 object-cover"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Change
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={handleRemovePhoto}
                >
                  <X className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          ) : (
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
    </Sheet>
  );
};
