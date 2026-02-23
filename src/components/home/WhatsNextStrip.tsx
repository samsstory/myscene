import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { format, parseISO, isThisWeek, isThisMonth, addMonths, isAfter, startOfToday } from "date-fns";
import { Plus, Music2, CheckCircle2, CircleHelp, X, Users, Check, Loader2, NotebookPen } from "lucide-react";
import { usePlanUpcomingShow, type UpcomingShow } from "@/hooks/usePlanUpcomingShow";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useFollowers } from "@/hooks/useFollowers";
import { useFriendUpcomingShows, type FriendShow } from "@/hooks/useFriendUpcomingShows";
import type { FollowerProfile } from "@/hooks/useFollowers";
import PlanShowSheet from "./PlanShowSheet";
import UpcomingShowDetailSheet from "./UpcomingShowDetailSheet";
import QuickAddSheet, { type QuickAddPrefill } from "@/components/QuickAddSheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

// ─── DEMO OVERRIDE ───────────────────────────────────────────────────────────
// Temporary: shows 10 dummy friends on the first Mine card to preview the UI
const DEMO_10_FRIENDS: FriendShow[] = Array.from({ length: 10 }, (_, i) => ({
  id: `demo-friend-${i}`,
  show_date: "2025-03-08",
  artist_name: "Fred again..",
  artist_image_url: null,
  venue_name: "MSG",
  venue_location: "New York",
  friend: {
    id: `demo-user-${i}`,
    username: ["alex_burns", "janine.w", "dj_tobi", "sarah_m", "ben.c", "lucy.v", "marcus_k", "priya_d", "noah_j", "chloe_r"][i],
    full_name: ["Alex Burns", "Janine W", "DJ Tobi", "Sarah M", "Ben C", "Lucy V", "Marcus K", "Priya D", "Noah J", "Chloe R"][i],
    avatar_url: [
      "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=128&h=128&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=128&h=128&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=128&h=128&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=128&h=128&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=128&h=128&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=128&h=128&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=128&h=128&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=128&h=128&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=128&h=128&fit=crop&crop=face",
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=128&h=128&fit=crop&crop=face",
    ][i],
  },
}));
// ─────────────────────────────────────────────────────────────────────────────


interface WhatsNextStripProps {
  onPlanShow?: () => void;
}

