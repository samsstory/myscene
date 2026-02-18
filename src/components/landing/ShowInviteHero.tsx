import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { Music, ArrowRight, Loader2, Lock, ChevronLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { motion, AnimatePresence } from "framer-motion";

import { TAG_CATEGORIES } from "@/lib/tag-constants";

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
type FlowStep = "idle" | "highlights" | "note" | "share" | "otp";

const RSVP_OPTIONS: { key: RsvpChoice; label: string; emoji: string }[] = [
  { key: "going", label: "I'm going!",    emoji: "🎉" },
  { key: "maybe", label: "Maybe...",      emoji: "🤔" },
  { key: "no",    label: "Can't make it", emoji: "😢" },
];

function extractCityState(location: string | null): string | null {
  if (!location) return null;
  const parts = location.split(",").map((s) => s.trim());
  const stateZipIdx = parts.findIndex((p) => /^[A-Z]{2}\s+\d{5}/.test(p));
  if (stateZipIdx >= 1) {
    const city = parts[stateZipIdx - 1];
    const stateCode = parts[stateZipIdx].split(" ")[0];
    return `${city}, ${stateCode}`;
  }
  return parts[parts.length - 1] || null;
}

const slideVariants = {
  enter: { opacity: 0, y: 14 },
  center: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
};

export default function ShowInviteHero({ showId, showType, refCode }: ShowInviteHeroProps) {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ShowPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  // Upcoming RSVP
  const [rsvp, setRsvp] = useState<RsvpChoice>(null);

  // Multi-step logged flow
  const [step, setStep] = useState<FlowStep>("idle");
  const [selectedHighlights, setSelectedHighlights] = useState<string[]>([]);
  const [note, setNote] = useState("");
  const [email, setEmail] = useState("");
  const [otpSending, setOtpSending] = useState(false);
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpResent, setOtpResent] = useState(false);

  const stepRef = useRef<HTMLDivElement>(null);

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
    if (step !== "idle" && stepRef.current) {
      setTimeout(() => stepRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 150);
    }
  }, [step]);

  const inviterDisplay =
    preview?.inviter_full_name ||
    (preview?.inviter_username ? `@${preview.inviter_username}` : "A friend");

  const firstName = inviterDisplay.startsWith("@")
    ? inviterDisplay
    : inviterDisplay.split(" ")[0];

  const dateLabel = preview?.show_date
    ? (() => { try { return format(parseISO(preview.show_date), "MMM d, yyyy"); } catch { return preview.show_date; } })()
    : null;

  const cityState = extractCityState(preview?.venue_location ?? null);
  const venueDisplay = [preview?.venue_name, cityState].filter(Boolean).join(" · ");
  const backgroundImage = preview?.photo_url || preview?.artist_image_url || null;

  // ── Highlight toggle ──
  const toggleHighlight = (tag: string) => {
    setSelectedHighlights((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // ── OTP send ──
  const handleSendOtp = async () => {
    if (!email) return;
    setOtpSending(true);
    setOtpError(null);
    // Persist invite context in localStorage so it survives across tabs
    // (magic links open in a new tab where sessionStorage is empty)
    localStorage.setItem("invite_show_id", showId);
    localStorage.setItem("invite_show_type", showType);
    localStorage.setItem("invite_highlights", JSON.stringify(selectedHighlights));
    localStorage.setItem("invite_note", note);
    if (refCode) localStorage.setItem("invite_ref", refCode);

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setOtpSending(false);
    if (error) {
      setOtpError(error.message);
    } else {
      setStep("otp");
    }
  };

  // ── Resend magic link ──
  const handleResend = async () => {
    setOtpResent(false);
    await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setOtpError(null);
    setOtpResent(true);
  };

  // ── Upcoming: navigate to auth with RSVP param ──
  const handleUpcomingSignup = () => {
    const params = new URLSearchParams();
    if (refCode) params.set("ref", refCode);
    params.set("show", showId);
    params.set("type", showType);
    if (rsvp) params.set("rsvp", rsvp);
    if (email) sessionStorage.setItem("invite_email", email);
    navigate(`/auth?${params.toString()}`);
  };

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

        {/* ── Hero card ── */}
        <div className="w-full max-w-sm">
          <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.09] rounded-3xl overflow-hidden shadow-2xl shadow-black/50">

            {/* Hero image */}
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

              <div className="absolute top-4 left-4 text-[10px] font-semibold tracking-[0.25em] uppercase text-white/35">
                Scene
              </div>

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

            {/* Bottom content */}
            <div className="px-5 py-5 space-y-4">

              {/* Inviter attribution */}
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <span className="text-primary text-[11px] font-bold">{(inviterDisplay[0] || "?").toUpperCase()}</span>
                </div>
                <p className="text-xs text-foreground/50 leading-snug">
                  <span className="text-foreground/80 font-medium">{inviterDisplay}</span>
                  {showType === "logged" ? " wants to compare notes with you" : " is going to this"}
                </p>
              </div>

              {/* ── LOGGED idle state ── */}
              {showType === "logged" && step === "idle" && (
                <>
                  <div>
                    <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-foreground/25 mb-2.5">
                      Their take
                    </p>
                    <div className="relative">
                      <div className="flex flex-wrap gap-2" style={{ filter: "blur(5px)", userSelect: "none", pointerEvents: "none" }}>
                        {["Core memory", "Took me somewhere", "Chills", "Crowd went off", "Sound was dialed"].map((tag) => (
                          <span key={tag} className="px-3 py-1.5 rounded-full text-xs font-medium bg-white/[0.08] border border-white/[0.10] text-white/80">
                            {tag}
                          </span>
                        ))}
                      </div>
                      <div className="absolute inset-0 flex items-center justify-center gap-1.5">
                        <Lock className="h-3 w-3 text-foreground/35" />
                        <span className="text-[11px] text-foreground/35">Unlocks after you log yours</span>
                      </div>
                    </div>
                  </div>

                  <div className="border-t border-white/[0.06]" />

                  <div className="space-y-2">
                    <Button
                      onClick={() => setStep("highlights")}
                      className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
                    >
                      Share my take
                      <ArrowRight className="h-4 w-4 ml-1" />
                    </Button>
                    <button
                      onClick={() => navigate(`/auth${refCode ? `?ref=${refCode}` : ""}`)}
                      className="w-full text-center text-xs text-foreground/30 hover:text-foreground/50 transition-colors py-1"
                    >
                      I wasn't there
                    </button>
                  </div>
                </>
              )}

              {/* ── UPCOMING: RSVP buttons ── */}
              {showType === "upcoming" && step === "idle" && (
                <div className="flex gap-2">
                  {RSVP_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => { setRsvp(opt.key); handleUpcomingSignup(); }}
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

        {/* ── Step panels ── */}
        <AnimatePresence mode="wait">

          {/* STEP 1: Pick highlights */}
          {step === "highlights" && (
            <motion.div
              key="highlights"
              ref={stepRef}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-sm"
            >
              <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.09] rounded-3xl p-5 space-y-4 shadow-xl shadow-black/30">
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep("idle")} className="text-foreground/30 hover:text-foreground/60 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">Pick your highlights</p>
                    <p className="text-[11px] text-foreground/35">What stood out? Pick as many as you like.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  {TAG_CATEGORIES.map((cat) => (
                    <div key={cat.id}>
                      <p className="text-[10px] font-semibold tracking-[0.14em] uppercase text-foreground/25 mb-2">
                        {cat.label}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {cat.tags.map((tag) => {
                          const selected = selectedHighlights.includes(tag);
                          return (
                            <button
                              key={tag}
                              onClick={() => toggleHighlight(tag)}
                              className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                                selected
                                  ? "bg-primary/20 border-primary/50 text-primary"
                                  : "bg-white/[0.04] border-white/[0.08] text-foreground/50 hover:border-white/[0.18] hover:text-foreground/70"
                              }`}
                            >
                              {tag}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>

                <Button
                  onClick={() => setStep("note")}
                  className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
                >
                  {selectedHighlights.length > 0 ? `Continue with ${selectedHighlights.length} highlight${selectedHighlights.length > 1 ? "s" : ""}` : "Continue"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 2: Add note */}
          {step === "note" && (
            <motion.div
              key="note"
              ref={stepRef}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-sm"
            >
              <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.09] rounded-3xl p-5 space-y-4 shadow-xl shadow-black/30">
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep("highlights")} className="text-foreground/30 hover:text-foreground/60 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">Add your take</p>
                    <p className="text-[11px] text-foreground/35">Optional — but {firstName} will love reading it.</p>
                  </div>
                </div>

                <Textarea
                  placeholder={`What made ${preview?.artist_name} memorable for you?`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={280}
                  rows={4}
                  className="bg-white/[0.04] border-white/[0.10] text-foreground placeholder:text-foreground/25 focus-visible:ring-primary/40 rounded-xl text-sm resize-none"
                />

                <Button
                  onClick={() => setStep("share")}
                  className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
                >
                  {note.trim() ? "Share with " + firstName : "Skip & share"}
                  <ArrowRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </motion.div>
          )}

          {/* STEP 3: Email to share */}
          {step === "share" && (
            <motion.div
              key="share"
              ref={stepRef}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-sm"
            >
              <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.09] rounded-3xl p-5 space-y-4 shadow-xl shadow-black/30">
                <div className="flex items-center gap-2">
                  <button onClick={() => setStep("note")} className="text-foreground/30 hover:text-foreground/60 transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <div>
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      Share my take with {firstName}
                    </p>
                    <p className="text-[11px] text-foreground/35">Enter your email — we'll send you a verification link so you can see how your takes compare</p>
                  </div>
                </div>

                <div className="space-y-2.5">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") handleSendOtp(); }}
                    className="h-11 bg-white/[0.05] border-white/[0.10] text-foreground placeholder:text-foreground/25 focus-visible:ring-primary/40 rounded-xl text-sm"
                    autoFocus
                  />
                  {otpError && <p className="text-xs text-red-400">{otpError}</p>}
                  <Button
                    onClick={handleSendOtp}
                    disabled={!email || otpSending}
                    className="w-full h-11 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 disabled:opacity-50 disabled:scale-100"
                  >
                    {otpSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send Verification Link <ArrowRight className="h-4 w-4 ml-1" /></>}
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* STEP 4: Check your email (magic link) */}
          {step === "otp" && (
            <motion.div
              key="otp"
              ref={stepRef}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: "easeOut" }}
              className="w-full max-w-sm"
            >
              <div className="bg-white/[0.05] backdrop-blur-xl border border-white/[0.09] rounded-3xl p-6 space-y-4 shadow-xl shadow-black/30 text-center">
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-foreground">Check your email</p>
                  <p className="text-[11px] text-foreground/40 leading-relaxed">
                    We sent a verification link to <span className="text-foreground/60">{email}</span> — click it to continue
                  </p>
                </div>

                {otpError && <p className="text-xs text-red-400">{otpError}</p>}
                {otpResent && !otpError && <p className="text-xs text-primary/70">Link resent!</p>}

                <button
                  onClick={handleResend}
                  className="text-[11px] text-foreground/30 hover:text-foreground/60 transition-colors"
                >
                  Didn't get it? Resend link
                </button>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
