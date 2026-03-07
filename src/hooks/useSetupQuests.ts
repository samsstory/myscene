import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface QuestStep {
  id: "install_pwa" | "log_show" | "set_city" | "connect_spotify" | "add_photo" | "enable_push";
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

const isInStandaloneMode = () =>
  window.matchMedia("(display-mode: standalone)").matches ||
  (navigator as unknown as Record<string, unknown>).standalone === true;

const isPushEnabled = () => {
  if (!("Notification" in window)) return false;
  return Notification.permission === "granted";
};

export function useSetupQuests(): UseSetupQuestsReturn {
  const [hasPwa, setHasPwa] = useState(false);
  const [hasShow, setHasShow] = useState(false);
  const [hasCity, setHasCity] = useState(false);
  const [hasSpotify, setHasSpotify] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [hasPush, setHasPush] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const check = async () => {
      // Check standalone mode first (no DB needed)
      const standalone = isInStandaloneMode();
      const pushEnabled = isPushEnabled();

      const { data: { user } } = await supabase.auth.getUser();
      if (!user || cancelled) return;

      const [showRes, profileRes, spotifyRes] = await Promise.all([
        supabase.from("shows").select("id", { count: "exact", head: true }).eq("user_id", user.id),
        supabase.from("profiles").select("home_city, avatar_url, pwa_installed").eq("id", user.id).maybeSingle(),
        supabase.from("spotify_connections").select("id", { count: "exact", head: true }).eq("user_id", user.id),
      ]);

      if (cancelled) return;

      // PWA is complete if running standalone OR previously marked in DB
      const pwaInstalled = standalone || !!profileRes.data?.pwa_installed;

      // If we just detected standalone mode but DB doesn't reflect it, update DB
      if (standalone && !profileRes.data?.pwa_installed) {
        supabase.from("profiles").upsert({ id: user.id, pwa_installed: true }).then(() => {});
      }

      setHasPwa(pwaInstalled);
      setHasShow((showRes.count ?? 0) > 0);
      setHasCity(!!profileRes.data?.home_city);
      setHasPhoto(!!profileRes.data?.avatar_url);
      setHasSpotify((spotifyRes.count ?? 0) > 0);
      setHasPush(pushEnabled);
      setIsLoading(false);
    };

    check();
    return () => { cancelled = true; };
  }, [tick]);

  const quests: QuestStep[] = useMemo(() => [
    {
      id: "install_pwa",
      label: "Add Scene to home screen",
      description: "Get the full app experience with one tap",
      icon: "📲",
      completed: hasPwa,
    },
    {
      id: "log_show",
      label: "Log your first show",
      description: "Add a concert or festival you've been to",
      icon: "🎵",
      completed: hasShow,
    },
    {
      id: "enable_push",
      label: "Enable notifications",
      description: "Get updates when friends log shows",
      icon: "🔔",
      completed: hasPush,
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
  ], [hasPwa, hasShow, hasCity, hasSpotify, hasPhoto, hasPush]);

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
