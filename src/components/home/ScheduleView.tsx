import { useRef, useCallback, useMemo, useState } from "react";
import {
  format, parseISO, isToday, isSameDay, addDays, subDays,
  isFuture, isPast, startOfDay, startOfMonth, endOfMonth,
  eachDayOfInterval, getDay, addMonths, subMonths, isWithinInterval,
} from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, CalendarDays, MapPin, ChevronRight, ChevronLeft, Music2, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";
import type { UpcomingShow } from "@/hooks/usePlanUpcomingShow";
import type { FriendShow } from "@/hooks/useFriendUpcomingShows";
import type { FollowerProfile } from "@/hooks/useFollowers";

interface Artist {
  name: string;
  isHeadliner: boolean;
  imageUrl?: string;
}

interface Show {
  id: string;
  artists: Artist[];
  venue: { name: string; location: string };
  date: string;
  photo_url?: string | null;
  tags?: string[];
}

interface ShowRanking {
  show_id: string;
  elo_score: number;
  comparisons_count: number;
}

interface ScheduleViewProps {
  shows: Show[];
  rankings: ShowRanking[];
  upcomingShows: UpcomingShow[];
  friendsByDate: Map<string, FollowerProfile[]>;
  friendShows: FriendShow[];
  onShowTap: (show: Show) => void;
  onUpcomingTap: (show: UpcomingShow) => void;
  onPlanShow: () => void;
  calendarFriendsMode: boolean;
  onToggleFriendsMode: () => void;
  followingCount: number;
}

const WEEKDAY_LABELS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

/** Returns ISO string "yyyy-MM-dd" for a Date */
const toISO = (d: Date) => format(d, "yyyy-MM-dd");

