import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Music, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import LineupSelectionGrid, { LineupArtist } from "@/components/festival-claim/LineupSelectionGrid";
import { useFestivalClaim } from "@/hooks/useFestivalClaim";
import { toast } from "sonner";

interface FestivalInviteHeroProps {
  inviteId: string;
  refCode?: string;
}

interface InviteData {
  invite: { id: string; festival_name: string; selected_artists: { name: string; image_url?: string }[] };
  lineup: { artists: any; venue_name: string | null; venue_location: string | null; date_start: string | null; year: number; event_name: string } | null;
  inviter: { full_name: string | null; username: string | null } | null;
}

export default function FestivalInviteHero({ inviteId, refCode }: FestivalInviteHeroProps) {
  const navigate = useNavigate();
  const [data, setData] = useState<InviteData | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [session, setSession] = useState<any>(null);
  const [claiming, setClaiming] = useState(false);
  const { claimShows } = useFestivalClaim();

  // Derive lineup ID from edge function response
  const lineupId = (data?.lineup as any)?.id || "";

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
  }, []);

  useEffect(() => {
    const fetchInvite = async () => {
      try {
        const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-festival-invite?id=${inviteId}`;
        const res = await fetch(url, {
          headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY },
        });
        if (!res.ok) { setNotFound(true); return; }
        const json = await res.json();
        if (!json.invite) { setNotFound(true); return; }
        setData(json);
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [inviteId]);

  const inviterDisplay = data?.inviter?.full_name || (data?.inviter?.username ? `@${data.inviter.username}` : "A friend");
  const firstName = inviterDisplay.startsWith("@") ? inviterDisplay : inviterDisplay.split(" ")[0];

  const rawSharerPicks = data?.invite.selected_artists?.map((a) => a.name) || [];
  const allLineupArtists: LineupArtist[] = (() => {
    if (!data?.lineup?.artists) return [];
    const raw = typeof data.lineup.artists === "string" ? JSON.parse(data.lineup.artists) : data.lineup.artists;
    if (!Array.isArray(raw)) return [];
    return raw.map((a: any) => ({ name: typeof a === "string" ? a : a.name, day: a.day, stage: a.stage }));
  })();

  // Case-insensitive match: map sharer picks to lineup artist names
  const sharerPicks = (() => {
    const lineupLower = new Map(allLineupArtists.map((a) => [a.name.toLowerCase(), a.name]));
    return rawSharerPicks.map((name) => lineupLower.get(name.toLowerCase()) || name);
  })();

  const handleClaim = async (selectedArtists: string[]) => {
    if (!session) {
      // Persist to localStorage and redirect to auth
      localStorage.setItem("invite_type", "festival-invite");
      localStorage.setItem("invite_festival_lineup_id", lineupId);
      localStorage.setItem("invite_selected_artists", JSON.stringify(selectedArtists));
      localStorage.setItem("invite_festival_name", data?.invite.festival_name || "");
      if (refCode) localStorage.setItem("invite_ref", refCode);

      navigate(`/auth${refCode ? `?ref=${refCode}` : ""}`);
      return;
    }

    // Logged in — claim directly
    if (!data?.lineup) return;
    setClaiming(true);
    try {
      // Build a FestivalResult-like object for useFestivalClaim
      const festivalResult = {
        id: "", // not needed for claim
        event_name: data.invite.festival_name,
        year: data.lineup.year,
        date_start: data.lineup.date_start,
        venue_name: data.lineup.venue_name,
        venue_location: data.lineup.venue_location,
        venue_id: null,
        artists: allLineupArtists,
      };
      const result = await claimShows(selectedArtists, festivalResult as any);
      if (result.success) {
        toast.success(`Added ${data.invite.festival_name} to your Scene!`);
        navigate("/dashboard");
      }
    } finally {
      setClaiming(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/30" />
      </div>
    );
  }

  if (notFound || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-2xl p-10 max-w-sm w-full text-center space-y-4">
          <div className="text-3xl">🎵</div>
          <p className="text-foreground/70 text-sm">This invite link has expired or is no longer available.</p>
          <Button onClick={() => navigate(`/auth${refCode ? `?ref=${refCode}` : ""}`)} className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            Create your free account →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 60% at 50% 0%, hsl(var(--primary)/0.12), transparent 70%)" }} />

      <div className="relative z-10 flex flex-col items-center min-h-screen px-5 py-10 gap-5">
        {/* Scene logo */}
        <div className="text-[10px] font-semibold tracking-[0.25em] uppercase text-foreground/25">Scene</div>

        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.09] rounded-3xl p-6 space-y-4 shadow-2xl shadow-black/50">
            {/* Inviter avatar + header */}
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                <span className="text-primary text-sm font-bold">{(inviterDisplay[0] || "?").toUpperCase()}</span>
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-foreground leading-tight">
                  {firstName} invited you to add {data.invite.festival_name} to Scene
                </h1>
              </div>
            </div>

            {/* Subtitle */}
            <p className="text-sm text-foreground/50">
              Here's the {sharerPicks.length} set{sharerPicks.length !== 1 ? "s" : ""} {firstName} saw — who did you see?
            </p>
          </div>
        </motion.div>

        {/* Lineup selection grid */}
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.15 }}
          className="w-full max-w-sm"
        >
          <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.09] rounded-3xl p-5 shadow-xl shadow-black/30">
            <LineupSelectionGrid
              artists={allLineupArtists}
              festivalName={data.invite.festival_name}
              isSubmitting={claiming}
              onConfirm={handleClaim}
              initialSelected={new Set(sharerPicks)}
              ctaLabel="Add to My Scene →"
            />
          </div>
        </motion.div>

        {/* Sign up link for unauthenticated users */}
        {!session && (
          <button
            onClick={() => navigate(`/auth${refCode ? `?ref=${refCode}` : ""}`)}
            className="text-xs text-foreground/30 hover:text-foreground/50 transition-colors"
          >
            New here? Sign up free →
          </button>
        )}
      </div>
    </div>
  );
}
