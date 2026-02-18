import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles, UserPlus, Check, ArrowRight, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ALL_TAGS } from "@/lib/tag-constants";

interface CompareShowSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  showId: string;
  showType: "logged" | "upcoming";
  myHighlights: string[];
  myNote: string;
  onContinueToAddShow: () => void;
}

interface ShowPreview {
  artist_name: string;
  venue_name: string | null;
  venue_location: string | null;
  show_date: string | null;
  inviter_full_name: string | null;
  inviter_username: string | null;
  photo_url?: string | null;
  artist_image_url?: string | null;
}

interface InviterTags {
  tags: string[];
  note: string | null;
}

export default function CompareShowSheet({
  open,
  onOpenChange,
  showId,
  showType,
  myHighlights,
  myNote,
  onContinueToAddShow,
}: CompareShowSheetProps) {
  const [preview, setPreview] = useState<ShowPreview | null>(null);
  const [inviterTags, setInviterTags] = useState<InviterTags | null>(null);
  const [loading, setLoading] = useState(true);
  const [followed, setFollowed] = useState(false);
  const [following, setFollowing] = useState(false);
  const [inviterUserId, setInviterUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !showId) return;

    const fetchData = async () => {
      setLoading(true);
      try {
        const fnName =
          showType === "logged"
            ? "get_show_invite_preview"
            : "get_upcoming_show_invite_preview";

        const { data } = await supabase.rpc(fnName as any, {
          p_show_id: showId,
        });

        const preview = Array.isArray(data) ? data[0] : data;
        if (preview) {
          setPreview(preview);

          // Fetch inviter's show tags if logged show
          if (showType === "logged") {
            const { data: tags } = await supabase
              .from("show_tags")
              .select("tag")
              .eq("show_id", showId);

            // Fetch inviter's show notes
            const { data: show } = await supabase
              .from("shows")
              .select("notes, user_id")
              .eq("id", showId)
              .maybeSingle();

            setInviterTags({
              tags: (tags || []).map((t) => t.tag),
              note: show?.notes || null,
            });

            if (show?.user_id) setInviterUserId(show.user_id);
          }
        }
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [open, showId, showType]);

  const inviterDisplay =
    preview?.inviter_full_name ||
    (preview?.inviter_username ? `@${preview.inviter_username}` : "Your friend");

  const firstName = inviterDisplay.startsWith("@")
    ? inviterDisplay
    : inviterDisplay.split(" ")[0];

  const sharedTags = myHighlights.filter((t) =>
    inviterTags?.tags.includes(t)
  );

  const handleFollow = async () => {
    if (!inviterUserId || following || followed) return;
    setFollowing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("followers").insert({
        follower_id: user.id,
        following_id: inviterUserId,
      });
      setFollowed(true);
    }
    setFollowing(false);
  };

  const dateLabel = preview?.show_date
    ? (() => {
        try {
          return format(parseISO(preview.show_date), "MMM d, yyyy");
        } catch {
          return preview.show_date;
        }
      })()
    : null;

  const backgroundImage =
    (preview as any)?.photo_url ||
    (preview as any)?.artist_image_url ||
    null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className="h-[92dvh] rounded-t-3xl border-t border-white/[0.08] bg-background/95 backdrop-blur-2xl p-0 overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        {/* Ambient background */}
        {backgroundImage && (
          <>
            <img
              src={backgroundImage}
              alt=""
              aria-hidden
              className="absolute inset-0 w-full h-full object-cover scale-110 pointer-events-none"
              style={{ filter: "blur(60px)", opacity: 0.08 }}
            />
            <div className="absolute inset-0 bg-gradient-to-b from-background/60 to-background pointer-events-none" />
          </>
        )}

        <div className="relative z-10 h-full overflow-y-auto overscroll-contain">
          {/* Header bar */}
          <div className="sticky top-0 z-20 flex items-center justify-between px-5 pt-5 pb-3 bg-background/80 backdrop-blur-xl border-b border-white/[0.05]">
            <div>
              <p className="text-[10px] font-semibold tracking-[0.18em] uppercase text-foreground/30">
                Compared to {firstName}
              </p>
              <h2 className="text-base font-bold text-foreground leading-tight">
                {preview?.artist_name || "Your show"}
              </h2>
              {dateLabel && (
                <p className="text-[11px] text-foreground/40">{dateLabel}</p>
              )}
            </div>
            <button
              onClick={() => onOpenChange(false)}
              className="w-8 h-8 rounded-full bg-white/[0.06] border border-white/[0.08] flex items-center justify-center text-foreground/40 hover:text-foreground/70 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-7 w-7 animate-spin text-foreground/20" />
            </div>
          ) : (
            <div className="px-5 pb-10 pt-5 space-y-6">

              {/* Shared highlights callout */}
              <AnimatePresence>
                {sharedTags.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/10 border border-primary/25 rounded-2xl p-4 flex items-start gap-3"
                  >
                    <Sparkles className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        You both felt it
                      </p>
                      <p className="text-[11px] text-foreground/50 mt-0.5">
                        {sharedTags.slice(0, 3).join(", ")}
                        {sharedTags.length > 3
                          ? ` +${sharedTags.length - 3} more`
                          : ""}
                      </p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Side-by-side comparison */}
              <div className="grid grid-cols-2 gap-3">
                {/* Your side */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-foreground/30 text-center">
                    Your take
                  </p>
                  <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3 min-h-[140px]">
                    {myHighlights.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {myHighlights.map((tag) => {
                          const isShared = sharedTags.includes(tag);
                          return (
                            <span
                              key={tag}
                              className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${
                                isShared
                                  ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_8px_hsl(var(--primary)/0.3)]"
                                  : "bg-white/[0.05] border-white/[0.08] text-foreground/60"
                              }`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-foreground/25 italic">
                        No highlights picked
                      </p>
                    )}
                    {myNote && (
                      <p className="text-[10px] text-foreground/40 mt-2 pt-2 border-t border-white/[0.06] italic leading-relaxed">
                        "{myNote}"
                      </p>
                    )}
                  </div>
                </div>

                {/* Inviter's side */}
                <div className="space-y-2">
                  <p className="text-[10px] font-semibold tracking-[0.15em] uppercase text-foreground/30 text-center">
                    {firstName}'s take
                  </p>
                  <div className="bg-white/[0.04] border border-white/[0.07] rounded-2xl p-3 min-h-[140px]">
                    {inviterTags && inviterTags.tags.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {inviterTags.tags.map((tag) => {
                          const isShared = sharedTags.includes(tag);
                          return (
                            <span
                              key={tag}
                              className={`px-2 py-1 rounded-full text-[10px] font-medium border transition-all ${
                                isShared
                                  ? "bg-primary/20 border-primary/50 text-primary shadow-[0_0_8px_hsl(var(--primary)/0.3)]"
                                  : "bg-white/[0.05] border-white/[0.08] text-foreground/60"
                              }`}
                            >
                              {tag}
                            </span>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-foreground/25 italic">
                        No highlights
                      </p>
                    )}
                    {inviterTags?.note && (
                      <p className="text-[10px] text-foreground/40 mt-2 pt-2 border-t border-white/[0.06] italic leading-relaxed">
                        "{inviterTags.note}"
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* Follow prompt */}
              {inviterUserId && (
                <div className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4 flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center flex-shrink-0">
                      <span className="text-primary text-sm font-bold">
                        {(inviterDisplay[0] || "?").toUpperCase()}
                      </span>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-foreground leading-tight">
                        {inviterDisplay}
                      </p>
                      <p className="text-[11px] text-foreground/40">
                        See their future shows
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleFollow}
                    disabled={followed || following}
                    size="sm"
                    className={`rounded-full px-4 h-8 text-xs font-semibold transition-all ${
                      followed
                        ? "bg-white/[0.08] border border-white/[0.12] text-foreground/50"
                        : "bg-primary text-primary-foreground hover:scale-105"
                    }`}
                  >
                    {following ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : followed ? (
                      <>
                        <Check className="h-3 w-3 mr-1" />
                        Following
                      </>
                    ) : (
                      <>
                        <UserPlus className="h-3 w-3 mr-1" />
                        Follow
                      </>
                    )}
                  </Button>
                </div>
              )}

              {/* Divider */}
              <div className="border-t border-white/[0.06]" />

              {/* CTA */}
              <div className="space-y-3">
                <p className="text-center text-xs text-foreground/40 px-4">
                  Now log this show properly to your Scene — rate it, and start
                  building your concert history.
                </p>
                <Button
                  onClick={() => {
                    onOpenChange(false);
                    setTimeout(onContinueToAddShow, 300);
                  }}
                  className="w-full h-12 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground font-semibold rounded-xl hover:scale-[1.02] active:scale-[0.98] transition-transform"
                >
                  Log this show in Scene
                  <ArrowRight className="h-4 w-4 ml-1.5" />
                </Button>
              </div>
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
