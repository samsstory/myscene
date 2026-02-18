import { useState, useMemo, useCallback } from "react";
import { format, parseISO } from "date-fns";
import { Plus, Music2, CheckCircle2, AlertCircle, X, Users, Check, Loader2, PartyPopper } from "lucide-react";
import { usePlanUpcomingShow, type UpcomingShow } from "@/hooks/usePlanUpcomingShow";
import { useFollowers } from "@/hooks/useFollowers";
import { useFriendUpcomingShows, type FriendShow } from "@/hooks/useFriendUpcomingShows";
import type { FollowerProfile } from "@/hooks/useFollowers";
import PlanShowSheet from "./PlanShowSheet";
import UpcomingShowDetailSheet from "./UpcomingShowDetailSheet";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";


interface WhatsNextStripProps {
  onPlanShow?: () => void;
}

const RSVP_BADGE = {
  going:     { Icon: CheckCircle2, color: "text-emerald-400", bg: "bg-emerald-500/20 border-emerald-500/30" },
  maybe:     { Icon: AlertCircle,  color: "text-amber-400",   bg: "bg-amber-500/20 border-amber-500/30"   },
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

function UpcomingChip({
  show,
  friendsHere,
  goingWith,
  onTap,
}: {
  show: UpcomingShow;
  friendsHere: FollowerProfile[];
  goingWith: FriendShow[];
  onTap: (show: UpcomingShow) => void;
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

  // Build "Going with" label from matched friends
  const goingWithLabel = useMemo(() => {
    if (goingWith.length === 0) return null;
    const names = goingWith.map(f =>
      f.friend.username ? `@${f.friend.username}` : (f.friend.full_name?.split(" ")[0] ?? "Friend")
    );
    if (names.length === 1) return names[0];
    if (names.length === 2) return `${names[0]} & ${names[1]}`;
    return `${names[0]} +${names.length - 1}`;
  }, [goingWith]);

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
        <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-primary/20 to-transparent" />
      )}

      <div className={`absolute top-2 right-2 flex items-center justify-center w-6 h-6 rounded-full border backdrop-blur-sm ${badge.bg}`}>
        <BadgeIcon className={`h-3 w-3 ${badge.color}`} />
      </div>

      <FriendAvatarStack friends={friendsHere} />

      <div className="absolute bottom-0 left-0 right-0 p-2.5">
        {/* Going-with badge */}
        {goingWithLabel && (
          <div className="flex items-center gap-0.5 mb-1 max-w-full">
            <PartyPopper className="h-2.5 w-2.5 text-amber-300 flex-shrink-0" />
            <span
              className="text-[9px] font-semibold text-amber-300 truncate leading-none"
              style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
            >
              {goingWithLabel}
            </span>
          </div>
        )}
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


function FriendChip({
  show,
  isAdded,
  isToggling,
  onTap,
  onToggle,
}: {
  show: FriendShow;
  isAdded: boolean;
  isToggling: boolean;
  onTap: (show: FriendShow) => void;
  onToggle: (show: FriendShow, e: React.MouseEvent) => void;
}) {
  const dateLabel = show.show_date
    ? (() => { try { return format(parseISO(show.show_date), "MMM d"); } catch { return ""; } })()
    : "Date TBD";

  const venueLabel = show.venue_name
    ? (show.venue_name.length > 16 ? show.venue_name.slice(0, 14) + "…" : show.venue_name)
    : show.venue_location
    ? (show.venue_location.length > 16 ? show.venue_location.slice(0, 14) + "…" : show.venue_location)
    : null;

  const friendName = show.friend.username
    ? `@${show.friend.username}`
    : show.friend.full_name?.split(" ")[0] ?? "Friend";

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

      {/* Friend avatar + name — top-left */}
      <div className="absolute top-2 left-2 flex items-center gap-1 max-w-[calc(100%-36px)]">
        {show.friend.avatar_url ? (
          <img
            src={show.friend.avatar_url}
            alt={friendName}
            className="w-5 h-5 rounded-full border border-black/60 object-cover flex-shrink-0"
          />
        ) : (
          <div className="w-5 h-5 rounded-full border border-black/60 bg-primary/70 flex items-center justify-center flex-shrink-0">
            <span className="text-[7px] font-bold text-primary-foreground leading-none">
              {(show.friend.username ?? show.friend.full_name ?? "?")[0].toUpperCase()}
            </span>
          </div>
        )}
        <span
          className="text-[9px] font-semibold text-white/80 truncate leading-none"
          style={{ textShadow: "0 1px 4px rgba(0,0,0,0.9)" }}
        >
          {friendName}
        </span>
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

function FriendShowDetailSheet({
  show,
  open,
  onOpenChange,
  isAdded,
  isToggling,
  onToggle,
}: {
  show: FriendShow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isAdded: boolean;
  isToggling: boolean;
  onToggle: (show: FriendShow) => void;
}) {
  if (!show) return null;
  const dateLabel = show.show_date
    ? (() => { try { return format(parseISO(show.show_date), "EEEE, MMMM d, yyyy"); } catch { return ""; } })()
    : "Date TBD";
  const friendName = show.friend.username ?? show.friend.full_name ?? "Friend";

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
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4 flex-shrink-0" />
            <span>
              {show.friend.avatar_url && (
                <img src={show.friend.avatar_url} alt={friendName} className="inline w-5 h-5 rounded-full object-cover mr-1.5 align-middle" />
              )}
              <span className="font-medium text-foreground">@{show.friend.username ?? friendName}</span> is going
            </span>
          </div>
          <div className="text-muted-foreground">{dateLabel}</div>
          {(show.venue_name || show.venue_location) && (
            <div className="text-muted-foreground">
              {show.venue_name}{show.venue_name && show.venue_location ? " · " : ""}{show.venue_location}
            </div>
          )}
        </div>

        {/* I'm going too / Remove CTA */}
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
  const { upcomingShows, isLoading, deleteUpcomingShow, updateRsvpStatus, saveUpcomingShow } = usePlanUpcomingShow();
  const { following } = useFollowers();
  const followingIds = useMemo(() => following.map(f => f.id), [following]);
  const { friendsByDate, friendShows } = useFriendUpcomingShows(followingIds);

  const [activeTab, setActiveTab] = useState<"mine" | "friends">("mine");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<UpcomingShow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedFriendShow, setSelectedFriendShow] = useState<FriendShow | null>(null);
  const [friendDetailOpen, setFriendDetailOpen] = useState(false);
  // Track which friend shows the user has added (by source show id → own show id)
  const [addedFriendShowIds, setAddedFriendShowIds] = useState<Map<string, string>>(new Map());
  const [togglingIds, setTogglingIds] = useState<Set<string>>(new Set());

  const handlePlanShow = () => {
    if (onPlanShow) {
      onPlanShow();
    } else {
      setSheetOpen(true);
    }
  };

  const handleChipTap = (show: UpcomingShow) => {
    setSelectedShow(show);
    setDetailOpen(true);
  };

  const handleFriendChipTap = (show: FriendShow) => {
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

  /** Set of friend show IDs already shown as badges on Mine cards — hide from Friends tab */
  const overlappingFriendShowIds = useMemo(() => {
    const ids = new Set<string>();
    for (const matches of friendOverlapByShowId.values()) {
      matches.forEach(fs => ids.add(fs.id));
    }
    return ids;
  }, [friendOverlapByShowId]);

  /** Friend shows filtered to exclude those already surfaced on Mine cards */
  const filteredFriendShows = useMemo(
    () => friendShows.filter(fs => !overlappingFriendShowIds.has(fs.id)),
    [friendShows, overlappingFriendShowIds]
  );

  return (
    <>

      <div className="space-y-2.5">
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
          </div>

          {/* + Add only on Mine tab */}
          {activeTab === "mine" && upcomingShows.length > 0 && (
            <button
              onClick={handlePlanShow}
              className="text-[10px] text-white/40 hover:text-white/70 transition-colors uppercase tracking-widest"
            >
              + Add
            </button>
          )}
        </div>

        {/* Loading skeleton */}
        {isLoading && activeTab === "mine" && (
          <div className="flex gap-3 overflow-hidden">
            {[1, 2].map((i) => (
              <div key={i} className="flex-shrink-0 w-32 h-36 rounded-2xl bg-white/[0.05] animate-pulse" />
            ))}
          </div>
        )}

        {/* ── MINE TAB ── */}
        {activeTab === "mine" && !isLoading && upcomingShows.length === 0 && (
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

        {activeTab === "mine" && !isLoading && upcomingShows.length > 0 && (
          <div className="flex gap-3 overflow-x-auto pb-1 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
            {upcomingShows.map((show) => (
              <UpcomingChip
                key={show.id}
                show={show}
                friendsHere={friendsByDate.get(show.show_date ?? "") ?? []}
                goingWith={friendOverlapByShowId.get(show.id) ?? []}
                onTap={handleChipTap}
              />
            ))}
            <AddShowChip onClick={handlePlanShow} />
          </div>
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

      </div>

      {/* Detail sheets */}
      <UpcomingShowDetailSheet
        show={selectedShow}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onDelete={deleteUpcomingShow}
        onRsvpChange={updateRsvpStatus}
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
    </>
  );
}
