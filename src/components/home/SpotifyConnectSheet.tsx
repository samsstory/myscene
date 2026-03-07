import { memo, useState, useCallback } from "react";
import { Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import SpotifyIcon from "@/components/ui/SpotifyIcon";
import { initiateSpotifyAuth } from "@/lib/spotify-pkce";
import { toast } from "sonner";

interface SpotifyConnectSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function SpotifyConnectSheetInner({ open, onOpenChange }: SpotifyConnectSheetProps) {
  const [connecting, setConnecting] = useState(false);

  const handleConnect = useCallback(async () => {
    setConnecting(true);
    try {
      await initiateSpotifyAuth();
      // Navigation happens via redirect — this code won't run
    } catch {
      toast.error("Failed to start Spotify connection");
      setConnecting(false);
    }
  }, []);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-2xl">
        <SheetHeader>
          <SheetTitle className="text-base font-bold tracking-tight">Connect Spotify</SheetTitle>
        </SheetHeader>

        <div className="mt-5 space-y-5">
          {/* Benefits */}
          <div className="space-y-2.5">
            {[
              { emoji: "🎵", text: "Auto-detect your top genres for badges" },
              { emoji: "🎯", text: "Get personalized show recommendations" },
              { emoji: "⚡", text: "Faster artist search when logging shows" },
            ].map(({ emoji, text }) => (
              <div key={text} className="flex items-center gap-3 text-sm text-foreground/80">
                <span className="text-base">{emoji}</span>
                <span>{text}</span>
              </div>
            ))}
          </div>

          {/* Connect button */}
          <Button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full gap-2.5 h-12 rounded-xl bg-[#1DB954] hover:bg-[#1ed760] text-white font-semibold text-sm"
          >
            {connecting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <SpotifyIcon className="h-5 w-5" />
            )}
            {connecting ? "Connecting…" : "Connect with Spotify"}
          </Button>

          {/* Privacy note */}
          <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
            We only read your top artists. Scene never posts to your Spotify or accesses your playlists.
          </p>
        </div>
      </SheetContent>
    </Sheet>
  );
}

const SpotifyConnectSheet = memo(SpotifyConnectSheetInner);
export default SpotifyConnectSheet;
