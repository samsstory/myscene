import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Users, Search, Loader2, UserCheck, Calendar, Star, Zap, Music2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, parseISO } from "date-fns";
import { useFollowers } from "@/hooks/useFollowers";
import { useFriendActivity, type FriendActivityItem } from "@/hooks/useFriendActivity";
import { useProfileSearch } from "@/hooks/useProfileSearch";

type FilterTab = "all" | "upcoming" | "logged";

function StarRow({ rating }: { rating: number }) {
  return (
    <span className="flex items-center gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i < rating ? "fill-amber-400 text-amber-400" : "fill-white/10 text-white/10"
          )}
        />
      ))}
    </span>
  );
}

function SignalChip({ signal }: { signal: FriendActivityItem["signal"] }) {
  if (signal === "shared")
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-primary uppercase tracking-wider">
        <Zap className="h-3 w-3" /> You're both going
      </span>
    );
  if (signal === "multi-friend")
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-violet-400 uppercase tracking-wider">
        <Users className="h-3 w-3" /> Multiple friends
      </span>
    );
  if (signal === "high-rating")
    return (
      <span className="flex items-center gap-1 text-[10px] font-semibold text-amber-400 uppercase tracking-wider">
        <Star className="h-3 w-3" /> Highly rated
      </span>
    );
  return null;
}

