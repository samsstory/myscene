import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { exchangeSpotifyCode } from "@/lib/spotify-pkce";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function SpotifyCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const run = async () => {
      const params = new URLSearchParams(window.location.search);
      const code = params.get("code");
      const err = params.get("error");

      if (err || !code) {
        setError(err || "No authorization code received");
        setTimeout(() => navigate("/dashboard"), 2000);
        return;
      }

      try {
        const tokens = await exchangeSpotifyCode(code);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("Not authenticated");

        // Store connection
        const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();
        await supabase.from("spotify_connections" as any).upsert({
          user_id: user.id,
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: expiresAt,
          connected_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        // Trigger taste sync
        await supabase.functions.invoke("sync-spotify-taste");

        toast.success("Spotify connected! 🎵");
      } catch (e: any) {
        console.error("Spotify auth error:", e);
        setError(e.message || "Failed to connect Spotify");
      }

      navigate("/dashboard");
    };

    run();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      {error ? (
        <p className="text-destructive text-sm">{error}</p>
      ) : (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>Connecting Spotify…</span>
        </div>
      )}
    </div>
  );
}
