import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Users, Search, Loader2, UserCheck, Calendar, Music2, Zap, Ticket } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { format, parseISO, addDays, startOfDay } from "date-fns";
import { useFollowers } from "@/hooks/useFollowers";
import { useFriendActivity, type FriendActivityItem } from "@/hooks/useFriendActivity";
import { useFriendUpcomingShows, type FriendShow } from "@/hooks/useFriendUpcomingShows";
import { useProfileSearch } from "@/hooks/useProfileSearch";

type FilterTab = "all" | "upcoming" | "logged";

// ─── Sub-components ───────────────────────────────────────────────────────────


function ActivityCard({ item }: { item: FriendActivityItem }) {
  const friendName = item.friend.full_name || item.friend.username || "Someone";
  const dateStr = item.showDate ? format(parseISO(item.showDate), "MMM d") : null;
  const isShared = item.signal === "shared";
  const isMulti = item.signal === "multi-friend";
  const isHighRating = item.signal === "high-rating";
  const displayImage = item.photoUrl || item.artistImageUrl;

  return (
    <div className={cn(
      "relative rounded-2xl overflow-hidden border",
      isShared ? "border-primary/30" : isMulti ? "border-violet-500/25" : "border-white/[0.07]"
    )}>
      {/* Background image with overlay */}
      {displayImage && (
        <div className="absolute inset-0">
          <img src={displayImage} alt={item.artistName} className="w-full h-full object-cover scale-105" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-black/30" />
        </div>
      )}
      {!displayImage && (
        <div className={cn(
          "absolute inset-0",
          isShared ? "bg-primary/[0.08]" : isMulti ? "bg-violet-500/[0.06]" : "bg-white/[0.03]"
        )} />
      )}

      {/* Content */}
      <div className="relative px-4 py-3.5 flex items-end gap-3">
        {/* Friend avatar */}
        <div className="flex-shrink-0 mb-0.5">
          <Avatar className="h-8 w-8 border border-white/20">
            <AvatarImage src={item.friend.avatar_url ?? undefined} />
            <AvatarFallback className="text-xs bg-white/10 text-white/70">{friendName.charAt(0).toUpperCase()}</AvatarFallback>
          </Avatar>
        </div>

        {/* Text info */}
        <div className="flex-1 min-w-0">
          {/* Signal label */}
          {(isShared || isMulti || isHighRating) && (
            <p className={cn(
              "text-[10px] font-semibold uppercase tracking-[0.18em] mb-0.5",
              isShared ? "text-primary/90" : isMulti ? "text-violet-400/90" : "text-white/60"
            )}
              style={{ textShadow: isShared ? "0 0 8px hsl(var(--primary)/0.5)" : undefined }}
            >
              {isShared ? "You're going too" : isMulti ? "Friends are going" : "Top ranked"}
            </p>
          )}

          {/* Artist name */}
          <p
            className="text-base font-bold text-white/95 leading-tight truncate"
            style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}
          >
            {item.artistName}
          </p>

          {/* Venue · date */}
          <p className="text-[11px] text-white/50 truncate mt-0.5">
            {[item.venueName, item.venueLocation, dateStr].filter(Boolean).join(" · ")}
          </p>

          {/* Narrative line */}
          <p className="text-[11px] text-white/40 mt-1.5">
            {item.type === "upcoming"
              ? `${friendName} has this one on their radar`
              : `${friendName} was there`}
          </p>

          {/* Shared friends stack */}
          {item.sharedFriends && item.sharedFriends.length > 0 && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <div className="flex -space-x-1.5">
                {item.sharedFriends.slice(0, 3).map(f => (
                  <Avatar key={f.id} className="h-5 w-5 border border-background">
                    <AvatarImage src={f.avatar_url ?? undefined} />
                    <AvatarFallback className="text-[8px] bg-white/10">{(f.full_name || f.username || "?").charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                ))}
              </div>
              <span className="text-[11px] text-white/35">+{item.sharedFriends.length} also going</span>
            </div>
          )}
        </div>

        {/* Type badge (upcoming/logged) */}
        <div className={cn(
          "flex-shrink-0 self-start w-7 h-7 rounded-full border flex items-center justify-center",
          item.type === "upcoming" ? "bg-primary/20 border-primary/30" : "bg-emerald-500/20 border-emerald-500/30"
        )}>
          {item.type === "upcoming"
            ? <Calendar className="h-3.5 w-3.5 text-primary/80" />
            : <Zap className="h-3.5 w-3.5 text-emerald-400/80" />}
        </div>
      </div>
    </div>
  );
}


// ─── Find Friends ─────────────────────────────────────────────────────────────