function ActivityCard({ item }: { item: FriendActivityItem }) {
  const friendName = item.friend.full_name || item.friend.username || "Someone";
  const dateStr = item.showDate ? format(parseISO(item.showDate), "MMM d") : null;
  const isShared = item.signal === "shared";
  const isMulti = item.signal === "multi-friend";

  return (
    <div
      className={cn(
        "relative rounded-2xl border px-4 py-3.5 flex items-start gap-3 overflow-hidden",
        isShared
          ? "bg-primary/[0.08] border-primary/25"
          : isMulti
          ? "bg-violet-500/[0.06] border-violet-500/20"
          : "bg-white/[0.04] border-white/[0.08]"
      )}
    >
      {isShared && (
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-transparent pointer-events-none" />
      )}

      <div className="relative flex-shrink-0 mt-0.5">
        <Avatar className="h-9 w-9 border border-white/10">
          <AvatarImage src={item.friend.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs bg-white/10 text-white/70">
            {friendName.charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span
          className={cn(
            "absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full border border-background flex items-center justify-center",
            item.type === "upcoming" ? "bg-primary/80" : "bg-emerald-500/80"
          )}
        >
          {item.type === "upcoming" ? (
            <Calendar className="h-2.5 w-2.5 text-white" />
          ) : (
            <Star className="h-2.5 w-2.5 text-white" />
          )}
        </span>
      </div>

      <div className="flex-1 min-w-0">
        <SignalChip signal={item.signal} />
        <p className="text-sm font-semibold text-white/90 mt-0.5 truncate">{item.artistName}</p>
        <p className="text-xs text-white/50 truncate mt-0.5">
          {[item.venueName, item.venueLocation, dateStr].filter(Boolean).join(" · ")}
        </p>
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[11px] text-white/40">
            {item.type === "upcoming" ? `${friendName} is going` : `${friendName} logged this`}
          </span>
          {item.type === "logged" && item.rating && <StarRow rating={item.rating} />}
        </div>

        {item.sharedFriends && item.sharedFriends.length > 0 && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <div className="flex -space-x-1.5">
              {item.sharedFriends.slice(0, 3).map(f => (
                <Avatar key={f.id} className="h-5 w-5 border border-background">
                  <AvatarImage src={f.avatar_url ?? undefined} />
                  <AvatarFallback className="text-[8px] bg-white/10">
                    {(f.full_name || f.username || "?").charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
            </div>
            <span className="text-[11px] text-white/35">+{item.sharedFriends.length} also going</span>
          </div>
        )}
      </div>

      {(item.artistImageUrl || item.photoUrl) && (
        <div className="flex-shrink-0 w-12 h-12 rounded-xl overflow-hidden border border-white/10">
          <img
            src={item.photoUrl || item.artistImageUrl || ""}
            alt={item.artistName}
            className="w-full h-full object-cover"
          />
        </div>
      )}
    </div>
  );
}

function FindFriendsSection() {
  const { results, isSearching, query, setQuery } = useProfileSearch();
  const { isFollowing, follow, unfollow } = useFollowers();
  const showEmpty = query.length >= 2 && !isSearching && results.length === 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        {isSearching ? (
          <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />
        )}
        <input
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search by name or @username…"
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white/80 placeholder:text-white/25 text-sm focus:outline-none focus:border-primary/40 transition-colors"
        />
      </div>

      {showEmpty && (
        <p className="text-xs text-center text-white/30 py-4">No users found for "{query}"</p>
      )}
      {query.length < 2 && (
        <p className="text-xs text-center text-white/25 py-2">Type a name or @username to search</p>
      )}

      <div className="divide-y divide-white/[0.05]">
        {results.map(profile => {
          const initials = (profile.username ?? profile.full_name ?? "?")[0].toUpperCase();
          const following = isFollowing(profile.id);
          return (
            <div key={profile.id} className="flex items-center gap-3 py-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-primary/[0.12] border border-primary/[0.20] flex items-center justify-center">
                {profile.avatar_url ? (
                  <img src={profile.avatar_url} alt={profile.username ?? "User"} className="w-full h-full object-cover" />
                ) : (
                  <span className="text-sm font-bold text-primary/80">{initials}</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">
                  {profile.full_name ?? profile.username ?? "Unknown"}
                </p>
                {profile.username && (
                  <p className="text-xs text-white/35 truncate mt-0.5">@{profile.username}</p>
                )}
              </div>
              {following ? (
                <button
                  onClick={() => unfollow(profile.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.10] text-white/50 text-xs hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all"
                >
                  <UserCheck className="h-3.5 w-3.5" /> Following
                </button>
              ) : (
                <button
                  onClick={() => follow(profile.id)}
                  className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/[0.12] border border-primary/[0.28] text-primary/90 text-xs font-medium hover:bg-primary/[0.20] transition-all"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Follow
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main inline Friends view ─────────────────────────────────────────────────

export default function FriendsPanelView() {
  const [activeTab, setActiveTab] = useState<"activity" | "find">("activity");
  const [filter, setFilter] = useState<FilterTab>("all");

  const { following, isLoading: followersLoading } = useFollowers();
  const followingIds = useMemo(() => following.map(f => f.id), [following]);
  const { items, isLoading: activityLoading } = useFriendActivity(followingIds);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    if (filter === "upcoming") return items.filter(i => i.type === "upcoming");
    return items.filter(i => i.type === "logged");
  }, [items, filter]);

  const isLoading = followersLoading || activityLoading;

  const FILTER_TABS: { id: FilterTab; label: string }[] = [
    { id: "all", label: "All" },
    { id: "upcoming", label: "Upcoming" },
    { id: "logged", label: "Logged" },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-base font-bold text-white/90">Friends</h2>
        {following.length > 0 && (
          <p className="text-xs text-white/35 mt-0.5">
            Following {following.length} {following.length === 1 ? "person" : "people"}
          </p>
        )}
      </div>

      {/* Tab switcher */}
      <div className="flex items-center gap-1">
        {(["activity", "find"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.12em] transition-all border",
              activeTab === tab
                ? "bg-primary/20 border-primary/40 text-primary"
                : "bg-white/[0.05] border-white/[0.08] text-white/40 hover:text-white/60"
            )}
          >
            {tab === "activity" ? "Activity" : "Find Friends"}
          </button>
        ))}
      </div>

      {/* ── ACTIVITY TAB ── */}
      {activeTab === "activity" && (
        <>
          {following.length > 0 && items.length > 0 && (
            <div className="flex items-center gap-1.5">
              {FILTER_TABS.map(ft => (
                <button
                  key={ft.id}
                  onClick={() => setFilter(ft.id)}
                  className={cn(
                    "px-3 py-1 rounded-full text-[11px] font-medium transition-all border",
                    filter === ft.id
                      ? "bg-white/10 border-white/20 text-white/80"
                      : "border-transparent text-white/30 hover:text-white/50"
                  )}
                >
                  {ft.label}
                  {ft.id === "upcoming" && items.filter(i => i.type === "upcoming").length > 0 && (
                    <span className="ml-1 text-white/30">
                      {items.filter(i => i.type === "upcoming").length}
                    </span>
                  )}
                  {ft.id === "logged" && items.filter(i => i.type === "logged").length > 0 && (
                    <span className="ml-1 text-white/30">
                      {items.filter(i => i.type === "logged").length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          <div className="space-y-2.5">
            {isLoading ? (
              <div className="space-y-3 pt-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="h-20 rounded-2xl bg-white/[0.03] border border-white/[0.06] animate-pulse" />
                ))}
              </div>
            ) : !following.length ? (
              <div className="flex flex-col items-center gap-4 py-12 text-center">
                <div className="w-16 h-16 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                  <Users className="h-7 w-7 text-white/20" />
                </div>
                <div>
                  <p className="text-base font-semibold text-white/50">No friends yet</p>
                  <p className="text-sm text-white/25 mt-1 max-w-[220px] mx-auto">
                    Follow friends to see their upcoming shows and logs here
                  </p>
                </div>
                <button
                  onClick={() => setActiveTab("find")}
                  className="flex items-center gap-2 text-sm font-semibold text-primary border border-primary/30 rounded-full px-5 py-2 hover:bg-primary/10 transition-colors"
                >
                  <UserPlus className="h-4 w-4" />
                  Find friends on Scene
                </button>
              </div>
            ) : filtered.length === 0 ? (
              <div className="flex flex-col items-center gap-3 py-10 text-center">
                <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center">
                  <Music2 className="h-5 w-5 text-white/25" />
                </div>
                <p className="text-sm text-white/40">
                  {filter === "all"
                    ? "No recent activity from your friends"
                    : `No ${filter} shows from friends`}
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filtered.map((item, i) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03 }}
                  >
                    <ActivityCard item={item} />
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </div>
        </>
      )}

      {/* ── FIND FRIENDS TAB ── */}
      {activeTab === "find" && <FindFriendsSection />}
    </div>
  );
}