export default function ScheduleView({
  shows,
  rankings,
  upcomingShows,
  friendsByDate,
  friendShows,
  onShowTap,
  onUpcomingTap,
  onPlanShow,
  calendarFriendsMode,
  onToggleFriendsMode,
  followingCount,
}: ScheduleViewProps) {
  const today = startOfDay(new Date());

  // Month being viewed
  const [viewMonth, setViewMonth] = useState<Date>(startOfMonth(today));
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);

  // ── Ranking helpers ─────────────────────────────────────────────────────────
  const rankingMap = useMemo(() => new Map(rankings.map(r => [r.show_id, r])), [rankings]);
  const sortedShowIds = useMemo(() => {
    return [...shows]
      .sort((a, b) => (rankingMap.get(b.id)?.elo_score ?? 1200) - (rankingMap.get(a.id)?.elo_score ?? 1200))
      .map(s => s.id);
  }, [shows, rankingMap]);

  const getRankInfo = (showId: string) => {
    const r = rankingMap.get(showId);
    const pos = sortedShowIds.indexOf(showId) + 1;
    if (!r || r.comparisons_count === 0) return null;
    return pos > 0 ? `#${pos}` : null;
  };

  // ── Build lookup maps ───────────────────────────────────────────────────────
  /** iso → list of MY past shows */
  const myShowsByDate = useMemo(() => {
    const map = new Map<string, Show[]>();
    for (const s of shows) {
      try {
        const iso = toISO(parseISO(s.date));
        if (!map.has(iso)) map.set(iso, []);
        map.get(iso)!.push(s);
      } catch {}
    }
    return map;
  }, [shows]);

  /** iso → list of MY upcoming shows */
  const myUpcomingByDate = useMemo(() => {
    const map = new Map<string, UpcomingShow[]>();
    for (const s of upcomingShows) {
      if (!s.show_date) continue;
      if (!map.has(s.show_date)) map.set(s.show_date, []);
      map.get(s.show_date)!.push(s);
    }
    return map;
  }, [upcomingShows]);

  /** iso → list of friend shows */
  const friendShowsByDate = useMemo(() => {
    const map = new Map<string, FriendShow[]>();
    if (!calendarFriendsMode) return map;
    for (const fs of friendShows) {
      if (!fs.show_date) continue;
      if (!map.has(fs.show_date)) map.set(fs.show_date, []);
      map.get(fs.show_date)!.push(fs);
    }
    return map;
  }, [friendShows, calendarFriendsMode]);

  // ── Days in this month that have at least one event ──────────────────────────
  const monthDays = useMemo(() => eachDayOfInterval({
    start: startOfMonth(viewMonth),
    end: endOfMonth(viewMonth),
  }), [viewMonth]);

  const activeDays = useMemo(() => {
    return monthDays.filter(day => {
      const iso = toISO(day);
      return (
        myShowsByDate.has(iso) ||
        myUpcomingByDate.has(iso) ||
        (calendarFriendsMode && (friendsByDate.has(iso) || friendShowsByDate.has(iso)))
      );
    });
  }, [monthDays, myShowsByDate, myUpcomingByDate, friendsByDate, friendShowsByDate, calendarFriendsMode]);

  // Which weekday columns (0=Sun..6=Sat) are used this month?
  const activeWeekdayCols = useMemo(() => {
    const set = new Set<number>();
    for (const d of activeDays) set.add(getDay(d));
    return set;
  }, [activeDays]);

  // ── "This Week" strip ───────────────────────────────────────────────────────
  const thisWeekItems = useMemo(() => {
    const end = addDays(today, 7);
    type WeekItem = {
      id: string;
      artistName: string;
      artistImage: string | null;
      date: string;
      dayLabel: string;
      isFriend: boolean;
      friendName?: string;
      rsvpStatus?: string;
      source: UpcomingShow | FriendShow | null;
    };
    const items: WeekItem[] = [];

    for (const s of upcomingShows) {
      if (!s.show_date) continue;
      try {
        const d = parseISO(s.show_date);
        if (isWithinInterval(d, { start: today, end })) {
          items.push({
            id: `mine-${s.id}`,
            artistName: s.artist_name,
            artistImage: s.artist_image_url,
            date: s.show_date,
            dayLabel: format(d, "EEE"),
            isFriend: false,
            rsvpStatus: s.rsvp_status,
            source: s,
          });
        }
      } catch {}
    }

    if (calendarFriendsMode) {
      for (const fs of friendShows) {
        if (!fs.show_date) continue;
        try {
          const d = parseISO(fs.show_date);
          if (!isWithinInterval(d, { start: today, end })) continue;
          const alreadyMine = items.some(
            i => !i.isFriend && i.date === fs.show_date && i.artistName.toLowerCase() === fs.artist_name.toLowerCase()
          );
          if (alreadyMine) continue;
          items.push({
            id: `friend-${fs.id}`,
            artistName: fs.artist_name,
            artistImage: fs.artist_image_url,
            date: fs.show_date,
            dayLabel: format(d, "EEE"),
            isFriend: true,
            friendName: fs.friend.full_name?.split(" ")[0] ?? fs.friend.username ?? "Friend",
            source: fs,
          });
        } catch {}
      }
    }

    return items.sort((a, b) => a.date.localeCompare(b.date));
  }, [upcomingShows, friendShows, calendarFriendsMode, today]);

  // Friends count badge
  const friendsNext30 = useMemo(() => {
    const set = new Set<string>();
    const end = addDays(today, 30);
    friendsByDate.forEach((friends, iso) => {
      try {
        const d = parseISO(iso);
        if (d >= today && d <= end) friends.forEach(f => set.add(f.id));
      } catch {}
    });
    return set.size;
  }, [friendsByDate, today]);

  const rsvpDotClass = (status: string) =>
    status === "going" ? "bg-emerald-400" : status === "maybe" ? "bg-amber-400" : "bg-red-400";

  // ── Selected day agenda data ─────────────────────────────────────────────────
  const selectedIso = selectedDay ? toISO(selectedDay) : null;
  const dayShows = selectedDay ? (myShowsByDate.get(toISO(selectedDay)) ?? []) : [];
  const dayUpcoming = selectedDay ? (myUpcomingByDate.get(toISO(selectedDay)) ?? []) : [];
  const dayFriends = (selectedDay && calendarFriendsMode) ? (friendsByDate.get(toISO(selectedDay)) ?? []) : [];
  const dayFriendShows = (selectedDay && calendarFriendsMode) ? (friendShowsByDate.get(toISO(selectedDay)) ?? []) : [];
  const isDayToday = selectedDay ? isToday(selectedDay) : false;
  const isDayFuture = selectedDay ? isFuture(selectedDay) : false;
  const isDayPast = selectedDay ? (isPast(selectedDay) && !isDayToday) : false;
  const isEmpty = dayShows.length === 0 && dayUpcoming.length === 0 && dayFriendShows.length === 0;

  // ── Cell image resolver ──────────────────────────────────────────────────────
  const getCellImage = (iso: string): string | null => {
    const shows = myShowsByDate.get(iso) ?? [];
    for (const s of shows) {
      if (s.photo_url) return s.photo_url;
      const h = s.artists.find(a => a.isHeadliner) ?? s.artists[0];
      if (h?.imageUrl) return h.imageUrl;
    }
    const upcoming = myUpcomingByDate.get(iso) ?? [];
    for (const u of upcoming) {
      if (u.artist_image_url) return u.artist_image_url;
    }
    if (calendarFriendsMode) {
      const fShows = friendShowsByDate.get(iso) ?? [];
      for (const fs of fShows) {
        if (fs.artist_image_url) return fs.artist_image_url;
      }
    }
    return null;
  };

  const getCellLabel = (iso: string): string => {
    const s = myShowsByDate.get(iso)?.[0];
    if (s) {
      const h = s.artists.find(a => a.isHeadliner) ?? s.artists[0];
      return h?.name ?? "";
    }
    const u = myUpcomingByDate.get(iso)?.[0];
    if (u) return u.artist_name;
    if (calendarFriendsMode) {
      const fs = friendShowsByDate.get(iso)?.[0];
      if (fs) return fs.artist_name;
    }
    return "";
  };

  const getCellType = (iso: string): "mine-past" | "mine-upcoming" | "friend-only" | "overlap" => {
    const hasPast = myShowsByDate.has(iso);
    const hasUpcoming = myUpcomingByDate.has(iso);
    const hasFriend = calendarFriendsMode && (friendsByDate.has(iso) || friendShowsByDate.has(iso));
    if ((hasPast || hasUpcoming) && hasFriend) return "overlap";
    if (hasPast) return "mine-past";
    if (hasUpcoming) return "mine-upcoming";
    return "friend-only";
  };

  return (
    <div className="flex flex-col gap-0">

      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-bold text-foreground">Schedule</h2>
        <button
          onClick={onToggleFriendsMode}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.08em] border transition-all duration-200",
            calendarFriendsMode
              ? "bg-primary/15 border-primary/40 text-primary"
              : "bg-white/[0.05] border-white/10 text-white/40 hover:text-white/60"
          )}
        >
          <Users className="h-3 w-3" />
          Friends
          {friendsNext30 > 0 && (
            <span className={cn(
              "text-[9px] font-bold px-1 py-0.5 rounded-full leading-none",
              calendarFriendsMode ? "bg-primary/40 text-primary-foreground" : "bg-white/15 text-white/60"
            )}>
              {friendsNext30}
            </span>
          )}
        </button>
      </div>

      {/* ── This Week strip ── */}
      {thisWeekItems.length > 0 && (
        <div className="mb-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Sparkles className="h-3 w-3 text-primary/60" />
            <span className="text-[10px] uppercase tracking-[0.18em] font-semibold text-muted-foreground/60">
              This Week
            </span>
          </div>
          <div className="flex gap-2.5 overflow-x-auto pb-1 scrollbar-hide">
            {thisWeekItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  try {
                    const d = startOfDay(parseISO(item.date));
                    setSelectedDay(d);
                    // Jump to the correct month
                    setViewMonth(startOfMonth(d));
                  } catch {}
                }}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center gap-1.5 w-[68px] rounded-2xl border py-2.5 transition-all duration-200",
                  item.isFriend
                    ? "bg-violet-500/[0.06] border-violet-500/[0.15] hover:bg-violet-500/[0.12]"
                    : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
                )}
              >
                <div className="relative w-11 h-11 rounded-xl overflow-hidden flex-shrink-0">
                  {item.artistImage ? (
                    <img
                      src={item.artistImage}
                      alt={item.artistName}
                      className="w-full h-full object-cover"
                      style={item.isFriend ? { filter: "brightness(0.7) saturate(0.8)" } : undefined}
                    />
                  ) : (
                    <div className={cn(
                      "w-full h-full flex items-center justify-center",
                      item.isFriend ? "bg-violet-500/10" : "bg-primary/10"
                    )}>
                      <Music2 className={cn("w-5 h-5", item.isFriend ? "text-violet-400/40" : "text-primary/40")} />
                    </div>
                  )}
                  {!item.isFriend && item.rsvpStatus && (
                    <span className={cn("absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-black/30", rsvpDotClass(item.rsvpStatus))} />
                  )}
                  {item.isFriend && (
                    <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-violet-500/80 border border-black/30 flex items-center justify-center">
                      <Users className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>
                <span className={cn("text-[10px] font-bold leading-none", item.isFriend ? "text-violet-300/70" : "text-primary/70")}>
                  {item.dayLabel}
                </span>
                <span className="text-[9px] text-muted-foreground/60 leading-tight text-center px-1 truncate w-full">
                  {item.artistName}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Sparse Month Grid ── */}
      <div className="mb-4">
        {/* Month navigation */}
        <div className="flex items-center justify-between mb-3">
          <button
            onClick={() => { setViewMonth(m => subMonths(m, 1)); setSelectedDay(null); }}
            className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.10] transition-colors"
          >
            <ChevronLeft className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
          <span className="text-sm font-semibold text-foreground tracking-wide">
            {format(viewMonth, "MMMM yyyy")}
          </span>
          <button
            onClick={() => { setViewMonth(m => addMonths(m, 1)); setSelectedDay(null); }}
            className="w-7 h-7 rounded-full bg-white/[0.05] border border-white/[0.08] flex items-center justify-center hover:bg-white/[0.10] transition-colors"
          >
            <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
          </button>
        </div>

        {/* Today pill — only visible when browsing a different month */}
        <AnimatePresence>
          {format(viewMonth, "yyyy-MM") !== format(startOfMonth(today), "yyyy-MM") && (
            <motion.div
              initial={{ opacity: 0, y: -6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -6, scale: 0.95 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="flex justify-center mb-3"
            >
              <button
                onClick={() => { setViewMonth(startOfMonth(today)); setSelectedDay(today); }}
                className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.06] border border-white/[0.10] text-[11px] font-semibold text-muted-foreground hover:text-foreground hover:bg-white/[0.10] transition-all duration-200 backdrop-blur-sm"
              >
                <CalendarDays className="h-3 w-3" />
                Today
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeDays.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <CalendarDays className="w-8 h-8 text-muted-foreground/20 mb-2" />
            <p className="text-sm text-muted-foreground/40">No shows this month</p>
            <button
              onClick={onPlanShow}
              className="mt-2 text-xs text-primary/50 hover:text-primary transition-colors font-medium"
            >
              + Plan one
            </button>
          </div>
        ) : (
          <SparseGrid
            activeDays={activeDays}
            activeWeekdayCols={activeWeekdayCols}
            selectedDay={selectedDay}
            today={today}
            myShowsByDate={myShowsByDate}
            myUpcomingByDate={myUpcomingByDate}
            friendsByDate={calendarFriendsMode ? friendsByDate : new Map()}
            friendShowsByDate={calendarFriendsMode ? friendShowsByDate : new Map()}
            calendarFriendsMode={calendarFriendsMode}
            getCellImage={getCellImage}
            getCellLabel={getCellLabel}
            getCellType={getCellType}
            onSelectDay={setSelectedDay}
            viewMonth={viewMonth}
          />
        )}
      </div>

      {/* ── Legend ── */}
      {activeDays.length > 0 && (
        <div className="flex items-center gap-4 mb-4 px-0.5">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-primary/80" />
            <span className="text-[10px] text-muted-foreground/50">You</span>
          </div>
          {calendarFriendsMode && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-violet-400/80" />
              <span className="text-[10px] text-muted-foreground/50">Friends</span>
            </div>
          )}
          {calendarFriendsMode && (
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-400/80" />
              <span className="text-[10px] text-muted-foreground/50">Overlap</span>
            </div>
          )}
        </div>
      )}

      {/* ── Selected day agenda ── */}
      <AnimatePresence mode="wait">
        {selectedDay && (
          <motion.div
            key={selectedIso}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
          >
            {/* Day header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className={cn("text-base font-bold", isDayToday ? "text-cyan-400" : "text-foreground")}>
                  {isDayToday ? "Today" : format(selectedDay, "EEEE")}
                </p>
                <p className="text-[11px] text-muted-foreground/60">{format(selectedDay, "MMMM d, yyyy")}</p>
              </div>
              {!isDayPast && (
                <button
                  onClick={onPlanShow}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/[0.08] hover:bg-white/[0.08] text-muted-foreground hover:text-foreground transition-all text-xs font-medium"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Plan show
                </button>
              )}
            </div>

            {/* Agenda items */}
            <div className="space-y-2">
              {/* Past shows */}
              {dayShows.map(show => {
                const headliner = show.artists.find(a => a.isHeadliner) ?? show.artists[0];
                const rank = getRankInfo(show.id);
                const artistImg = show.photo_url ?? headliner?.imageUrl;
                return (
                  <button
                    key={show.id}
                    onClick={() => onShowTap(show)}
                    className="w-full flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.07] hover:border-white/[0.12] rounded-2xl px-4 py-3 transition-all text-left group"
                  >
                    <div className="relative w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden bg-primary/10">
                      {artistImg ? (
                        <img src={artistImg} alt={headliner?.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 className="w-5 h-5 text-primary/50" />
                        </div>
                      )}
                      {rank && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                          <span className="text-[10px] font-bold text-white" style={{ textShadow: "0 0 4px rgba(0,0,0,0.8)" }}>{rank}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{headliner?.name ?? "Unknown Artist"}</p>
                      <div className="flex items-center gap-1 mt-0.5">
                        <MapPin className="h-3 w-3 text-muted-foreground/50 flex-shrink-0" />
                        <p className="text-xs text-muted-foreground truncate">{[show.venue.name, show.venue.location].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 flex-shrink-0">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-primary/70">✓ Attended</span>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                    </div>
                  </button>
                );
              })}

              {/* Upcoming shows */}
              {dayUpcoming.map(upcoming => {
                const friendsHere = calendarFriendsMode ? (friendsByDate.get(upcoming.show_date ?? "") ?? []) : [];
                return (
                  <button
                    key={upcoming.id}
                    onClick={() => onUpcomingTap(upcoming)}
                    className="w-full flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.07] border border-dashed border-white/[0.12] hover:border-primary/30 rounded-2xl px-4 py-3 transition-all text-left group"
                  >
                    <div className="relative w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden bg-primary/[0.08] border border-dashed border-white/20">
                      {upcoming.artist_image_url ? (
                        <img src={upcoming.artist_image_url} alt={upcoming.artist_name} className="w-full h-full object-cover" style={{ filter: "brightness(0.75)" }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <CalendarDays className="w-5 h-5 text-primary/30" />
                        </div>
                      )}
                      <span className={cn("absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-black/30", rsvpDotClass(upcoming.rsvp_status))} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground/80 truncate">{upcoming.artist_name}</p>
                      {(upcoming.venue_name || upcoming.venue_location) && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground/60 truncate">{[upcoming.venue_name, upcoming.venue_location].filter(Boolean).join(" · ")}</p>
                        </div>
                      )}
                      {friendsHere.length > 0 && (
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex items-center">
                            {friendsHere.slice(0, 3).map((f, i) => (
                              f.avatar_url ? (
                                <img key={f.id} src={f.avatar_url} alt={f.username ?? ""} className="w-4 h-4 rounded-full border border-black/40 object-cover" style={{ marginLeft: i === 0 ? 0 : -4, zIndex: 3 - i }} />
                              ) : (
                                <div key={f.id} className="w-4 h-4 rounded-full border border-black/40 bg-violet-500/70 flex items-center justify-center" style={{ marginLeft: i === 0 ? 0 : -4, zIndex: 3 - i }}>
                                  <span className="text-[6px] font-bold text-white leading-none">{(f.username ?? f.full_name ?? "?")[0].toUpperCase()}</span>
                                </div>
                              )
                            ))}
                          </div>
                          <span className="text-[10px] text-violet-300/70 font-medium">
                            {friendsHere.length === 1 ? `${friendsHere[0].full_name?.split(" ")[0] ?? friendsHere[0].username} also going` : `${friendsHere.length} friends going`}
                          </span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors flex-shrink-0" />
                  </button>
                );
              })}

              {/* Friend-only shows */}
              {dayFriendShows
                .filter(fs => !dayUpcoming.some(u => u.artist_name === fs.artist_name))
                .map(fs => (
                  <div key={fs.id} className="w-full flex items-center gap-3 bg-violet-500/[0.05] border border-violet-500/[0.15] rounded-2xl px-4 py-3">
                    <div className="relative w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden bg-violet-500/10">
                      {fs.artist_image_url ? (
                        <img src={fs.artist_image_url} alt={fs.artist_name} className="w-full h-full object-cover" style={{ filter: "brightness(0.7) saturate(0.8)" }} />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Music2 className="w-5 h-5 text-violet-400/40" />
                        </div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground/60 truncate">{fs.artist_name}</p>
                      {(fs.venue_name || fs.venue_location) && (
                        <div className="flex items-center gap-1 mt-0.5">
                          <MapPin className="h-3 w-3 text-muted-foreground/30 flex-shrink-0" />
                          <p className="text-xs text-muted-foreground/40 truncate">{[fs.venue_name, fs.venue_location].filter(Boolean).join(" · ")}</p>
                        </div>
                      )}
                      <div className="flex items-center gap-1 mt-1">
                        {fs.friend.avatar_url ? (
                          <img src={fs.friend.avatar_url} alt="" className="w-4 h-4 rounded-full border border-black/40 object-cover" />
                        ) : (
                          <div className="w-4 h-4 rounded-full bg-violet-500/60 border border-black/40 flex items-center justify-center">
                            <span className="text-[6px] font-bold text-white">{(fs.friend.username ?? fs.friend.full_name ?? "?")[0].toUpperCase()}</span>
                          </div>
                        )}
                        <span className="text-[10px] text-violet-300/60">{fs.friend.full_name?.split(" ")[0] ?? fs.friend.username} is going</span>
                      </div>
                    </div>
                  </div>
                ))}

              {/* Empty state */}
              {isEmpty && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center mb-3", isDayFuture ? "bg-primary/10" : "bg-white/[0.04]")}>
                    <CalendarDays className={cn("w-6 h-6", isDayFuture ? "text-primary/40" : "text-muted-foreground/30")} />
                  </div>
                  <p className="text-sm font-medium text-muted-foreground/60">
                    {isDayPast ? "No shows this day" : isDayToday ? "Nothing planned today" : "Nothing planned yet"}
                  </p>
                  {isDayFuture && (
                    <button onClick={onPlanShow} className="mt-3 text-xs text-primary/60 hover:text-primary transition-colors font-medium">
                      + Add a show for this day
                    </button>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// SparseGrid — Full 7-column calendar grid preserving all weeks.
// Weeks with no events collapse into a slim "void" row.
// Weeks that have events show: art cells for show-days, ghost cells for empty days.
// ─────────────────────────────────────────────────────────────────────────────

interface SparseGridProps {
  activeDays: Date[];
  activeWeekdayCols: Set<number>; // kept for compat but not used to filter cols
  selectedDay: Date | null;
  today: Date;
  myShowsByDate: Map<string, Show[]>;
  myUpcomingByDate: Map<string, UpcomingShow[]>;
  friendsByDate: Map<string, FollowerProfile[]>;
  friendShowsByDate: Map<string, FriendShow[]>;
  calendarFriendsMode: boolean;
  getCellImage: (iso: string) => string | null;
  getCellLabel: (iso: string) => string;
  getCellType: (iso: string) => "mine-past" | "mine-upcoming" | "friend-only" | "overlap";
  onSelectDay: (d: Date) => void;
  viewMonth: Date;
}

function SparseGrid({
  activeDays,
  selectedDay,
  getCellImage,
  getCellLabel,
  getCellType,
  onSelectDay,
  viewMonth,
}: SparseGridProps) {
  // Which weekday columns (0=Sun..6=Sat) have at least one event this month?
  const activeColSet = useMemo(() => {
    const set = new Set<number>();
    for (const d of activeDays) set.add(getDay(d));
    return set;
  }, [activeDays]);

  // Build gridTemplateColumns: cap active cols so a single active col never fills the full width.
  // With 1 active col: ~72px max. With 7: ~1fr each (~44px typical on mobile).
  const gridTemplate = useMemo(() => {
    const count = activeColSet.size;
    const maxColWidth = Math.min(72, Math.max(44, Math.round(280 / Math.max(count, 1))));
    return [0, 1, 2, 3, 4, 5, 6]
      .map(wd => (activeColSet.has(wd) ? `minmax(0, ${maxColWidth}px)` : "16px"))
      .join(" ");
  }, [activeColSet]);

  // Build the full calendar grid for the month (all days, all weeks, 7 cols)
  type WeekRow = {
    weekIndex: number;
    hasEvents: boolean;
    cells: Array<{ day: Date; iso: string; hasEvent: boolean } | null>;
  };

  const allWeeks = useMemo<WeekRow[]>(() => {
    const activeSet = new Set(activeDays.map(d => toISO(d)));

    const firstDay = startOfMonth(viewMonth);
    const lastDay = endOfMonth(viewMonth);
    const startCol = getDay(firstDay);

    const monthDays = eachDayOfInterval({ start: firstDay, end: lastDay });

    const weeks: WeekRow[] = [];
    let weekCells: Array<{ day: Date; iso: string; hasEvent: boolean } | null> = Array(7).fill(null);
    let weekIdx = 0;
    let hasEventsInWeek = false;

    for (let i = 0; i < startCol; i++) weekCells[i] = null;

    for (const day of monthDays) {
      const col = getDay(day);
      const iso = toISO(day);
      const hasEvent = activeSet.has(iso);
      if (hasEvent) hasEventsInWeek = true;

      weekCells[col] = { day, iso, hasEvent };

      if (col === 6) {
        weeks.push({ weekIndex: weekIdx, hasEvents: hasEventsInWeek, cells: weekCells });
        weekCells = Array(7).fill(null);
        hasEventsInWeek = false;
        weekIdx++;
      }
    }
    if (weekCells.some(c => c !== null)) {
      weeks.push({ weekIndex: weekIdx, hasEvents: hasEventsInWeek, cells: weekCells });
    }

    return weeks;
  }, [activeDays, viewMonth]);

  const cellTypeColors: Record<string, string> = {
    "mine-past": "border-primary/40",
    "mine-upcoming": "border-primary/30 border-dashed",
    "friend-only": "border-violet-400/40",
    "overlap": "border-amber-400/50",
  };

  const selectedRingColors: Record<string, string> = {
    "mine-past": "ring-primary/70",
    "mine-upcoming": "ring-primary/50",
    "friend-only": "ring-violet-400/60",
    "overlap": "ring-amber-400/70",
  };

  const dotColors: Record<string, string> = {
    "mine-past": "bg-primary",
    "mine-upcoming": "bg-primary/60",
    "friend-only": "bg-violet-400",
    "overlap": "bg-amber-400",
  };

  const GAP = "4px";

  return (
    <div>
      {/* Weekday column headers — all 7, but empty cols are narrow */}
      <div className="grid mb-2" style={{ gridTemplateColumns: gridTemplate, gap: GAP }}>
        {WEEKDAY_LABELS.map((wd, idx) => {
          const isEmpty = !activeColSet.has(idx);
          return (
            <div
              key={wd}
              className={cn(
                "text-center font-semibold uppercase tracking-[0.10em]",
                isEmpty
                  ? "text-[7px] text-muted-foreground/20"
                  : "text-[9px] text-muted-foreground/40"
              )}
            >
              {isEmpty ? wd[0] : wd}
            </div>
          );
        })}
      </div>

      {/* Week rows */}
      <div className="space-y-1">
        {allWeeks.map((week, rowIdx) => {
          if (!week.hasEvents) {
            // Empty week — slim void row
            return (
              <div key={rowIdx} className="grid h-5" style={{ gridTemplateColumns: gridTemplate, gap: GAP }}>
                {week.cells.map((cell, colIdx) => (
                  <div key={colIdx} className="flex items-center justify-center">
                    {cell ? (
                      <span className="text-[7px] text-muted-foreground/15 font-medium tabular-nums leading-none">
                        {format(cell.day, "d")}
                      </span>
                    ) : null}
                  </div>
                ))}
              </div>
            );
          }

          // Week with events — full-height row
          return (
            <div key={rowIdx} className="grid" style={{ gridTemplateColumns: gridTemplate, gap: GAP }}>
              {week.cells.map((cell, colIdx) => {
                const colHasEvents = activeColSet.has(colIdx);

                if (!cell) {
                  return <div key={colIdx} className={colHasEvents ? "h-14" : "h-5"} />;
                }

                if (!cell.hasEvent) {
                  // In-month day, no event — ghost: tiny date number
                  const isTodayCell = isToday(cell.day);
                  return (
                    <div
                      key={colIdx}
                      className={cn(
                        "flex items-end justify-center",
                        colHasEvents ? "h-14 pb-1" : "h-5 justify-center items-center"
                      )}
                    >
                      <span className={cn(
                        "tabular-nums leading-none",
                        colHasEvents ? "text-[9px] font-medium" : "text-[7px] font-medium",
                        isTodayCell ? "text-cyan-400/50" : "text-muted-foreground/20"
                      )}>
                        {format(cell.day, "d")}
                      </span>
                    </div>
                  );
                }

                // Event day — full art card
                const { day, iso } = cell;
                const img = getCellImage(iso);
                const label = getCellLabel(iso);
                const type = getCellType(iso);
                const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
                const isTodayCell = isToday(day);
                const isPastDay = isPast(day) && !isTodayCell;

                return (
                  <motion.button
                    key={iso}
                    onClick={() => onSelectDay(day)}
                    whileTap={{ scale: 0.92 }}
                    className={cn(
                      "relative h-14 rounded-xl overflow-hidden border-[1.5px] transition-all duration-200",
                      cellTypeColors[type],
                      isSelected && `ring-2 ring-offset-1 ring-offset-background ${selectedRingColors[type]}`
                    )}
                  >
                    {img ? (
                      <img
                        src={img}
                        alt={label}
                        className="absolute inset-0 w-full h-full object-cover object-top"
                        style={{ filter: isPastDay && type !== "overlap" ? "brightness(0.65) saturate(0.7)" : undefined }}
                      />
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-muted/20">
                        <Music2 className="w-3 h-3 text-muted-foreground/30" />
                      </div>
                    )}

                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/5 to-transparent" />

                    {isTodayCell && !isSelected && (
                      <div className="absolute inset-0 rounded-xl ring-2 ring-cyan-400/60 pointer-events-none" />
                    )}

                    <div className="absolute bottom-0 left-0 right-0 px-1 pb-1 flex items-end justify-between">
                      <span className={cn(
                        "text-[10px] font-black leading-none tabular-nums drop-shadow-sm",
                        isTodayCell ? "text-cyan-300" : "text-white/90"
                      )}>
                        {format(day, "d")}
                      </span>
                      <div className={cn("w-1 h-1 rounded-full flex-shrink-0", dotColors[type])} />
                    </div>
                  </motion.button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

