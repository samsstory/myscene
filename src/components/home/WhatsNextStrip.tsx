import { useState, useMemo, useCallback, useEffect } from "react";
import { parseISO, isThisWeek, isThisMonth, addMonths, isAfter, startOfToday } from "date-fns";
import { Plus, Music2, Users, NotebookPen } from "lucide-react";
import { usePlanUpcomingShow, type UpcomingShow } from "@/hooks/usePlanUpcomingShow";
import { useFollowers } from "@/hooks/useFollowers";
import { useFriendUpcomingShows, type FriendShow } from "@/hooks/useFriendUpcomingShows";
import { useFriendShowToggle } from "@/hooks/useFriendShowToggle";
import { usePastLogQueue } from "@/hooks/usePastLogQueue";
import type { GroupedFriendShow } from "./upcoming/types";

import PlanShowSheet from "./PlanShowSheet";
import UpcomingShowDetailSheet from "./UpcomingShowDetailSheet";
import QuickAddSheet from "@/components/QuickAddSheet";

import UpcomingChip from "./upcoming/UpcomingChip";
import FriendChip from "./upcoming/FriendChip";
import AddShowChip from "./upcoming/AddShowChip";
import FriendShowDetailSheet from "./upcoming/FriendShowDetailSheet";

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

export default function WhatsNextStrip({ onPlanShow }: WhatsNextStripProps) {
  const { upcomingShows, isLoading, deleteUpcomingShow, updateRsvpStatus, saveUpcomingShow, refetch } = usePlanUpcomingShow();
  const { following } = useFollowers();
  const followingIds = useMemo(() => following.map(f => f.id), [following]);
  const { friendsByDate, friendShows } = useFriendUpcomingShows(followingIds);

  const { handleToggleFriendShow, resolvedAddedIds, togglingIds } = useFriendShowToggle({
    deleteUpcomingShow,
    saveUpcomingShow,
    friendShows,
    upcomingShows,
  });

  const pastLog = usePastLogQueue(upcomingShows, refetch);

  const [activeTab, setActiveTab] = useState<"mine" | "friends" | "discover">("mine");
  type TimeFilter = "all" | "week" | "month" | "later";
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");

  useEffect(() => { setTimeFilter("all"); }, [activeTab]);

  const [sheetOpen, setSheetOpen] = useState(false);
  const [selectedShow, setSelectedShow] = useState<UpcomingShow | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedFriendShow, setSelectedFriendShow] = useState<GroupedFriendShow | null>(null);
  const [friendDetailOpen, setFriendDetailOpen] = useState(false);
  const [friendsGoingWith, setFriendsGoingWith] = useState<FriendShow[]>([]);

  const handlePlanShow = () => {
    if (onPlanShow) { onPlanShow(); } else { setSheetOpen(true); }
  };

  const handleChipTap = (show: UpcomingShow, goingWith: FriendShow[]) => {
    setSelectedShow(show);
    setDetailOpen(true);
    setFriendsGoingWith(goingWith);
  };

  const handleFriendChipTap = (show: GroupedFriendShow) => {
    setSelectedFriendShow(show);
    setFriendDetailOpen(true);
  };

  // Unique count of friends with upcoming shows
  const friendsWithShowsCount = useMemo(() => {
    const ids = new Set(friendShows.map(s => s.friend.id));
    return ids.size;
  }, [friendShows]);

  // Cross-reference Mine shows against friend shows
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

  // Deduplicate + filter to future only
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
        if (!show.show_date) return true;
        try { return !isAfter(today, parseISO(show.show_date)); } catch { return true; }
      })
      .sort((a, b) => (a.show_date ?? "").localeCompare(b.show_date ?? ""));
  }, [upcomingShows]);

  const filteredMineShows = useMemo(() => {
    if (timeFilter === "all") return deduplicatedMineShows;
    const now = new Date();
    return deduplicatedMineShows.filter((show) => {
      if (!show.show_date) return timeFilter === "later";
      try {
        const d = parseISO(show.show_date);
        if (timeFilter === "week") return isThisWeek(d, { weekStartsOn: 1 });
        if (timeFilter === "month") return isThisMonth(d);
        return isAfter(d, addMonths(new Date(now.getFullYear(), now.getMonth() + 1, 0), 0));
      } catch { return false; }
    });
  }, [deduplicatedMineShows, timeFilter]);

  // Friend show IDs already shown on Mine cards — hide from Friends tab
  const overlappingFriendShowIds = useMemo(() => {
    const ids = new Set<string>();
    for (const matches of friendOverlapByShowId.values()) {
      matches.forEach(fs => ids.add(fs.id));
    }
    return ids;
  }, [friendOverlapByShowId]);

  // Grouped friend shows for Friends tab
  const filteredFriendShows = useMemo((): GroupedFriendShow[] => {
    const filtered = friendShows.filter(fs => !overlappingFriendShowIds.has(fs.id));
    const groupMap = new Map<string, GroupedFriendShow>();
    for (const fs of filtered) {
      const key = `${fs.artist_name.toLowerCase()}__${fs.show_date ?? ""}`;
      if (!groupMap.has(key)) {
        groupMap.set(key, { ...fs, allFriends: [fs.friend] });
      } else {
        const existing = groupMap.get(key)!;
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

        {/* Tab pills */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
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

          {activeTab === "mine" && deduplicatedMineShows.length > 0 && (
            <button
              onClick={handlePlanShow}
              className="text-[10px] text-white/40 hover:text-white/70 transition-colors uppercase tracking-widest"
            >
              + Add
            </button>
          )}
        </div>

        {/* Time filter pills — Mine tab only */}
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
                goingWith={idx === 0 ? DEMO_10_FRIENDS : (friendOverlapByShowId.get(show.id) ?? [])}
                onTap={handleChipTap}
              />
            ))}
            <AddShowChip onClick={handlePlanShow} />
          </div>
        )}

        {/* Unlogged past shows nudge */}
        {activeTab === "mine" && !isLoading && pastLog.pastShowsCount > 0 && (
          <button
            onClick={pastLog.startPastLogQueue}
            className="w-full rounded-2xl border border-primary/15 bg-primary/[0.06] px-4 py-2.5 flex items-center gap-3 hover:bg-primary/[0.10] transition-colors"
          >
            <NotebookPen className="h-4 w-4 text-primary/60 flex-shrink-0" />
            <p className="text-xs text-primary/80 text-left">
              You have <span className="font-semibold">{pastLog.pastShowsCount}</span> past {pastLog.pastShowsCount === 1 ? "show" : "shows"} to log
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
        open={pastLog.pastLogOpen}
        onOpenChange={pastLog.setPastLogOpen}
        prefill={pastLog.pastLogPrefill}
        onShowAdded={pastLog.handlePastLogShowAdded}
        queuePosition={pastLog.pastLogPosition}
        queueTotal={pastLog.pastLogTotal}
        onNeverMadeIt={pastLog.handleNeverMadeIt}
        onSkipForNow={pastLog.handleSkipForNow}
      />
    </>
  );
}
