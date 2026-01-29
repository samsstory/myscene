import { CheckCircle2, Plus, Image, MessageCircle, Scale, Share } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AddedShowData } from "@/hooks/useBulkShowUpload";

interface BulkSuccessStepProps {
  addedCount: number;
  addedShows: AddedShowData[];
  onAddMore: () => void;
  onDone: () => void;
  onCreateReviewPhoto: (show: AddedShowData) => void;
  onRank: () => void;
}

// Tappable show card for multi-show display
const ShowCard = ({ show, onTap }: { show: AddedShowData; onTap: (show: AddedShowData) => void }) => (
  <button 
    onClick={() => onTap(show)}
    className="text-center space-y-1.5 p-2 rounded-lg hover:bg-muted/50 transition-colors w-full"
  >
    <div className="aspect-[4/5] rounded-lg overflow-hidden bg-muted">
      {show.photo_url ? (
        <img src={show.photo_url} alt="" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-muted">
          <span className="text-2xl text-muted-foreground/60 select-none" style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}>✦</span>
        </div>
      )}
    </div>
    <p className="text-xs font-medium truncate">
      {show.artists[0]?.name || "Show"}
    </p>
  </button>
);

const BulkSuccessStep = ({ addedCount, addedShows, onAddMore, onDone, onCreateReviewPhoto, onRank }: BulkSuccessStepProps) => {
  const firstShow = addedShows[0];
  const hasMultiple = addedShows.length > 1;

  const handleSendToFriends = () => {
    if (!firstShow) return;
    
    const artistNames = firstShow.artists.map(a => a.name).join(', ');
    const shareText = `Just saw ${artistNames} at ${firstShow.venue.name}! 🎵`;
    
    window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
  };

  const handleShareAll = () => {
    const showCount = addedShows.length;
    const shareText = `Just added ${showCount} shows to my Scene! 🎵`;
    window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
  };

  return (
    <div className="text-center space-y-6 py-4">
      {/* Success header - minimal */}
      <div className="flex items-center justify-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          <CheckCircle2 className="h-6 w-6 text-primary" />
        </div>
        <h2 className="text-xl font-bold">
          {addedCount} show{addedCount !== 1 ? 's' : ''} added
        </h2>
      </div>

      {/* Single show: Preview card with photo */}
      {!hasMultiple && firstShow && (
        <div className="rounded-xl overflow-hidden bg-muted">
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
            <div className="aspect-[4/3] w-full flex flex-col items-center justify-center gap-2 p-4 bg-muted/50">
              <span className="text-4xl text-muted-foreground/60 select-none" style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}>✦</span>
              <div className="text-center">
                <p className="font-semibold">
                  {firstShow.artists.map(a => a.name).join(', ')}
                </p>
                <p className="text-sm text-muted-foreground">
                  {firstShow.venue.name}
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Multiple shows: Tappable grid */}
      {hasMultiple && (
        <div className="space-y-2">
          <div className="grid grid-cols-2 gap-3">
            {addedShows.map((show) => (
              <ShowCard 
                key={show.id} 
                show={show} 
                onTap={onCreateReviewPhoto}
              />
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Tap to share your review on Instagram
          </p>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-3 pt-2">
        {/* Single show actions */}
        {!hasMultiple && firstShow && (
          <>
            <Button 
              onClick={() => onCreateReviewPhoto(firstShow)}
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
          </>
        )}

        {/* Rank button - always shown, primary for multi-show */}
        <Button 
          onClick={onRank}
          variant={hasMultiple ? "default" : "outline"}
          size={hasMultiple ? "lg" : "default"}
          className="w-full"
        >
          <Scale className="h-4 w-4 mr-2" />
          Rank {hasMultiple ? 'These Shows' : 'This Show'}
        </Button>

        {/* Multi-show actions */}
        {hasMultiple && (
          <Button 
            onClick={handleShareAll}
            variant="outline"
            className="w-full"
          >
            <Share className="h-4 w-4 mr-2" />
            Share Summary
          </Button>
        )}
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
