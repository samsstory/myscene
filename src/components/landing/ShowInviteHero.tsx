import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { MapPin, CalendarDays, Music } from "lucide-react";
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [email, setEmail] = useState("");

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

  const handleRsvpSelect = (choice: RsvpChoice) => {
    setRsvp(choice);
    setDrawerOpen(true);
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
  const confirmHeadline = rsvp === "going"
    ? `${selectedOption?.emoji} You're going to ${preview?.artist_name ?? "this show"}!`
    : rsvp === "maybe"
    ? `${selectedOption?.emoji} Interested in ${preview?.artist_name ?? "this show"}?`
    : `${selectedOption?.emoji} Can't make it — log it later on Scene`;

  // Skeleton while loading
  if (loading) {
    return (
      <div className="relative w-full overflow-hidden" style={{ minHeight: "340px" }}>
        <div className="absolute inset-0 bg-white/[0.02] animate-pulse" />
      </div>
    );
  }

  // Graceful fallback if show not found
  if (notFound) {
    return (
      <div className="relative w-full overflow-hidden flex items-center justify-center py-16 px-6">
        <div className="bg-white/[0.04] backdrop-blur-md border border-white/[0.08] rounded-2xl p-8 max-w-sm w-full text-center">
          <p className="text-foreground/60 text-sm mb-4">
            You've been invited to join Scene
          </p>
          <Button
            onClick={() => {
              const params = new URLSearchParams();
              if (refCode) params.set("ref", refCode);
              navigate(`/auth?${params.toString()}`);
            }}
            className="w-full bg-gradient-to-r from-primary to-primary/80"
          >
            Create your account
          </Button>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="relative w-full overflow-hidden" style={{ minHeight: "380px" }}>
        {/* Blurred background */}
        {backgroundImage ? (
          <>
            <img
              src={backgroundImage}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110"
              style={{ filter: "blur(24px)", opacity: 0.35 }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 via-background/40 to-background" />
          </>
        ) : (
          <div
            className="absolute inset-0"
            style={{
              background:
                "radial-gradient(ellipse 80% 60% at 50% 0%, hsl(var(--primary)/0.18), transparent 70%)",
            }}
          />
        )}

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center justify-center min-h-[380px] px-6 py-12">
          {/* Invite attribution */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
              <span className="text-primary text-xs font-bold">
                {(inviterDisplay[0] || "?").toUpperCase()}
              </span>
            </div>
            <p className="text-sm text-foreground/70">
              <span className="text-foreground/90 font-semibold">{inviterDisplay}</span>{" "}
              {showType === "logged"
                ? "logged this show and wants you to discover Scene"
                : "is going to this show and wants you there"}
            </p>
          </div>

          {/* Glass show card */}
          <div className="bg-white/[0.06] backdrop-blur-md border border-white/[0.10] rounded-2xl overflow-hidden w-full max-w-sm shadow-2xl shadow-black/30">
            {/* Artist image strip */}
            {backgroundImage && (
              <div className="relative h-32 overflow-hidden">
                <img
                  src={backgroundImage}
                  alt={preview?.artist_name}
                  className="w-full h-full object-cover"
                  style={{ filter: preview?.photo_url ? undefined : "blur(2px) scale(1.05)" }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              </div>
            )}

            {/* Show details */}
            <div className="p-5 space-y-3">
              {/* Artist name */}
              <div className="flex items-center gap-3">
                {!backgroundImage && (
                  <div className="w-10 h-10 rounded-xl bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <Music className="h-5 w-5 text-primary/70" />
                  </div>
                )}
                <h2
                  className="text-xl font-bold text-foreground leading-tight"
                  style={{ textShadow: "0 0 16px rgba(255,255,255,0.3)" }}
                >
                  {preview?.artist_name}
                </h2>
              </div>

              {/* Venue */}
              {(preview?.venue_name || preview?.venue_location) && (
                <div className="flex items-center gap-2 text-sm text-foreground/60">
                  <MapPin className="h-3.5 w-3.5 flex-shrink-0 text-foreground/40" />
                  <span>
                    {[preview?.venue_name, preview?.venue_location]
                      .filter(Boolean)
                      .join(" · ")}
                  </span>
                </div>
              )}

              {/* Date */}
              {dateLabel && (
                <div className="flex items-center gap-2 text-sm text-foreground/60">
                  <CalendarDays className="h-3.5 w-3.5 flex-shrink-0 text-foreground/40" />
                  <span>{dateLabel}</span>
                </div>
              )}

              {/* Divider + RSVP intent */}
              <div className="border-t border-white/[0.06] pt-3 space-y-2">
                <p className="text-[11px] text-foreground/40 uppercase tracking-wide text-center">
                  {showType === "logged" ? "Were you there?" : "Are you going?"}
                </p>
                <div className="flex gap-2">
                  {RSVP_OPTIONS.map((opt) => (
                    <button
                      key={opt.key}
                      onClick={() => handleRsvpSelect(opt.key)}
                      className={[
                        "flex-1 rounded-xl border py-2.5 px-1 text-[11px] font-medium text-center transition-all duration-200 leading-tight",
                        rsvp === opt.key
                          ? opt.key === "going"
                            ? "bg-primary/[0.16] border-primary/[0.40] text-primary"
                            : opt.key === "maybe"
                            ? "bg-amber-500/[0.16] border-amber-400/[0.40] text-amber-400"
                            : "bg-white/[0.10] border-white/[0.30] text-foreground/70"
                          : "bg-white/[0.04] border-white/[0.08] text-foreground/50 hover:bg-white/[0.08] hover:border-white/[0.16]",
                      ].join(" ")}
                    >
                      <span className="block text-base mb-0.5">{opt.emoji}</span>
                      {showType === "logged" ? opt.logged : opt.upcoming}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Scroll hint */}
          <p className="mt-6 text-[11px] text-foreground/30 tracking-wide uppercase">
            Scroll to learn more ↓
          </p>
        </div>
      </div>

      {/* RSVP Signup Drawer */}
      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="bg-background border-white/[0.10] px-6 pb-10">
          <DrawerHeader className="text-center pt-6 pb-2">
            <DrawerTitle className="text-xl font-bold text-foreground leading-tight">
              {confirmHeadline}
            </DrawerTitle>
            <p className="text-sm text-foreground/50 mt-2">
              Create a free account to save your spot and track every show.
            </p>
          </DrawerHeader>

          <div className="mt-4 space-y-3">
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
              className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold text-base hover:scale-[1.02] active:scale-[0.98] transition-transform duration-200"
            >
              Create account & save →
            </Button>
            <p className="text-center text-[11px] text-foreground/30">
              Free · No credit card required
            </p>
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}
