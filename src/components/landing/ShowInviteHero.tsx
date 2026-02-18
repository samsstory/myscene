import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { MapPin, CalendarDays, Music, ArrowRight, Loader2 } from "lucide-react";
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

const RSVP_OPTIONS: {
  key: RsvpChoice;
  logged: string;
  upcoming: string;
  emoji: string;
}[] = [
  { key: "going",  logged: "I was there too", upcoming: "I'm going!",    emoji: "🎉" },
  { key: "maybe",  logged: "Sounds amazing",   upcoming: "Maybe...",      emoji: "🤔" },
  { key: "no",     logged: "Missed it",         upcoming: "Can't make it", emoji: "😢" },
];

export default function ShowInviteHero({ showId, showType, refCode }: ShowInviteHeroProps) {
  const navigate = useNavigate();
  const [preview, setPreview] = useState<ShowPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [rsvp, setRsvp] = useState<RsvpChoice>(null);
  const [email, setEmail] = useState("");
  const signupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchPreview = async () => {
      try {
        const fnName =
          showType === "logged"
            ? "get_show_invite_preview"
            : "get_upcoming_show_invite_preview";

        const { data, error } = await supabase.rpc(fnName as any, { p_show_id: showId });
        if (error || !data || (Array.isArray(data) && data.length === 0)) {
          console.error("[ShowInviteHero] preview fetch failed:", error);
          setNotFound(true);
        } else {
          setPreview(Array.isArray(data) ? data[0] : data);
        }
      } catch (err) {
        console.error("[ShowInviteHero] unexpected error:", err);
        setNotFound(true);
      } finally {
        setLoading(false);
      }
    };
    fetchPreview();
  }, [showId, showType]);

  // Scroll to inline signup when RSVP is selected
  useEffect(() => {
    if (rsvp && signupRef.current) {
      setTimeout(() => {
        signupRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 150);
    }
  }, [rsvp]);

  const handleRsvpSelect = (choice: RsvpChoice) => {
    setRsvp(choice);
  };

  const handleSignup = () => {
    if (email) {
      sessionStorage.setItem("invite_email", email);
    }
    const params = new URLSearchParams();
    if (refCode) params.set("ref", refCode);
    params.set("show", showId);
    params.set("type", showType);
    if (rsvp) params.set("rsvp", rsvp);
    navigate(`/auth?${params.toString()}`);
  };

  const backgroundImage = preview?.photo_url || preview?.artist_image_url || null;

  const inviterDisplay =
    preview?.inviter_full_name ||
    (preview?.inviter_username ? `@${preview.inviter_username}` : "A friend");

  const dateLabel = preview?.show_date
    ? (() => {
        try { return format(parseISO(preview.show_date), "MMMM d, yyyy"); }
        catch { return preview.show_date; }
      })()
    : null;

  const selectedOption = RSVP_OPTIONS.find((o) => o.key === rsvp);

  const signupHeadline = rsvp === "going"
    ? `Let ${inviterDisplay} know you're going 🎉`
    : rsvp === "maybe"
    ? `Let ${inviterDisplay} know you're interested 🤔`
    : `Let ${inviterDisplay} know you can't make it 😢`;

  const signupSubtitle = rsvp === "going"
    ? `To confirm your spot and notify ${inviterDisplay}, create your free Scene account.`
    : rsvp === "maybe"
    ? `To save this show and let ${inviterDisplay} know, create your free Scene account.`
    : `To send your response to ${inviterDisplay}, create your free Scene account.`;

  // Loading skeleton
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-foreground/30" />
      </div>
    );
  }

  // Not found fallback
  if (notFound) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-2xl p-10 max-w-sm w-full text-center space-y-4">
          <div className="text-3xl">🎵</div>
          <p className="text-foreground/70 text-sm">
            {inviterDisplay !== "A friend" ? `${inviterDisplay} has invited you` : "You've been invited"} to join Scene — track every concert, rank your shows, and share with friends.
          </p>
          <Button
            onClick={() => {
              const params = new URLSearchParams();
              if (refCode) params.set("ref", refCode);
              navigate(`/auth?${params.toString()}`);
            }}
            className="w-full bg-gradient-to-r from-primary to-primary/80 text-primary-foreground"
          >
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
          <img
            src={backgroundImage}
            alt=""
            aria-hidden
            className="absolute inset-0 w-full h-full object-cover scale-110"
            style={{ filter: "blur(32px)", opacity: 0.25 }}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/70 via-background/60 to-background/90" />
        </>
      ) : (
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 90% 60% at 50% 0%, hsl(var(--primary)/0.15), transparent 70%)",
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-start min-h-screen px-5 pt-16 pb-12 gap-6">

        {/* Scene wordmark */}
        <div className="text-xs font-semibold tracking-[0.2em] uppercase text-foreground/30 mb-2">
          Scene
        </div>

        {/* Invite attribution */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
            <span className="text-primary text-sm font-bold">
              {(inviterDisplay[0] || "?").toUpperCase()}
            </span>
          </div>
          <p className="text-sm text-foreground/65 leading-snug max-w-[240px]">
            <span className="text-foreground font-semibold">{inviterDisplay}</span>{" "}
            {showType === "logged"
              ? "logged this show and wants you to discover Scene"
              : "is going to this show and wants you there"}
          </p>
        </div>

        {/* Glass show card */}
        <div className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.10] rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl shadow-black/40">
          {/* Artist image strip */}
          {backgroundImage && (
            <div className="relative h-40 overflow-hidden">
              <img
                src={backgroundImage}
                alt={preview?.artist_name}
                className="w-full h-full object-cover"
                style={{ filter: preview?.photo_url ? undefined : "blur(1px)" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent" />
              {/* Artist name overlaid on image */}
              <div className="absolute bottom-0 left-0 right-0 p-4">
                <h1 className="text-2xl font-bold text-white leading-tight drop-shadow-lg">
                  {preview?.artist_name}
                </h1>
              </div>
            </div>
          )}

          <div className="p-5 space-y-3">
            {/* Artist name (if no image) */}
            {!backgroundImage && (
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                  <Music className="h-5 w-5 text-primary/70" />
                </div>
                <h1 className="text-2xl font-bold text-foreground leading-tight">
                  {preview?.artist_name}
                </h1>
              </div>
            )}

            {/* Venue */}
            {(preview?.venue_name || preview?.venue_location) && (
              <div className="flex items-center gap-2 text-sm text-foreground/55">
                <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-foreground/35" />
                <span>
                  {[preview?.venue_name, preview?.venue_location]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </div>
            )}

            {/* Date */}
            {dateLabel && (
              <div className="flex items-center gap-2 text-sm text-foreground/55">
                <CalendarDays className="h-3.5 w-3.5 flex-shrink-0 text-foreground/35" />
                <span>{dateLabel}</span>
              </div>
            )}

            {/* RSVP buttons */}
            <div className="border-t border-white/[0.06] pt-4 space-y-2.5">
              <p className="text-[11px] text-foreground/40 uppercase tracking-widest text-center">
                {showType === "logged" ? "Were you there?" : "Are you going?"}
              </p>
              <div className="flex gap-2">
                {RSVP_OPTIONS.map((opt) => (
                  <button
                    key={opt.key}
                    onClick={() => handleRsvpSelect(opt.key)}
                    className={[
                      "flex-1 rounded-xl border py-3 px-1 text-[11px] font-medium text-center transition-all duration-200 leading-tight",
                      rsvp === opt.key
                        ? opt.key === "going"
                          ? "bg-primary/[0.16] border-primary/[0.50] text-primary shadow-[0_0_12px_hsl(var(--primary)/0.25)]"
                          : opt.key === "maybe"
                          ? "bg-amber-500/[0.16] border-amber-400/[0.50] text-amber-400 shadow-[0_0_12px_rgba(251,191,36,0.2)]"
                          : "bg-white/[0.12] border-white/[0.35] text-foreground/75"
                        : "bg-white/[0.04] border-white/[0.08] text-foreground/45 hover:bg-white/[0.08] hover:border-white/[0.16]",
                    ].join(" ")}
                  >
                    <span className="block text-base mb-1">{opt.emoji}</span>
                    {showType === "logged" ? opt.logged : opt.upcoming}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Inline signup — expands after RSVP selection */}
        <AnimatePresence>
          {rsvp && (
            <motion.div
              ref={signupRef}
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.97 }}
              transition={{ duration: 0.3, ease: "easeOut" }}
              className="w-full max-w-sm"
            >
              <div className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.10] rounded-2xl p-6 space-y-4 shadow-xl shadow-black/30">
                {/* Headline */}
                <div className="space-y-1.5 text-center">
                  <p className="text-base font-semibold text-foreground leading-snug">
                    {signupHeadline}
                  </p>
                  <p className="text-xs text-foreground/50 leading-relaxed">
                    {signupSubtitle}
                  </p>
                </div>

                {/* Your RSVP summary */}
                <div className="flex items-center justify-center gap-2 py-2 px-4 rounded-xl bg-white/[0.05] border border-white/[0.08]">
                  <span className="text-base">{selectedOption?.emoji}</span>
                  <span className="text-sm text-foreground/70">
                    Your response:{" "}
                    <span className="text-foreground font-medium">
                      {showType === "logged" ? selectedOption?.logged : selectedOption?.upcoming}
                    </span>
                  </span>
                </div>

                {/* Email input */}
                <div className="space-y-2.5">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSignup()}
                    className="h-12 bg-white/[0.06] border-white/[0.12] text-foreground placeholder:text-foreground/30 focus-visible:ring-primary/40"
                    autoFocus
                  />
                  <Button
                    onClick={handleSignup}
                    className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-sm hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200 flex items-center justify-center gap-2"
                  >
                    Verify email & send response
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>

                <p className="text-center text-[10px] text-foreground/30 leading-relaxed">
                  Free account · Your email is used to verify your response and let you track every show you've been to.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Subtle Scene description for context */}
        {!rsvp && (
          <p className="text-[11px] text-foreground/25 text-center max-w-[220px] leading-relaxed mt-2">
            Scene is where music fans log concerts, rank their shows, and share with friends.
          </p>
        )}
      </div>
    </div>
  );
}
