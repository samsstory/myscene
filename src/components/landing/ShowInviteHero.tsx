import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { MapPin, CalendarDays, Music, ArrowRight, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { motion, AnimatePresence } from "framer-motion";

interface ShowPreview {
  show_id: string;
  artist_name: string;
  artist_image_url: string | null;
  venue_name: string | null;
  venue_location: string | null;
  show_date: string | null;
  photo_url?: string | null;
  inviter_full_name: string | null;
  inviter_username: string | null;
}

interface ShowInviteHeroProps {
  showId: string;
  showType: "logged" | "upcoming";
  refCode?: string;
}

type RsvpChoice = "going" | "maybe" | "no" | null;

const RSVP_OPTIONS: { key: RsvpChoice; label: string; emoji: string }[] = [
  { key: "going", label: "I'm going!",    emoji: "🎉" },
  { key: "maybe", label: "Maybe...",      emoji: "🤔" },
  { key: "no",    label: "Can't make it", emoji: "😢" },
];

export default function ShowInviteHero({ showId, showType, refCode }: ShowInviteHeroProps) {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ShowPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rsvp, setRsvp] = useState<RsvpChoice>(null);
  const [email, setEmail] = useState("");
  const [showSignup, setShowSignup] = useState(false);
  const signupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const fnName = showType === "logged"
          ? "get_show_invite_preview"
          : "get_upcoming_show_invite_preview";
        const { data, error } = await supabase.rpc(fnName as any, { p_show_id: showId });
        if (error || !data || (Array.isArray(data) && data.length === 0)) {
          setNotFound(true);
        } else {
          setPreview(Array.isArray(data) ? data[0] : data);
        }
      } catch {
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [showId, showType]);

  useEffect(() => {
    if (showSignup && signupRef.current) {
      setTimeout(() => signupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
  }, [showSignup]);

  const buildAuthParams = (extra?: Record<string, string>) => {
    const params = new URLSearchParams();
    if (refCode) params.set("ref", refCode);
    params.set("show", showId);
    params.set("type", showType);
    if (extra) Object.entries(extra).forEach(([k, v]) => params.set(k, v));
    return params;
  };

  const handleSignup = (extra?: Record<string, string>) => {
    if (email) sessionStorage.setItem("invite_email", email);
    navigate(`/auth?${buildAuthParams(extra).toString()}`);
  };

  const backgroundImage = preview?.photo_url || preview?.artist_image_url || null;
  const inviterDisplay =
    preview?.inviter_full_name ||
    (preview?.inviter_username ? `@${preview.inviter_username}` : "A friend");

  const dateLabel = preview?.show_date
    ? (() => { try { return format(parseISO(preview.show_date), "MMMM d, yyyy"); } catch { return preview.show_date; } })()
    : null;

  const selectedOption = RSVP_OPTIONS.find((o) => o.key === rsvp);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/30" />
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-2xl p-10 max-w-sm w-full text-center space-y-4">
          <div className="text-3xl">🎵</div>
          <p className="text-foreground/70 text-sm">You've been invited to join Scene — track every concert, rank your shows, and share with friends.</p>
          <Button onClick={() => navigate(`/auth${refCode ? `?ref=${refCode}` : ""}`)} className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground">
            Create your free account →
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Full-screen blurred background */}
      {backgroundImage ? (
        <>
          <img src={backgroundImage} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110" style={{ filter: "blur(40px)", opacity: 0.2 }} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 60% at 50% 0%, hsl(var(--primary)/0.12), transparent 70%)" }} />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-5 py-12 gap-5">

        {/* Single hero card */}
        <div className="w-full max-w-sm">
          <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.09] rounded-3xl overflow-hidden shadow-2xl shadow-black/50">

            {/* Full-bleed artist image */}
            <div className="relative h-56 overflow-hidden">
              {backgroundImage ? (
                <>
                  <img src={backgroundImage} alt={preview?.artist_name} className="w-full h-full object-cover object-top" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Music className="h-16 w-16 text-primary/30" />
                </div>
              )}

              {/* Scene wordmark — top left */}
              <div className="absolute top-4 left-4 text-[10px] font-semibold tracking-[0.25em] uppercase text-white/40">
                Scene
              </div>

              {/* Artist name — bottom left */}
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-4">
                <h1 className="text-2xl font-bold text-white leading-tight" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
                  {preview?.artist_name}
                </h1>
              </div>
            </div>

            {/* Show meta + inviter + CTA */}
            <div className="px-5 py-5 space-y-4">

              {/* Venue & date — compact single line each */}
              <div className="space-y-1.5">
                {(preview?.venue_name || preview?.venue_location) && (
                  <div className="flex items-center gap-2 text-sm text-foreground/50">
                    <MapPin className="h-3 w-3 flex-shrink-0 text-foreground/30" />
                    <span>{[preview?.venue_name, preview?.venue_location].filter(Boolean).join(" · ")}</span>
                  </div>
                )}
                {dateLabel && (
                  <div className="flex items-center gap-2 text-sm text-foreground/50">
                    <CalendarDays className="h-3 w-3 flex-shrink-0 text-foreground/30" />
                    <span>{dateLabel}</span>
                  </div>
                )}
              </div>

              {/* Divider */}
              <div className="border-t border-white/[0.06]" />

              {/* Inviter row + locked pill — same line */}
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-6 h-6 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-primary text-[10px] font-bold">{(inviterDisplay[0] || "?").toUpperCase()}</span>
                  </div>
                  <p className="text-xs text-foreground/50 truncate">
                    <span className="text-foreground/80 font-medium">{inviterDisplay}</span>
                    {showType === "logged" ? " was there" : " is going"}
                  </p>
                </div>
                {showType === "logged" && (
                  <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] flex-shrink-0">
                    <Lock className="h-2.5 w-2.5 text-foreground/30" />
                    <span className="text-[10px] text-foreground/30">Review hidden</span>
                  </div>
                )}
              </div>

              {/* ── LOGGED: "Log this show" CTA ── */}
              {showType === "logged" && (
                <Button
                  onClick={() => setShowSignup(true)}
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
                >
                  Log this show & compare
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              )}

              {/* ── UPCOMING: RSVP buttons ── */}
              {showType === "upcoming" && !showSignup && (
                <div className="flex gap-2">
                  {RSVP_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setRsvp(opt.key); setShowSignup(true); }}
                      className="flex-1 rounded-xl border py-3 px-1 text-[11px] font-medium text-center transition-all duration-200 leading-tight bg-white/[0.04] border-white/[0.08] text-foreground/45 hover:bg-white/[0.08] hover:border-white/[0.16]"
                    >
                      <span className="block text-base mb-1">{opt.emoji}</span>
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Inline signup — slides in below the card */}
        <AnimatePresence>
          {showSignup && (
            <motion.div
              ref={signupRef}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="w-full max-w-sm"
            >
              <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.09] rounded-3xl p-6 space-y-4 shadow-xl shadow-black/30">
                <div className="space-y-1 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {showType === "logged"
                      ? "Create your account to log & compare"
                      : selectedOption
                        ? `Let ${inviterDisplay} know — ${selectedOption.emoji} ${selectedOption.label}`
                        : "Create your free account"}
                  </p>
                  <p className="text-[11px] text-foreground/40">
                    {showType === "logged"
                      ? `Unlock ${inviterDisplay}'s review once you've logged yours`
                      : "Free account · Takes 30 seconds"}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSignup(showType === "logged" ? { action: "log" } : { rsvp: rsvp! })}
                    className="h-11 bg-white/[0.05] border-white/[0.10] text-foreground placeholder:text-foreground/25 focus-visible:ring-primary/40 rounded-xl text-sm"
                    autoFocus
                  />
                  <Button
                    onClick={() => handleSignup(showType === "logged" ? { action: "log" } : { rsvp: rsvp! })}
                    className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
                  >
                    {showType === "logged" ? "Get started →" : "Send response →"}
                  </Button>
                </div>

                <p className="text-center text-[10px] text-foreground/25">
                  Free · No credit card required
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
