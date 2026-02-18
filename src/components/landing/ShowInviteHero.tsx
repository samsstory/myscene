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

const TEASER_HIGHLIGHTS = ["Core memory", "Took me somewhere", "Chills", "Crowd went off", "Sound was dialed"];

// Extract "City, ST" from a full address string like "123 Main St, Austin, TX 78701"
function extractCityState(location: string | null): string | null {
  if (!location) return null;
  const parts = location.split(",").map((s) => s.trim());
  const stateZipIdx = parts.findIndex((p) => /^[A-Z]{2}\s+\d{5}/.test(p));
  if (stateZipIdx >= 1) {
    const city = parts[stateZipIdx - 1];
    const stateCode = parts[stateZipIdx].split(" ")[0];
    return `${city}, ${stateCode}`;
  }
  // Fallback: if no zip pattern found, return last non-empty part
  return parts[parts.length - 1] || null;
}

export default function ShowInviteHero({ showId, showType, refCode }: ShowInviteHeroProps) {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ShowPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rsvp, setRsvp] = useState<RsvpChoice>(null);
  const [email, setEmail] = useState("");
  const [showSignup, setShowSignup] = useState(false);
  const [signupPath, setSignupPath] = useState<"log" | "skip" | null>(null);
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

  const openSignup = (path: "log" | "skip") => {
    setSignupPath(path);
    setShowSignup(true);
  };

  const backgroundImage = preview?.photo_url || preview?.artist_image_url || null;
  const inviterDisplay =
    preview?.inviter_full_name ||
    (preview?.inviter_username ? `@${preview.inviter_username}` : "A friend");

  const dateLabel = preview?.show_date
    ? (() => { try { return format(parseISO(preview.show_date), "MMM d, yyyy"); } catch { return preview.show_date; } })()
    : null;

  const cityState = extractCityState(preview?.venue_location ?? null);
  const venueDisplay = [preview?.venue_name, cityState].filter(Boolean).join(" · ");

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
          <img src={backgroundImage} alt="" aria-hidden className="absolute inset-0 w-full h-full object-cover scale-110" style={{ filter: "blur(40px)", opacity: 0.18 }} />
          <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/70 to-background" />
        </>
      ) : (
        <div className="absolute inset-0" style={{ background: "radial-gradient(ellipse 90% 60% at 50% 0%, hsl(var(--primary)/0.12), transparent 70%)" }} />
      )}

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-5 py-12 gap-4">

        {/* Single unified card */}
        <div className="w-full max-w-sm">
          <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.09] rounded-3xl overflow-hidden shadow-2xl shadow-black/50">

            {/* Hero image — taller, face-centered */}
            <div className="relative h-[280px] overflow-hidden">
              {backgroundImage ? (
                <>
                  <img
                    src={backgroundImage}
                    alt={preview?.artist_name}
                    className="w-full h-full object-cover"
                    style={{ objectPosition: "center 15%" }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                </>
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                  <Music className="h-16 w-16 text-primary/30" />
                </div>
              )}

              {/* Scene wordmark */}
              <div className="absolute top-4 left-4 text-[10px] font-semibold tracking-[0.25em] uppercase text-white/35">
                Scene
              </div>

              {/* Artist name + meta — bottom of image */}
              <div className="absolute bottom-0 left-0 right-0 px-5 pb-5">
                <h1 className="text-2xl font-bold text-white leading-tight mb-1.5" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.8)" }}>
                  {preview?.artist_name}
                </h1>
                {(venueDisplay || dateLabel) && (
                  <p className="text-xs text-white/50 leading-snug">
                    {[venueDisplay, dateLabel].filter(Boolean).join("  •  ")}
                  </p>
                )}
              </div>
            </div>

            {/* Bottom content area */}
            <div className="px-5 py-5 space-y-4">

              {/* Inviter attribution */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary text-[11px] font-bold">{(inviterDisplay[0] || "?").toUpperCase()}</span>
                </div>
                <p className="text-xs text-foreground/50 leading-snug">
                  <span className="text-foreground/80 font-medium">{inviterDisplay}</span>
                  {showType === "logged" ? " left their review" : " is going to this"}
                </p>
              </div>

              {/* ── LOGGED: blurred highlights teaser ── */}
              {showType === "logged" && (
                <>
                  {/* Section label */}
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-foreground/25 mb-2.5">
                      Their highlights
                    </p>

                    {/* Blurred pills with frosted overlay */}
                    <div className="relative">
                      <div className="flex flex-wrap gap-2" style={{ filter: "blur(5px)", userSelect: "none", pointerEvents: "none" }}>
                        {TEASER_HIGHLIGHTS.map((tag) => (
                          <span
                            key={tag}
                            className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.08] border border-white/[0.10] text-white/80"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                      {/* Frosted overlay */}
                      <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                        <Lock className="h-3 w-3 text-foreground/35" />
                        <span className="text-[11px] text-foreground/35">Unlocks after you log yours</span>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="border-t border-white/[0.06]" />

                  {/* Primary CTA */}
                  <div className="space-y-2">
                    <Button
                      onClick={() => openSignup("log")}
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
                    >
                      Log what I thought
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                    <button
                      onClick={() => openSignup("skip")}
                      className="w-full text-center text-xs text-foreground/30 hover:text-foreground/50 transition-colors py-1"
                    >
                      I wasn't there
                    </button>
                  </div>
                </>
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
                      ? signupPath === "log"
                        ? `Your review stays hidden until ${inviterDisplay} sees it`
                        : "No worries — join Scene anyway"
                      : rsvp
                        ? `Let ${inviterDisplay} know you're ${rsvp === "going" ? "going 🎉" : rsvp === "maybe" ? "maybe going 🤔" : "not making it 😢"}`
                        : "Create your free account"}
                  </p>
                  <p className="text-[11px] text-foreground/40">
                    {showType === "logged"
                      ? signupPath === "log"
                        ? `Create a free account to log ${preview?.artist_name} and compare notes`
                        : "Track shows you've been to and discover what your friends think"
                      : "Free account · Takes 30 seconds"}
                  </p>
                </div>

                <div className="space-y-2.5">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        if (showType === "logged") handleSignup(signupPath === "log" ? { action: "log" } : {});
                        else handleSignup(rsvp ? { rsvp: rsvp! } : {});
                      }
                    }}
                    className="h-11 bg-white/[0.05] border-white/[0.10] text-foreground placeholder:text-foreground/25 focus-visible:ring-primary/40 rounded-xl text-sm"
                    autoFocus
                  />
                  <Button
                    onClick={() => {
                      if (showType === "logged") handleSignup(signupPath === "log" ? { action: "log" } : {});
                      else handleSignup(rsvp ? { rsvp: rsvp! } : {});
                    }}
                    className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
                  >
                    {showType === "logged"
                      ? signupPath === "log" ? "Get started →" : "Join Scene →"
                      : "Send response →"}
                  </Button>
                </div>

              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