function FindFriendsSection() {
  const { results, isSearching, query, setQuery } = useProfileSearch();
  const { isFollowing, follow, unfollow } = useFollowers();
  const showEmpty = query.length >= 2 && !isSearching && results.length === 0;

  return (
    <div className="space-y-3">
      <div className="relative">
        {isSearching ? <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30 animate-spin" /> : <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/30" />}
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search by name or @username…" autoCapitalize="none" autoCorrect="off" spellCheck={false} className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/[0.04] border border-white/[0.10] text-white/80 placeholder:text-white/25 text-sm focus:outline-none focus:border-primary/40 transition-colors" />
      </div>
      {showEmpty && <p className="text-xs text-center text-white/30 py-4">No users found for "{query}"</p>}
      {query.length < 2 && <p className="text-xs text-center text-white/25 py-2">Type a name or @username to search</p>}
      <div className="divide-y divide-white/[0.05]">
        {results.map(profile => {
          const initials = (profile.username ?? profile.full_name ?? "?")[0].toUpperCase();
          const following = isFollowing(profile.id);
          return (
            <div key={profile.id} className="flex items-center gap-3 py-3">
              <div className="flex-shrink-0 w-10 h-10 rounded-full overflow-hidden bg-primary/[0.12] border border-primary/[0.20] flex items-center justify-center">
                {profile.avatar_url ? <img src={profile.avatar_url} alt={profile.username ?? "User"} className="w-full h-full object-cover" /> : <span className="text-sm font-bold text-primary/80">{initials}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-white/90 truncate">{profile.full_name ?? profile.username ?? "Unknown"}</p>
                {profile.username && <p className="text-xs text-white/35 truncate mt-0.5">@{profile.username}</p>}
              </div>
              {following ? (
                <button onClick={() => unfollow(profile.id)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] border border-white/[0.10] text-white/50 text-xs hover:bg-red-500/10 hover:border-red-500/30 hover:text-red-400 transition-all">
                  <UserCheck className="h-3.5 w-3.5" /> Following
                </button>
              ) : (
                <button onClick={() => follow(profile.id)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/[0.12] border border-primary/[0.28] text-primary/90 text-xs font-medium hover:bg-primary/[0.20] transition-all">
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

// ─── Who's Going This Week ────────────────────────────────────────────────────

interface WeekShow {
  key: string;
  artistName: string;
  artistImageUrl: string | null;
  venueName: string | null;
  showDate: string;
  friends: FriendShow["friend"][];
}

function WhosGoingCard({ followingIds }: { followingIds: string[] }) {
  const { friendShows, isLoading } = useFriendUpcomingShows(followingIds);

  const weekShows = useMemo<WeekShow[]>(() => {
    const today = startOfDay(new Date());
    const cutoff = addDays(today, 7);
    const map = new Map<string, WeekShow>();

    for (const s of friendShows) {
      if (!s.show_date) continue;
      const d = parseISO(s.show_date);
      if (d < today || d > cutoff) continue;

      const key = `${s.artist_name.toLowerCase()}__${s.show_date}`;
      if (!map.has(key)) {
        map.set(key, { key, artistName: s.artist_name, artistImageUrl: s.artist_image_url, venueName: s.venue_name, showDate: s.show_date, friends: [] });
      }
      const entry = map.get(key)!;
      if (!entry.friends.some(f => f.id === s.friend.id)) entry.friends.push(s.friend);
    }

    return Array.from(map.values()).sort((a, b) => a.showDate.localeCompare(b.showDate));
  }, [friendShows]);

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] p-4 space-y-2.5 animate-pulse">
        <div className="h-3 w-36 rounded bg-white/10" />
        <div className="h-12 rounded-xl bg-white/[0.04]" />
        <div className="h-12 rounded-xl bg-white/[0.03]" />
      </div>
    );
  }

  // ── DUMMY DATA for preview/testing ──────────────────────────────────────────
  const DUMMY_SHOWS: WeekShow[] = [
    {
      key: "dummy-1",
      artistName: "Fred again..",
      artistImageUrl: "/images/fred-again-msg.webp",
      venueName: "MSG",
      showDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      friends: [
        { id: "d1", username: "alex_b", full_name: "Alex Burns", avatar_url: null },
        { id: "d2", username: "jess_m", full_name: "Jess M", avatar_url: null },
      ],
    },
    {
      key: "dummy-2",
      artistName: "Jamie xx",
      artistImageUrl: "/images/jamie-xx-printworks.webp",
      venueName: "Printworks London",
      showDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      friends: [
        { id: "d3", username: "mia_k", full_name: "Mia K", avatar_url: null },
      ],
    },
    {
      key: "dummy-3",
      artistName: "Mau P",
      artistImageUrl: "/images/mau-p-concert.png",
      venueName: "Fabric",
      showDate: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      friends: [
        { id: "d4", username: "sam_r", full_name: "Sam R", avatar_url: null },
        { id: "d5", username: "cal_w", full_name: "Cal W", avatar_url: null },
        { id: "d6", username: "dana_l", full_name: "Dana L", avatar_url: null },
        { id: "d7", username: "rio_p", full_name: "Rio P", avatar_url: null },
      ],
    },
  ];

  const displayShows = weekShows.length > 0 ? weekShows : DUMMY_SHOWS;
  const isDummy = weekShows.length === 0;

  return (
    <div className={`rounded-2xl border p-4 space-y-3 ${isDummy ? "border-white/[0.10] bg-white/[0.03]" : "border-primary/20 bg-primary/[0.05]"}`}>
      {/* Label */}
      <div className="flex items-center gap-2">
        <Ticket className={`h-3.5 w-3.5 ${isDummy ? "text-white/30" : "text-primary/70"}`} />
        <span className={`text-[11px] uppercase tracking-[0.18em] font-semibold ${isDummy ? "text-white/30" : "text-primary/70"}`}>
          My Scene This Week
        </span>
        {isDummy && (
          <span className="ml-auto text-[10px] text-white/20 border border-white/10 rounded-full px-2 py-0.5">Preview</span>
        )}
      </div>

      {/* Show rows */}
      <div className="space-y-2.5">
        {displayShows.map((show, i) => (
          <motion.div
            key={show.key}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative rounded-2xl overflow-hidden border border-white/[0.07] min-h-[72px]"
          >
            {/* Full-bleed background */}
            {show.artistImageUrl ? (
              <div className="absolute inset-0">
                <img src={show.artistImageUrl} alt={show.artistName} className="w-full h-full object-cover scale-105" />
                <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
              </div>
            ) : (
              <div className="absolute inset-0 bg-white/[0.03]" />
            )}

            {/* Content */}
            <div className="relative flex items-center gap-3 px-4 py-3.5">
              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary/70 mb-0.5">
                  {format(parseISO(show.showDate), "EEE MMM d")}
                </p>
                <p className="text-sm font-bold text-white/95 truncate" style={{ textShadow: "0 0 12px rgba(255,255,255,0.25)" }}>
                  {show.artistName}
                </p>
                {show.venueName && (
                  <p className="text-[11px] text-white/45 truncate mt-0.5">{show.venueName}</p>
                )}
              </div>

              {/* Friend avatar stack */}
              <div className="flex-shrink-0 flex flex-col items-end gap-1">
                <div className="flex items-center -space-x-2">
                  {show.friends.slice(0, 3).map(friend => (
                    <Avatar key={friend.id} className="h-7 w-7 border-2 border-background/60">
                      <AvatarImage src={friend.avatar_url ?? undefined} />
                      <AvatarFallback className="text-[9px] bg-primary/30 text-primary">
                        {(friend.full_name || friend.username || "?").charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                  ))}
                  {show.friends.length > 3 && (
                    <div className="h-7 w-7 rounded-full border-2 border-background/60 bg-white/10 flex items-center justify-center">
                      <span className="text-[9px] font-bold text-white/60">+{show.friends.length - 3}</span>
                    </div>
                  )}
                </div>
                <span className="text-[10px] text-white/35">
                  {show.friends.length === 1
                    ? (show.friends[0].full_name || show.friends[0].username || "1 friend")
                    : `${show.friends.length} friends going`}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
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

      {/* Who's going this week — always shown (dummy data when no friends yet) */}
      <WhosGoingCard followingIds={followingIds} />

      {/* Tab switcher — Activity | Find Friends */}
      <div className="flex items-center gap-1 p-0.5 rounded-xl bg-white/[0.04] border border-white/[0.07] w-fit">
        {(["activity", "find"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-semibold transition-all",
              activeTab === tab
                ? "bg-white/[0.10] text-white/90 shadow-sm"
                : "text-white/35 hover:text-white/55"
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
                    <span className="ml-1 text-white/30">{items.filter(i => i.type === "upcoming").length}</span>
                  )}
                  {ft.id === "logged" && items.filter(i => i.type === "logged").length > 0 && (
                    <span className="ml-1 text-white/30">{items.filter(i => i.type === "logged").length}</span>
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
                  {filter === "all" ? "No recent activity from your friends" : `No ${filter} shows from friends`}
                </p>
              </div>
            ) : (
              <AnimatePresence initial={false}>
                {filtered.map((item, i) => (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}>
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
