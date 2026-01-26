import { CheckCircle2, PartyPopper, Plus, Image, MessageCircle, Scale, Star, Music2, Users, Lightbulb, Volume2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { AddedShowData } from "@/hooks/useBulkShowUpload";
import { cn } from "@/lib/utils";

interface BulkSuccessStepProps {
  addedCount: number;
  addedShows: AddedShowData[];
  onAddMore: () => void;
  onDone: () => void;
  onCreateReviewPhoto: (show: AddedShowData) => void;
  onRank: () => void;
}

// Compact rating display
const RatingPill = ({ icon: Icon, value, label }: { icon: React.ElementType; value: number | null; label: string }) => {
  if (!value) return null;
  return (
    <div className="flex items-center gap-1.5 bg-muted/50 rounded-full px-2 py-1">
      <Icon className="h-3 w-3 text-muted-foreground" />
      <span className="text-xs font-medium">{value}/5</span>
    </div>
  );
};

const BulkSuccessStep = ({ addedCount, addedShows, onAddMore, onDone, onCreateReviewPhoto, onRank }: BulkSuccessStepProps) => {
  const firstShow = addedShows[0];
  const hasMultiple = addedShows.length > 1;
  
  // Get ratings from the first show (for single show display)
  const ratings = firstShow ? {
    artistPerformance: firstShow.artistPerformance,
    sound: firstShow.sound,
    lighting: firstShow.lighting,
    crowd: firstShow.crowd,
    venueVibe: firstShow.venueVibe,
  } : null;
  
  const hasAnyRating = ratings && Object.values(ratings).some(v => v !== null && v !== undefined);

  const handleSendToFriends = () => {
    if (!firstShow) return;
    
    const artistNames = firstShow.artists.map(a => a.name).join(', ');
    const shareText = `Just saw ${artistNames} at ${firstShow.venue.name}! 🎵`;
    
    // Use SMS share via sms: protocol
    const smsUrl = `sms:?body=${encodeURIComponent(shareText)}`;
    window.location.href = smsUrl;
  };

  return (
    <div className="text-center space-y-5 py-4">
      {/* Success header with icon */}
      <div className="flex items-center justify-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <div className="text-left">
          <h2 className="text-xl font-bold">
            {addedCount} show{addedCount !== 1 ? 's' : ''} added!
          </h2>
          <p className="text-sm text-muted-foreground">
            Share your experience
          </p>
        </div>
        <PartyPopper className="h-6 w-6 text-yellow-500 animate-bounce" />
      </div>

      {/* Show Preview Card - for single show */}
      {!hasMultiple && firstShow && (
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Photo */}
            {firstShow.photo_url ? (
              <div className="relative aspect-[4/3] w-full">
                <img 
                  src={firstShow.photo_url} 
                  alt="Show photo"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                <div className="absolute bottom-3 left-3 right-3 text-left text-white">
                  <p className="font-semibold text-lg leading-tight">
                    {firstShow.artists.map(a => a.name).join(', ')}
                  </p>
                  <p className="text-sm text-white/80">
                    {firstShow.venue.name}
                  </p>
                </div>
              </div>
            ) : (
              <div className="aspect-[4/3] w-full bg-muted flex items-center justify-center">
                <Music2 className="h-12 w-12 text-muted-foreground/50" />
              </div>
            )}
            
            {/* Ratings row */}
            {hasAnyRating && (
              <div className="p-3 border-t flex flex-wrap gap-2 justify-center">
                <RatingPill icon={Star} value={ratings?.artistPerformance ?? null} label="Artist" />
                <RatingPill icon={Volume2} value={ratings?.sound ?? null} label="Sound" />
                <RatingPill icon={Lightbulb} value={ratings?.lighting ?? null} label="Lights" />
                <RatingPill icon={Users} value={ratings?.crowd ?? null} label="Crowd" />
                <RatingPill icon={Sparkles} value={ratings?.venueVibe ?? null} label="Vibe" />
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Multiple shows summary */}
      {hasMultiple && (
        <div className="grid grid-cols-4 gap-2">
          {addedShows.slice(0, 4).map((show, idx) => (
            <div key={show.id} className="relative aspect-square rounded-lg overflow-hidden bg-muted">
              {show.photo_url ? (
                <img src={show.photo_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Music2 className="h-6 w-6 text-muted-foreground/50" />
                </div>
              )}
              {idx === 3 && addedShows.length > 4 && (
                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                  <span className="text-white font-semibold">+{addedShows.length - 4}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2 pt-2">
        <Button 
          onClick={() => firstShow && onCreateReviewPhoto(firstShow)}
          className="w-full"
          size="lg"
        >
          <Image className="h-4 w-4 mr-2" />
          Create Review Photo
        </Button>
        
        <Button 
          onClick={handleSendToFriends}
          variant="secondary"
          className="w-full"
          size="lg"
        >
          <MessageCircle className="h-4 w-4 mr-2" />
          Send to Friends
        </Button>

        <Button 
          onClick={onRank}
          variant="outline"
          className="w-full"
        >
          <Scale className="h-4 w-4 mr-2" />
          Rank {hasMultiple ? 'Shows' : 'This Show'}
        </Button>
      </div>

      {/* Footer actions */}
      <div className="flex gap-3 pt-2">
        <Button onClick={onAddMore} variant="ghost" className="flex-1">
          <Plus className="h-4 w-4 mr-2" />
          Add More
        </Button>
        <Button onClick={onDone} variant="ghost" className="flex-1">
          Done
        </Button>
      </div>
    </div>
  );
};

export default BulkSuccessStep;
