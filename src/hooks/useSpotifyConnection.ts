import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSpotifyConnection() {
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [spotifyArtists, setSpotifyArtists] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) { setIsLoading(false); return; }

      const { data: conn } = await supabase
        .from("spotify_connections" as any)
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cancelled) return;
      setIsConnected(!!conn);

      if (conn) {
        const { data: artists } = await supabase
          .from("spotify_top_artists" as any)
          .select("artist_name")
          .eq("user_id", user.id);

        if (!cancelled && artists) {
          const names = [...new Set((artists as any[]).map((a: any) => a.artist_name as string))];
          setSpotifyArtists(names);
        }
      }

      setIsLoading(false);
    }

    check();
    return () => { cancelled = true; };
  }, []);

  const disconnect = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("spotify_connections" as any).delete().eq("user_id", user.id);
    await supabase.from("spotify_top_artists" as any).delete().eq("user_id", user.id);
    setIsConnected(false);
    setSpotifyArtists([]);
  };

  return { isConnected, isLoading, spotifyArtists, disconnect };
}