const RSVP_BADGE = {
  going:     { Icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" },
  maybe:     { Icon: CircleHelp,  color: "text-amber-400",   bg: "bg-amber-500/20 border-amber-500/30"   },
  not_going: { Icon: X,            color: "text-red-400",     bg: "bg-red-500/20 border-red-500/30"        },
} as const;

function FriendAvatarStack({ friends }: { friends: FollowerProfile[] }) {
  if (friends.length === 0) return null;
  const visible = friends.slice(0, 3);
  const overflowCount = friends.length - visible.length;
  return (
    <div className="absolute top-2 left-2 flex items-center gap-1">
      <div className="flex items-center">
        {visible.map((friend, i) => (
          friend.avatar_url ? (
            <img
              key={friend.id}
              src={friend.avatar_url}
              alt={friend.username ?? "Friend"}
              className="w-5 h-5 rounded-full border border-black/60 object-cover"
              style={{ marginLeft: i === 0 ? 0 : -6, zIndex: i }}
            />
          ) : (
            <div
              key={friend.id}
              className="w-5 h-5 rounded-full border border-black/60 bg-primary/70 flex items-center justify-center"
              style={{ marginLeft: i === 0 ? 0 : -6, zIndex: i }}
            >
              <span className="text-[7px] font-bold text-primary-foreground leading-none">
                {(friend.username ?? friend.full_name ?? "?")[0].toUpperCase()}
              </span>
            </div>
          )
        ))}
      </div>
      {overflowCount > 0 && (
        <span
          className="text-[9px] font-semibold text-white/70 leading-none"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
        >
          +{overflowCount}
        </span>
      )}
    </div>
  );
}

/** Stacked avatar row shown on Mine chips when friends are going to the same show */
function GoingWithAvatarStack({ goingWith }: { goingWith: FriendShow[] }) {
  if (goingWith.length === 0) return null;
  const visible = goingWith.slice(0, 3);
  const overflow = goingWith.length - visible.length;

  return (
    <div className="flex items-center gap-1 mb-1">
      <div className="flex items-center">
        {visible.map((fs, i) => (
          fs.friend.avatar_url ? (
            <img
              key={fs.friend.id}
              src={fs.friend.avatar_url}
              alt={fs.friend.username ?? "Friend"}
              className="w-5 h-5 rounded-full border border-black/70 object-cover"
              style={{ marginLeft: i === 0 ? 0 : -6, zIndex: visible.length - i }}
            />
          ) : (
            <div
              key={fs.friend.id}
              className="w-5 h-5 rounded-full border border-black/70 bg-primary flex items-center justify-center"
              style={{ marginLeft: i === 0 ? 0 : -6, zIndex: visible.length - i }}
            >
              <span className="text-[7px] font-bold text-primary-foreground leading-none">
                {(fs.friend.username ?? fs.friend.full_name ?? "?")[0].toUpperCase()}
              </span>
            </div>
          )
        ))}
        {overflow > 0 && (
          <div
            className="w-5 h-5 rounded-full border border-black/70 bg-white/20 flex items-center justify-center"
            style={{ marginLeft: -6, zIndex: 0 }}
          >
            <span className="text-[7px] font-bold text-white/90 leading-none">+{overflow}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function UpcomingChip({
  show,
  friendsHere,
  goingWith,
  onTap,
}: {
  show: UpcomingShow;
  friendsHere: FollowerProfile[];
  goingWith: FriendShow[];
  onTap: (show: UpcomingShow, goingWith: FriendShow[]) => void;
}) {
  const dateLabel = show.show_date
    ? (() => { try { return format(parseISO(show.show_date), "MMM d"); } catch { return ""; } })()
    : "Date TBD";

  const venueLabel = show.venue_name
    ? (show.venue_name.length > 16 ? show.venue_name.slice(0, 14) + "…" : show.venue_name)
    : show.venue_location
    ? (show.venue_location.length > 16 ? show.venue_location.slice(0, 14) + "…" : show.venue_location)
    : null;

  const badge = RSVP_BADGE[show.rsvp_status ?? "going"];
  const BadgeIcon = badge.Icon;

  return (
    <button
      className="relative flex-shrink-0 w-32 h-36 rounded-2xl overflow-hidden cursor-pointer select-none text-left"
      onClick={() => onTap(show, goingWith)}
    >
      {show.artist_image_url ? (
        <>
          <img
            src={show.artist_image_url}
            alt={show.artist_name}
            className="absolute inset-0 w-full h-full object-cover scale-110"
            style={{ filter: "blur(2px)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-transparent" />
      )}

      <div className={`absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full border backdrop-blur-sm ${badge.bg}`}>
        <BadgeIcon className={`h-3 w-3 ${badge.color}`} />
      </div>

      {show.raw_input === "festival" && (
        <span className="absolute top-2 left-2 text-[7px] uppercase tracking-widest font-bold text-primary bg-primary/20 backdrop-blur-sm px-1.5 py-0.5 rounded-full border border-primary/30 z-10">
          Festival
        </span>
      )}

      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        {/* Stacked friend avatars when friends are going to same show */}
        <GoingWithAvatarStack goingWith={goingWith} />
        <p
          className="text-xs font-bold text-white leading-tight line-clamp-2"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {show.artist_name}
        </p>
        <p
          className="text-[10px] text-white/70 mt-0.5"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {dateLabel}
          {venueLabel && ` · ${venueLabel}`}
        </p>
      </div>
    </button>
  );
}


/** A FriendShow augmented with all friends who share the same event */
interface GroupedFriendShow extends FriendShow {
  allFriends: FollowerProfile[];
}

function FriendChip({
  show,
  isAdded,
  isToggling,
  onTap,
  onToggle,
}: {
  show: GroupedFriendShow;
  isAdded: boolean;
  isToggling: boolean;
  onTap: (show: GroupedFriendShow) => void;
  onToggle: (show: GroupedFriendShow, e: React.MouseEvent) => void;
}) {
  const dateLabel = show.show_date
    ? (() => { try { return format(parseISO(show.show_date), "MMM d"); } catch { return ""; } })()
    : "Date TBD";

  const venueLabel = show.venue_name
    ? (show.venue_name.length > 16 ? show.venue_name.slice(0, 14) + "…" : show.venue_name)
    : show.venue_location
    ? (show.venue_location.length > 16 ? show.venue_location.slice(0, 14) + "…" : show.venue_location)
    : null;

  // Build stacked avatar info
  const allFriends = show.allFriends;
  const visibleAvatars = allFriends.slice(0, 3);
  const extraCount = allFriends.length - visibleAvatars.length;

  // Label: "Alex + 2 more going" or "Alex going"
  const firstName = allFriends[0]?.full_name?.split(" ")[0]
    ?? allFriends[0]?.username
    ?? "Friend";
  const goingLabel = extraCount > 0
    ? `${firstName} + ${extraCount} more going`
    : `${firstName} going`;

  return (
    <button
      className="relative flex-shrink-0 w-32 h-36 rounded-2xl overflow-hidden cursor-pointer select-none text-left"
      onClick={() => onTap(show)}
    >
      {show.artist_image_url ? (
        <>
          <img
            src={show.artist_image_url}
            alt={show.artist_name}
            className="absolute inset-0 w-full h-full object-cover scale-110"
            style={{ filter: "blur(2px)" }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/10" />
        </>
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-primary/15 to-transparent" />
      )}

      {/* Stacked friend avatars — top-left */}
      <div className="absolute top-2 left-2 flex items-center">
        {visibleAvatars.map((f, i) =>
          f.avatar_url ? (
            <img
              key={f.id}
              src={f.avatar_url}
              alt={f.username ?? f.full_name ?? "Friend"}
              className="w-6 h-6 rounded-full border border-black/60 object-cover"
              style={{ marginLeft: i === 0 ? 0 : -8, zIndex: visibleAvatars.length - i }}
            />
          ) : (
            <div
              key={f.id}
              className="w-6 h-6 rounded-full border border-black/60 bg-primary/70 flex items-center justify-center"
              style={{ marginLeft: i === 0 ? 0 : -8, zIndex: visibleAvatars.length - i }}
            >
              <span className="text-[8px] font-bold text-primary-foreground leading-none">
                {(f.username ?? f.full_name ?? "?")[0].toUpperCase()}
              </span>
            </div>
          )
        )}
        {extraCount > 0 && (
          <div
            className="w-6 h-6 rounded-full border border-black/60 bg-white/20 flex items-center justify-center"
            style={{ marginLeft: -8, zIndex: 0 }}
          >
            <span className="text-[7px] font-bold text-white/90 leading-none">+{extraCount}</span>
          </div>
        )}
      </div>

      {/* Quick add/remove toggle — top-right */}
      <button
        onClick={(e) => onToggle(show, e)}
        disabled={isToggling}
        className={`absolute top-2 right-2 w-6 h-6 rounded-full border backdrop-blur-sm flex items-center justify-center transition-all ${
          isAdded
            ? "bg-emerald-500/30 border-emerald-500/50"
            : "bg-black/30 border-white/20 hover:bg-white/20"
        }`}
      >
        {isToggling ? (
          <Loader2 className="h-3 w-3 text-white/70 animate-spin" />
        ) : isAdded ? (
          <Check className="h-3 w-3 text-emerald-400" />
        ) : (
          <Plus className="h-3 w-3 text-white/60" />
        )}
      </button>

      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        <p
          className="text-xs font-bold text-white leading-tight line-clamp-1"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {show.artist_name}
        </p>
        <p
          className="text-[9px] text-white/80 mt-0.5 leading-tight line-clamp-1"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {goingLabel}
        </p>
        <p
          className="text-[9px] text-white/55 mt-0.5"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.8)" }}
        >
          {dateLabel}
          {venueLabel && ` · ${venueLabel}`}
        </p>
      </div>
    </button>
  );
}

function AddShowChip({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex-shrink-0 w-28 h-36 rounded-2xl border border-dashed border-white/20 bg-white/[0.04] hover:bg-white/[0.07] transition-colors flex flex-col items-center justify-center gap-2 group"
    >
      <div className="w-9 h-9 rounded-full bg-white/[0.08] border border-white/[0.14] flex items-center justify-center group-hover:bg-white/[0.14] transition-colors">
        <Plus className="h-4 w-4 text-white/60" />
      </div>
      <span className="text-[11px] font-medium text-white/50 group-hover:text-white/70 transition-colors text-center leading-tight">
        Plan a<br />Show
      </span>
    </button>
  );
}

/** Bottom sheet listing all friends going to a Mine show */
function FriendsGoingSheet({
  show,
  goingWith,
  open,
  onOpenChange,
}: {
  show: UpcomingShow | null;
  goingWith: FriendShow[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!show) return null;
  const dateLabel = show.show_date
    ? (() => { try { return format(parseISO(show.show_date), "EEEE, MMMM d"); } catch { return ""; } })()
    : "Date TBD";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-background border-white/10 pb-safe">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left text-base font-semibold">
            {show.artist_name}
          </SheetTitle>
          <p className="text-xs text-muted-foreground text-left">{dateLabel}{show.venue_name ? ` · ${show.venue_name}` : ""}</p>
        </SheetHeader>

        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary/70" />
          <span className="text-sm font-semibold text-foreground">
            {goingWith.length} {goingWith.length === 1 ? "friend" : "friends"} going
          </span>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {goingWith.map((fs) => {
            const name = fs.friend.full_name ?? fs.friend.username ?? "Friend";
            const username = fs.friend.username;
            const initial = (username ?? name ?? "?")[0].toUpperCase();
            return (
              <div key={fs.friend.id} className="flex items-center gap-3 py-1">
                {fs.friend.avatar_url ? (
                  <img
                    src={fs.friend.avatar_url}
                    alt={name}
                    className="w-9 h-9 rounded-full object-cover border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary/90">{initial}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{name}</p>
                  {username && (
                    <p className="text-xs text-muted-foreground truncate">@{username}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function FriendShowDetailSheet({
  show,
  open,
  onOpenChange,
  isAdded,
  isToggling,
  onToggle,
}: {
  show: GroupedFriendShow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isAdded: boolean;
  isToggling: boolean;
  onToggle: (show: GroupedFriendShow) => void;
}) {
  if (!show) return null;
  const dateLabel = show.show_date
    ? (() => { try { return format(parseISO(show.show_date), "EEEE, MMMM d, yyyy"); } catch { return ""; } })()
    : "Date TBD";

  const allFriends = show.allFriends ?? [show.friend];
  const friendCount = allFriends.length;
  const friendLabel = friendCount === 1
    ? `${allFriends[0].full_name?.split(" ")[0] ?? allFriends[0].username ?? "Friend"} is going`
    : `${friendCount} friends going`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-background border-white/10 pb-safe">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left text-base font-semibold">
            {show.artist_name}
          </SheetTitle>
        </SheetHeader>

        {show.artist_image_url && (
          <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-4">
            <img src={show.artist_image_url} alt={show.artist_name} className="w-full h-full object-cover" style={{ filter: "blur(1px)" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <div className="space-y-3 text-sm mb-5">
          {/* Who's going */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center">
              {allFriends.slice(0, 4).map((f, i) =>
                f.avatar_url ? (
                  <img
                    key={f.id}
                    src={f.avatar_url}
                    alt={f.username ?? f.full_name ?? ""}
                    className="w-7 h-7 rounded-full border-2 border-background object-cover"
                    style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i }}
                  />
                ) : (
                  <div
                    key={f.id}
                    className="w-7 h-7 rounded-full border-2 border-background bg-primary/40 flex items-center justify-center"
                    style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i }}
                  >
                    <span className="text-[9px] font-bold text-primary-foreground">
                      {(f.username ?? f.full_name ?? "?")[0].toUpperCase()}
                    </span>
                  </div>
                )
              )}
            </div>
            <span className="text-sm font-medium text-foreground">{friendLabel}</span>
          </div>
          <div className="text-muted-foreground text-sm">{dateLabel}</div>
          {(show.venue_name || show.venue_location) && (
            <div className="text-muted-foreground text-sm">
              {show.venue_name}{show.venue_name && show.venue_location ? " · " : ""}{show.venue_location}
            </div>
          )}
        </div>

        <button
          onClick={() => onToggle(show)}
          disabled={isToggling}
          className={`w-full h-11 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            isAdded
              ? "bg-white/[0.08] border border-white/10 text-white/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isToggling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAdded ? (
            <>
              <Check className="h-4 w-4" />
              Added to my calendar · tap to remove
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              I'm going too
            </>
          )}
        </button>
      </SheetContent>
    </Sheet>
  );
}

export default function WhatsNextStrip({ onPlanShow }: WhatsNextStripProps) {
  const { upcomingShows, isLoading, deleteUpcomingShow, updateRsvpStatus, saveUpcomingShow, refetch } = usePlanUpcomingShow();
  const { following } = useFollowers();
  const followingIds = useMemo(() => following.map(f => f.id), [following]);
  const { friendsByDate, friendShows } = useFriendUpcomingShows(followingIds);

  const [activeTab, setActiveTab] = useState<"mine" | "friends" | "discover">("mine");
  type TimeFilter = "all" | "week" | "month" | "later";
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  // Reset filter when switching tabs
  useEffect(() => {
    setTimeFilter("all");
  }, [activeTab]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<UpcomingShow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedFriendShow, setSelectedFriendShow] = useState<GroupedFriendShow | null>(null);
  const [friendDetailOpen, setFriendDetailOpen] = useState(false);
  // goingWith for the currently-open detail sheet
  const [friendsGoingWith, setFriendsGoingWith] = useState<FriendShow[]>([]);
  // Track which friend shows the user has added (by source show id → own show id)
  const [addedFriendShowIds, setAddedFriendShowIds] = useState<Map<string, string>>(new Map());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());
  // Past-show logging queue via QuickAddSheet
  const [pastLogPrefill, setPastLogPrefill] = useState<QuickAddPrefill | null>(null);
  const [pastLogOpen, setPastLogOpen] = useState(false);
  const pastLogQueueRef = useRef<UpcomingShow[]>([]);
  const [pastLogPosition, setPastLogPosition] = useState(1);
  const [pastLogTotal, setPastLogTotal] = useState(0);

  const handlePlanShow = () => {
    if (onPlanShow) {
      onPlanShow();
    } else {
      setSheetOpen(true);
    }
  };

  const handleChipTap = (show: UpcomingShow, goingWith: FriendShow[]) => {
    setSelectedShow(show);
    setDetailOpen(true);
    // Store goingWith so the detail sheet can display the friends section
    setFriendsGoingWith(goingWith);
  };

  const handleFriendChipTap = (show: GroupedFriendShow) => {
    setSelectedFriendShow(show);
    setFriendDetailOpen(true);
  };

  const handleToggleFriendShow = useCallback(async (show: FriendShow, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (togglingIds.has(show.id)) return;

    setTogglingIds(prev => new Set(prev).add(show.id));

    const alreadyAddedId = addedFriendShowIds.get(show.id);
    if (alreadyAddedId) {
      // Remove from own calendar
      await deleteUpcomingShow(alreadyAddedId);
      setAddedFriendShowIds(prev => {
        const next = new Map(prev);
        next.delete(show.id);
        return next;
      });
    } else {
      // Add to own calendar
      const success = await saveUpcomingShow({
        artist_name: show.artist_name,
        artist_image_url: show.artist_image_url ?? undefined,
        venue_name: show.venue_name ?? undefined,
        venue_location: show.venue_location ?? undefined,
        show_date: show.show_date ?? undefined,
      });
      if (success) {
        // Find the newly inserted show by matching artist + date in upcomingShows
        // We'll use a simple marker — store show.id temporarily and resolve after refetch
        // Since saveUpcomingShow triggers a refetch, we mark it optimistically
        setAddedFriendShowIds(prev => {
          const next = new Map(prev);
          // Use a temporary sentinel; will be resolved on next upcomingShows update
          next.set(show.id, "__pending__");
          return next;
        });
      }
    }

    setTogglingIds(prev => {
      const next = new Set(prev);
      next.delete(show.id);
      return next;
    });
  }, [togglingIds, addedFriendShowIds, deleteUpcomingShow, saveUpcomingShow]);

  // Resolve pending additions by matching artist_name + show_date in the user's own shows
  const resolvedAddedIds = useMemo(() => {
    const resolved = new Map(addedFriendShowIds);
    for (const [friendShowId, ownId] of resolved.entries()) {
      if (ownId === "__pending__") {
        const fs = friendShows.find(s => s.id === friendShowId);
        if (fs) {
          const match = upcomingShows.find(
            s => s.artist_name === fs.artist_name && s.show_date === fs.show_date
          );
          if (match) resolved.set(friendShowId, match.id);
        }
      }
    }
    return resolved;
  }, [addedFriendShowIds, friendShows, upcomingShows]);

  // Unique count of friends with upcoming shows
  const friendsWithShowsCount = useMemo(() => {
    const ids = new Set(friendShows.map(s => s.friend.id));
    return ids.size;
  }, [friendShows]);

  /**
   * Cross-reference Mine shows against friend shows by normalised artist name + date.
   * Returns a map: ownShow.id → FriendShow[] (friends going to the same concert)
   */
  const friendOverlapByShowId = useMemo(() => {
    const result = new Map<string, FriendShow[]>();
    const norm = (s: string) => s.trim().toLowerCase();
    for (const ownShow of upcomingShows) {
      if (!ownShow.show_date) continue;
      const matches = friendShows.filter(
        fs => fs.show_date === ownShow.show_date && norm(fs.artist_name) === norm(ownShow.artist_name)
      );
      if (matches.length > 0) result.set(ownShow.id, matches);
    }
    return result;
  }, [upcomingShows, friendShows]);

  /**
   * Deduplicate Mine shows by (normalised artist_name + show_date).
   * When duplicates exist, keep the earliest created_at entry (the "original").
   */
  const deduplicatedMineShows = useMemo(() => {
    const norm = (s: string) => s.trim().toLowerCase();
    const seen = new Map<string, UpcomingShow>();
    for (const show of upcomingShows) {
      const key = `${norm(show.artist_name)}|${show.show_date ?? ""}`;
      const existing = seen.get(key);
      if (!existing || show.created_at < existing.created_at) {
        seen.set(key, show);
      }
    }
    const today = startOfToday();
    return Array.from(seen.values())
      .filter((show) => {
        if (!show.show_date) return true; // keep date-TBD shows
        try { return !isAfter(today, parseISO(show.show_date)); } catch { return true; }
      })
      .sort((a, b) => (a.show_date ?? "").localeCompare(b.show_date ?? ""));
  }, [upcomingShows]);

  // Past (unlogged) upcoming shows
  const pastShows = useMemo(() => {
    const today = startOfToday();
    const norm = (s: string) => s.trim().toLowerCase();
    const seen = new Map<string, UpcomingShow>();
    for (const show of upcomingShows) {
      const key = `${norm(show.artist_name)}|${show.show_date ?? ""}`;
      if (seen.has(key)) continue;
      if (!show.show_date) continue;
      try {
        if (isAfter(today, parseISO(show.show_date))) seen.set(key, show);
      } catch { /* skip */ }
    }
    return Array.from(seen.values());
  }, [upcomingShows]);

  const pastShowsCount = pastShows.length;

  const prefillFromShow = (show: UpcomingShow): QuickAddPrefill => ({
    artistName: show.artist_name,
    artistImageUrl: show.artist_image_url,
    venueName: show.venue_name,
    venueLocation: show.venue_location,
    showDate: show.show_date,
    showType: show.raw_input === "festival" ? "festival" : "set",
  });

  const advanceQueue = useCallback(() => {
    const next = pastLogQueueRef.current.shift();
    if (next) {
      setPastLogPrefill(prefillFromShow(next));
      setPastLogPosition((p) => p + 1);
      setPastLogOpen(false);
      setTimeout(() => setPastLogOpen(true), 300);
    } else {
      toast.success("All past shows logged! 🎉");
      setPastLogOpen(false);
    }
  }, []);

  const startPastLogQueue = useCallback(() => {
    if (pastShows.length === 0) return;
    pastLogQueueRef.current = [...pastShows];
    const first = pastLogQueueRef.current.shift()!;
    setPastLogTotal(pastShows.length);
    setPastLogPosition(1);
    setPastLogPrefill(prefillFromShow(first));
    setPastLogOpen(true);
  }, [pastShows]);

  const handlePastLogShowAdded = useCallback(async (_showData?: any) => {
    // Delete the upcoming show that was just logged
    const justLogged = pastShows.find(
      (s) => s.artist_name === pastLogPrefill?.artistName && s.show_date === pastLogPrefill?.showDate
    );
    if (justLogged) {
      await supabase.from("upcoming_shows" as any).delete().eq("id", justLogged.id);
      refetch();
    }
    advanceQueue();
  }, [pastShows, pastLogPrefill, refetch, advanceQueue]);

  const handleNeverMadeIt = useCallback(async () => {
    // Delete from upcoming without logging
    const show = pastShows.find(
      (s) => s.artist_name === pastLogPrefill?.artistName && s.show_date === pastLogPrefill?.showDate
    );
    if (show) {
      await supabase.from("upcoming_shows" as any).delete().eq("id", show.id);
      refetch();
    }
    advanceQueue();
  }, [pastShows, pastLogPrefill, refetch, advanceQueue]);

  const handleSkipForNow = useCallback(() => {
    // Keep in upcoming, just advance queue
    advanceQueue();
  }, [advanceQueue]);

  const filteredMineShows = useMemo(() => {
    if (timeFilter === "all") return deduplicatedMineShows;
    const now = new Date();
    return deduplicatedMineShows.filter((show) => {
      if (!show.show_date) return timeFilter === "later";
      try {
        const d = parseISO(show.show_date);
        if (timeFilter === "week") return isThisWeek(d, { weekStartsOn: 1 });
        if (timeFilter === "month") return isThisMonth(d);
        // "later" = beyond this month
        return isAfter(d, addMonths(new Date(now.getFullYear(), now.getMonth() + 1, 0), 0));
      } catch { return false; }
    });
  }, [deduplicatedMineShows, timeFilter]);

  /** Set of friend show IDs already shown as badges on Mine cards — hide from Friends tab */
  const overlappingFriendShowIds = useMemo(() => {
    const ids = new Set<string>();
    for (const matches of friendOverlapByShowId.values()) {
      matches.forEach(fs => ids.add(fs.id));
    }
    return ids;
  }, [friendOverlapByShowId]);

  /** Friend shows grouped by artist+date — one card per unique show with all attending friends */
  const filteredFriendShows = useMemo((): GroupedFriendShow[] => {
    const filtered = friendShows.filter(fs => !overlappingFriendShowIds.has(fs.id));
    const groupMap = new Map<string, GroupedFriendShow>();
    for (const fs of filtered) {
      const key = `${fs.artist_name.toLowerCase()}__${fs.show_date ?? ""}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, { ...fs, allFriends: [fs.friend] });
      } else {
        const existing = groupMap.get(key)!;
        // Avoid duplicate friends
        if (!existing.allFriends.some(f => f.id === fs.friend.id)) {
          existing.allFriends.push(fs.friend);
        }
      }
    }
    return Array.from(groupMap.values());
  }, [friendShows, overlappingFriendShowIds]);

  return (
    <>

      <div className="space-y-2.5">
        {/* Section label */}
        <h3
          className="text-[11px] uppercase tracking-[0.2em] font-semibold text-white/60"
          style={{ textShadow: "0 0 8px rgba(255,255,255,0.2)" }}
        >
          Upcoming Shows
        </h3>

        {/* Header with segmented pill toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {/* Mine pill */}
            <button
              onClick={() => setActiveTab("mine")}
              className={`px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] transition-all ${
                activeTab === "mine"
                  ? "bg-white/[0.14] text-white border border-white/20"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Mine
            </button>
            {/* Friends pill */}
            <button
              onClick={() => setActiveTab("friends")}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] transition-all ${
                activeTab === "friends"
                  ? "bg-white/[0.14] text-white border border-white/20"
                  : "text-white/40 hover:text-white/60"
              }`}
            >
              Friends
              {friendsWithShowsCount > 0 && (
                <span className={`text-[9px] font-bold leading-none px-1.5 py-0.5 rounded-full ${
                  activeTab === "friends"
                    ? "bg-primary/80 text-primary-foreground"
                    : "bg-white/20 text-white/70"
                }`}>
                  {friendsWithShowsCount}
                </span>
              )}
            </button>
            {/* Discover pill — coming soon */}
            <button
              onClick={() => setActiveTab("discover")}
              className={`flex items-center gap-1 px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-[0.12em] transition-all ${
                activeTab === "discover"
                  ? "bg-white/[0.10] text-white/50 border border-white/15"
                  : "text-white/25 hover:text-white/40"
              }`}
            >
              Discover
              <span className="text-[8px] font-bold leading-none px-1 py-0.5 rounded-full bg-white/10 text-white/35 tracking-wide normal-case">
                Soon
              </span>
            </button>
          </div>

          {/* + Add only on Mine tab */}
          {activeTab === "mine" && deduplicatedMineShows.length > 0 && (
            <button
              onClick={handlePlanShow}
              className="text-[10px] text-white/40 hover:text-white/70 transition-colors uppercase tracking-widest"
            >
              + Add
            </button>
          )}
        </div>

        {/* Time filter pills — only on Mine tab with shows */}
        {activeTab === "mine" && !isLoading && deduplicatedMineShows.length > 3 && (
          <div className="flex items-center gap-1.5">
            {([["all", "All"], ["week", "This Week"], ["month", "This Month"], ["later", "Later"]] as const).map(([val, label]) => (
              <button
                key={val}
                onClick={() => setTimeFilter(val)}
                className={`px-2.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                  timeFilter === val
                    ? "bg-primary/20 text-primary border border-primary/30"
                    : "text-white/30 hover:text-white/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Loading skeleton */}
        {isLoading && activeTab === "mine" && (
          <div className="flex gap-3 overflow-hidden">
            {[1, 2].map((i) => (
              <div key={i} className="flex-shrink-0 w-32 h-36 rounded-2xl bg-white/[0.05] animate-pulse" />
            ))}
          </div>
        )}

        {/* ── MINE TAB ── */}
        {activeTab === "mine" && !isLoading && deduplicatedMineShows.length === 0 && (
          <button
            onClick={handlePlanShow}
            className="w-full rounded-2xl border border-dashed border-white/15 bg-white/[0.03] hover:bg-white/[0.06] transition-colors p-4 flex items-center gap-3"
          >
            <div className="w-10 h-10 rounded-full bg-white/[0.08] border border-white/[0.12] flex items-center justify-center flex-shrink-0">
              <Music2 className="h-5 w-5 text-white/50" />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-white/60">Plan a show</p>
              <p className="text-xs text-white/35 mt-0.5">Add concerts you're planning to attend</p>
            </div>
            <div className="ml-auto">
              <Plus className="h-4 w-4 text-white/30" />
            </div>
          </button>
        )}

        {activeTab === "mine" && !isLoading && deduplicatedMineShows.length > 0 && filteredMineShows.length === 0 && (
          <div className="w-full rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 flex items-center gap-2.5">
            <Music2 className="h-4 w-4 text-white/25 flex-shrink-0" />
            <p className="text-xs text-white/35">No shows {timeFilter === "week" ? "this week" : timeFilter === "month" ? "this month" : "later"}</p>
          </div>
        )}

        {activeTab === "mine" && !isLoading && filteredMineShows.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
            {filteredMineShows.map((show, idx) => (
              <UpcomingChip
                key={show.id}
                show={show}
                friendsHere={friendsByDate.get(show.show_date ?? "") ?? []}
                goingWith={idx === 0 ? DEMO_10_FRIENDS : (friendOverlapByShowId.get(show.id) ?? [])}
                onTap={handleChipTap}
              />
            ))}
            <AddShowChip onClick={handlePlanShow} />
          </div>
        )}

        {/* Unlogged past shows nudge */}
        {activeTab === "mine" && !isLoading && pastShowsCount > 0 && (
          <button
            onClick={startPastLogQueue}
            className="w-full rounded-2xl border border-primary/15 bg-primary/[0.06] px-4 py-2.5 flex items-center gap-3 hover:bg-primary/[0.10] transition-colors"
          >
            <NotebookPen className="h-4 w-4 text-primary/60 flex-shrink-0" />
            <p className="text-xs text-primary/80 text-left">
              You have <span className="font-semibold">{pastShowsCount}</span> past {pastShowsCount === 1 ? "show" : "shows"} to log
            </p>
            <span className="ml-auto text-[10px] text-primary/50 font-medium">Log →</span>
          </button>
        )}

        {/* ── FRIENDS TAB ── */}
        {activeTab === "friends" && filteredFriendShows.length === 0 && (
          <div className="w-full rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-3 flex items-center gap-2.5">
            <Users className="h-4 w-4 text-white/25 flex-shrink-0" />
            <p className="text-xs text-white/35">
              {friendShows.length > 0
                ? "All your friends' shows are already on your calendar 🎉"
                : "No friends have planned shows yet"}
            </p>
          </div>
        )}

        {activeTab === "friends" && filteredFriendShows.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
            {filteredFriendShows.map((show) => (
              <FriendChip
                key={show.id}
                show={show}
                isAdded={resolvedAddedIds.has(show.id) && resolvedAddedIds.get(show.id) !== "__pending__"}
                isToggling={togglingIds.has(show.id)}
                onTap={handleFriendChipTap}
                onToggle={(s, e) => handleToggleFriendShow(s, e)}
              />
            ))}
          </div>
        )}

        {/* ── DISCOVER TAB — coming soon ── */}
        {activeTab === "discover" && (
          <div className="w-full rounded-2xl border border-dashed border-white/10 bg-white/[0.02] px-4 py-5 flex flex-col items-center gap-2 text-center">
            <div className="w-9 h-9 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center mb-1">
              <Music2 className="h-4 w-4 text-white/30" />
            </div>
            <p className="text-sm font-medium text-white/40">Discover is coming soon</p>
            <p className="text-xs text-white/25 max-w-[200px]">Find upcoming shows from artists you love, near you</p>
          </div>
        )}

      </div>

      {/* Detail sheets */}
      <UpcomingShowDetailSheet
        show={selectedShow}
        open={detailOpen}
        onOpenChange={(v) => {
          setDetailOpen(v);
          if (!v) setFriendsGoingWith([]);
        }}
        onDelete={deleteUpcomingShow}
        onRsvpChange={updateRsvpStatus}
        goingWith={friendsGoingWith}
      />

      <FriendShowDetailSheet
        show={selectedFriendShow}
        open={friendDetailOpen}
        onOpenChange={setFriendDetailOpen}
        isAdded={
          selectedFriendShow
            ? resolvedAddedIds.has(selectedFriendShow.id) && resolvedAddedIds.get(selectedFriendShow.id) !== "__pending__"
            : false
        }
        isToggling={selectedFriendShow ? togglingIds.has(selectedFriendShow.id) : false}
        onToggle={(s) => handleToggleFriendShow(s)}
      />

      {!onPlanShow && (
        <PlanShowSheet open={sheetOpen} onOpenChange={setSheetOpen} />
      )}

      <QuickAddSheet
        open={pastLogOpen}
        onOpenChange={setPastLogOpen}
        prefill={pastLogPrefill}
        onShowAdded={handlePastLogShowAdded}
        queuePosition={pastLogPosition}
        queueTotal={pastLogTotal}
        onNeverMadeIt={handleNeverMadeIt}
        onSkipForNow={handleSkipForNow}
      />
    </>
  );
}
