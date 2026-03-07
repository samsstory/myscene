import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface QuestStep {
  id: "install_pwa" | "log_show" | "set_city" | "connect_spotify" | "add_photo";
  label: string;
  description: string;
  icon: string;
  completed: boolean;
}

interface UseSetupQuestsReturn {
  quests: QuestStep[];
  completedCount: number;
  totalCount: number;
  allComplete: boolean;
  isLoading: boolean;
  refetch: () => void;
}

const SESSION_KEY = "scene_quests_minimized";

export function useSetupQuestsMinimized() {
  const [minimized, setMinimized] = useState(() =>
    sessionStorage.getItem(SESSION_KEY) === "true"
  );

  const toggle = () => {
    const next = !minimized;
    setMinimized(next);
    sessionStorage.setItem(SESSION_KEY, String(next));
  };

  return { minimized, toggle };
}

export function useSetupQuests(): UseSetupQuestsReturn {
  const [hasShow, setHasShow] = useState(false);
  const [hasCity, setHasCity] = useState(false);
  const [hasSpotify, setHasSpotify] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [showRes, profileRes, spotifyRes] = await Promise.all([
        supabase.from("shows").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("home_city, avatar_url").eq("id", user.id).maybeSingle(),
        supabase.from("spotify_connections").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      if (cancelled) return;

      setHasShow((showRes.count ?? 0) > 0);
      setHasCity(!!profileRes.data?.home_city);
      setHasPhoto(!!profileRes.data?.avatar_url);
      setHasSpotify((spotifyRes.count ?? 0) > 0);
      setIsLoading(false);
    };

    check();
    return () => { cancelled = true; };
  }, [tick]);

  const quests: QuestStep[] = useMemo(() => [
    {
      id: "log_show",
      label: "Log your first show",
      description: "Add a concert or festival you've been to",
      icon: "🎵",
      completed: hasShow,
    },
    {
      id: "set_city",
      label: "Set your home city",
      description: "Unlock local discovery & miles danced",
      icon: "📍",
      completed: hasCity,
    },
    {
      id: "connect_spotify",
      label: "Connect Spotify",
      description: "Get genre badges & personalized recs",
      icon: "🎧",
      completed: hasSpotify,
    },
    {
      id: "add_photo",
      label: "Add a profile photo",
      description: "Stand out to friends on Scene",
      icon: "📸",
      completed: hasPhoto,
    },
  ], [hasShow, hasCity, hasSpotify, hasPhoto]);

  const completedCount = quests.filter((q) => q.completed).length;

  return {
    quests,
    completedCount,
    totalCount: quests.length,
    allComplete: completedCount === quests.length,
    isLoading,
    refetch: () => setTick((t) => t + 1),
  };
}
