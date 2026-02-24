import { useState, useEffect } from "react";
import { CheckCircle2, Plus, Image, MessageCircle, Scale, Share, Download, Music } from "lucide-react";
import { AddedShowData } from "@/hooks/useBulkShowUpload";
import PushNotificationInterstitial from "@/components/onboarding/PushNotificationInterstitial";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

interface BulkSuccessStepProps {
  addedCount: number;
  addedShows: AddedShowData[];
  festivalName?: string | null;
  onAddMore: () => void;
  onDone: () => void;
  onCreateReviewPhoto: (show: AddedShowData) => void;
  onRank: () => void;
}

// Tappable show card for multi-show display (non-festival only)
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

// Compact artist chip for festival summary
const ArtistChip = ({ name, imageUrl }: { name: string; imageUrl?: string | null }) => (
  <span className="inline-flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-muted/60 text-xs font-medium">
    {imageUrl ? (
      <img src={imageUrl} alt="" className="h-4 w-4 rounded-full object-cover" />
    ) : (
      <span className="h-4 w-4 rounded-full bg-primary/10 flex items-center justify-center text-[8px] text-primary">✦</span>
    )}
    {name}
  </span>
);

const BulkSuccessStep = ({ addedCount, addedShows, festivalName, onAddMore, onDone, onCreateReviewPhoto, onRank }: BulkSuccessStepProps) => {
  const firstShow = addedShows[0];
  const hasMultiple = addedShows.length > 1;
  const isFestival = !!festivalName;

  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallCTA, setShowInstallCTA] = useState(false);
  const [installDismissed, setInstallDismissed] = useState(false);
  const [showPushInterstitial, setShowPushInterstitial] = useState(false);

  // Set first-show flag and capture install prompt
  useEffect(() => {
    const isFirstShow = !localStorage.getItem("scene-first-show-logged");
    localStorage.setItem("scene-first-show-logged", "true");

    const pushSeen = localStorage.getItem("scene-push-prompt-seen");
    if (isFirstShow && !pushSeen && "Notification" in window) {
      setShowPushInterstitial(true);
    }

    const isStandalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as any).standalone === true;
    const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
    if (isStandalone || !isMobile) return;

    setShowInstallCTA(true);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === "accepted") setShowInstallCTA(false);
      setDeferredPrompt(null);
    } else {
      setInstallDismissed(true);
    }
  };

  const handleSendToFriends = () => {
    if (!firstShow) return;
    const artistNames = firstShow.artists.map(a => a.name).join(', ');
    const shareText = `Just saw ${artistNames} at ${firstShow.venue.name}! 🎵`;
    window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
  };

  const handleShareAll = () => {
    if (isFestival) {
      const shareText = `Just claimed ${festivalName} on SCENE — ${addedShows.length} sets logged! 🎵`;
      window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
    } else {
      const shareText = `Just added ${addedShows.length} shows to my Scene! 🎵`;
      window.location.href = `sms:?body=${encodeURIComponent(shareText)}`;
    }
  };

  if (showPushInterstitial) {
    return (
      <PushNotificationInterstitial
        onComplete={() => setShowPushInterstitial(false)}
      />
    );
  }

  return (
    <div className="text-center space-y-6 py-4">
      {/* Header */}
      <div className="flex items-center justify-center gap-3">
        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
          {isFestival ? (
            <Music className="h-6 w-6 text-primary" />
          ) : (
            <CheckCircle2 className="h-6 w-6 text-primary" />
          )}
        </div>
        <div className="text-left">
          <h2 className="text-xl font-bold">
            {isFestival ? festivalName : `${addedCount} show${addedCount !== 1 ? 's' : ''} added`}
          </h2>
          {isFestival && (
            <p className="text-sm text-muted-foreground">
              {addedCount} set{addedCount !== 1 ? 's' : ''} added to your rankings
            </p>
          )}
        </div>
      </div>

      {/* Body — festival: compact artist list */}
      {isFestival && (
        <div className="rounded-xl border border-border/50 bg-muted/30 p-4 space-y-3">
          <div className="flex flex-wrap gap-1.5 justify-center">
            {addedShows.map((show) => (
              <ArtistChip
                key={show.id}
                name={show.artists[0]?.name || "Artist"}
                imageUrl={(show.artists[0] as any)?.image_url}
              />
            ))}
          </div>
        </div>
      )}

      {/* Body — non-festival single show */}
      {!isFestival && !hasMultiple && firstShow && (
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

      {/* Body — non-festival multi show grid */}
      {!isFestival && hasMultiple && (
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

      {/* Inline Install CTA */}
      {showInstallCTA && !installDismissed && (
        <div className="rounded-xl border border-border/50 bg-muted/30 backdrop-blur-sm p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="text-left flex-1">
              <p className="text-sm font-semibold">Get SCENE on your home screen</p>
              <p className="text-xs text-muted-foreground">Full app experience, one tap away</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleInstall} className="flex-1 py-2 px-3 rounded-xl bg-muted/60 backdrop-blur-sm border border-border text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted hover:border-primary/30 active:scale-[0.98]">
              Install
            </button>
            <button onClick={() => setInstallDismissed(true)} className="py-2 px-3 rounded-xl text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/40">
              Later
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="space-y-2.5 pt-2">
        {/* Non-festival single show actions */}
        {!isFestival && !hasMultiple && firstShow && (
          <>
            <button 
              onClick={() => onCreateReviewPhoto(firstShow)}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-muted/60 backdrop-blur-sm border border-border text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted hover:border-primary/30 active:scale-[0.98]"
            >
              <Image className="h-4 w-4 text-primary" />
              Create Review Photo
            </button>
            
            <button 
              onClick={handleSendToFriends}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/50 text-sm font-medium text-foreground/80 transition-all duration-200 hover:bg-muted/50 active:scale-[0.98]"
            >
              <MessageCircle className="h-4 w-4 text-muted-foreground" />
              Send to Friends
            </button>
          </>
        )}

        {/* Festival share */}
        {isFestival && (
          <button 
            onClick={handleShareAll}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-muted/60 backdrop-blur-sm border border-border text-sm font-medium text-foreground transition-all duration-200 hover:bg-muted hover:border-primary/30 active:scale-[0.98]"
          >
            <Share className="h-4 w-4 text-primary" />
            Share Festival
          </button>
        )}

        {/* Rank button — universal */}
        <button 
          onClick={onRank}
          className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/50 text-sm font-medium text-foreground/80 transition-all duration-200 hover:bg-muted/50 active:scale-[0.98]"
        >
          <Scale className="h-4 w-4 text-muted-foreground" />
          Rank {isFestival ? 'These Sets' : hasMultiple ? 'These Shows' : 'This Show'}
        </button>

        {/* Non-festival multi-show share */}
        {!isFestival && hasMultiple && (
          <button 
            onClick={handleShareAll}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-muted/30 backdrop-blur-sm border border-border/50 text-sm font-medium text-foreground/80 transition-all duration-200 hover:bg-muted/50 active:scale-[0.98]"
          >
            <Share className="h-4 w-4 text-muted-foreground" />
            Share Summary
          </button>
        )}
      </div>

      {/* Footer actions — universal */}
      <div className="flex gap-2 pt-3">
        <button 
          onClick={onAddMore} 
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/40"
        >
          <Plus className="h-3.5 w-3.5" />
          Add More
        </button>
        <button 
          onClick={onDone} 
          className="flex-1 flex items-center justify-center py-2.5 px-3 rounded-lg text-xs font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/40"
        >
          Done
        </button>
      </div>
    </div>
  );
};

export default BulkSuccessStep;
