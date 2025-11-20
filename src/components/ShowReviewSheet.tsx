import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Edit, MapPin, Calendar as CalendarIcon, Music2 } from "lucide-react";
import { format, parseISO } from "date-fns";

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
}

interface ShowReviewSheetProps {
  show: Show | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (show: Show) => void;
}

const getRatingEmoji = (rating: number) => {
  const emojiMap: { [key: number]: string } = {
    1: "😴",
    2: "😐",
    3: "🙂",
    4: "😃",
    5: "🤩",
  };
  return emojiMap[rating] || "🎵";
};

const getRatingLabel = (rating: number) => {
  const labels = ["Terrible", "Meh", "Good", "Great", "Amazing"];
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

  const hasDetailedRatings = show.artistPerformance || show.sound || show.lighting || show.crowd || show.venueVibe;

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
          {/* Overall Rating */}
          <div className="text-center space-y-2">
            <div className="text-6xl">{getRatingEmoji(show.rating)}</div>
            <div className="text-2xl font-bold">{getRatingLabel(show.rating)}</div>
            <Badge variant="secondary" className="text-sm">
              {show.rating}/5 Overall
            </Badge>
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
