import { useRef, useEffect, useState, useCallback, useMemo } from "react";
import { format, parseISO, isToday, isSameDay, addDays, subDays, isFuture, isPast, startOfDay, eachDayOfInterval, isWithinInterval } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { Users, Plus, CalendarDays, MapPin, ChevronRight, Music2, Sparkles } from "lucide-react";
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

// How many days back/forward to build the strip
const DAYS_BACK = 90;
const DAYS_FORWARD = 180;

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
  const stripStart = subDays(today, DAYS_BACK);
  const stripEnd = addDays(today, DAYS_FORWARD);
  const allDays = eachDayOfInterval({ start: stripStart, end: stripEnd });

  // Compute which days have content so we can show dots on the strip
  const daysWithContent = useMemo(() => {
    const set = new Set<string>();
    for (const show of shows) {
      try { set.add(format(parseISO(show.date), "yyyy-MM-dd")); } catch {}
    }
    for (const show of upcomingShows) {
      if (show.show_date) set.add(show.show_date);
    }
    if (calendarFriendsMode) {
      for (const [d] of friendsByDate) {
        set.add(d);
      }
    }
    return set;
  }, [shows, upcomingShows, friendsByDate, calendarFriendsMode]);

  const daysWithFriendsOnly = useMemo(() => {
    const myDates = new Set<string>();
    for (const show of shows) {
      try { myDates.add(format(parseISO(show.date), "yyyy-MM-dd")); } catch {}
    }
    for (const show of upcomingShows) {
      if (show.show_date) myDates.add(show.show_date);
    }
    const set = new Set<string>();
    if (calendarFriendsMode) {
      for (const [d] of friendsByDate) {
        if (!myDates.has(d)) set.add(d);
      }
    }
    return set;
  }, [shows, upcomingShows, friendsByDate, calendarFriendsMode]);

  // Selected day — default to today
  const [selectedDay, setSelectedDay] = useState<Date>(today);

  const stripRef = useRef<HTMLDivElement>(null);
  const todayChipRef = useRef<HTMLButtonElement>(null);

  // Scroll the strip so today is centred on mount
  useEffect(() => {
    const el = todayChipRef.current;
    const strip = stripRef.current;
    if (!el || !strip) return;
    // Delay one frame so layout is complete
    requestAnimationFrame(() => {
      const chipLeft = el.offsetLeft;
      const chipWidth = el.offsetWidth;
      const stripWidth = strip.clientWidth;
      strip.scrollLeft = chipLeft - stripWidth / 2 + chipWidth / 2;
    });
  }, []);

  const scrollChipIntoView = useCallback((el: HTMLButtonElement | null) => {
    const strip = stripRef.current;
    if (!el || !strip) return;
    requestAnimationFrame(() => {
      const chipLeft = el.offsetLeft;
      const chipWidth = el.offsetWidth;
      const stripWidth = strip.clientWidth;
      strip.scrollTo({ left: chipLeft - stripWidth / 2 + chipWidth / 2, behavior: "smooth" });
    });
  }, []);

  const rankingMap = useMemo(() => new Map(rankings.map(r => [r.show_id, r])), [rankings]);
  const sortedShowIds = useMemo(() => {
    return [...shows]
      .sort((a, b) => {
        const eA = rankingMap.get(a.id)?.elo_score ?? 1200;
        const eB = rankingMap.get(b.id)?.elo_score ?? 1200;
        return eB - eA;
      })
      .map(s => s.id);
  }, [shows, rankingMap]);

  const getRankInfo = (showId: string) => {
    const r = rankingMap.get(showId);
    const pos = sortedShowIds.indexOf(showId) + 1;
    if (!r || r.comparisons_count === 0) return null;
    return pos > 0 ? `#${pos}` : null;
  };

  // Get content for selected day
  const selectedIso = format(selectedDay, "yyyy-MM-dd");
  const dayShows = shows.filter(s => {
    try { return isSameDay(parseISO(s.date), selectedDay); } catch { return false; }
  });
  const dayUpcoming = upcomingShows.filter(s => s.show_date && isSameDay(parseISO(s.show_date), selectedDay));
  const dayFriends = calendarFriendsMode ? (friendsByDate.get(selectedIso) ?? []) : [];
  const dayFriendShows = calendarFriendsMode
    ? friendShows.filter(fs => fs.show_date && isSameDay(parseISO(fs.show_date), selectedDay))
    : [];

  const isEmpty = dayShows.length === 0 && dayUpcoming.length === 0 && dayFriendShows.length === 0;
  const isDayToday = isToday(selectedDay);
  const isDayFuture = isFuture(selectedDay);
  const isDayPast = isPast(selectedDay) && !isDayToday;

  // Count friends this "month window" (next 30 days) for badge
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

  // "This Week" — upcoming events in the next 7 days, sorted by date
  const thisWeekItems = useMemo(() => {
    const end = addDays(today, 7);
    type WeekItem = {
      id: string;
      artistName: string;
      artistImage: string | null;
      date: string; // ISO
      dayLabel: string; // e.g. "Fri"
      isFriend: boolean;
      friendName?: string;
      rsvpStatus?: string;
      source: UpcomingShow | FriendShow | null;
    };
    const items: WeekItem[] = [];

    // My upcoming shows
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

    // Friends' upcoming shows (only if not already added as mine on same day+artist)
    if (calendarFriendsMode) {
      for (const fs of friendShows) {
        if (!fs.show_date) continue;
        try {
          const d = parseISO(fs.show_date);
          if (!isWithinInterval(d, { start: today, end })) continue;
          // Skip if I already have a matching upcoming show on same day
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

  const rsvpDotClass = (status: string) =>
    status === "going" ? "bg-emerald-400" : status === "maybe" ? "bg-amber-400" : "bg-red-400";

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
                  // Jump to that day in the strip
                  try {
                    const d = startOfDay(parseISO(item.date));
                    setSelectedDay(d);
                    // Find and scroll the chip
                    const iso = format(d, "yyyy-MM-dd");
                    const strip = stripRef.current;
                    if (strip) {
                      const chipEls = strip.querySelectorAll<HTMLButtonElement>("[data-day-iso]");
                      chipEls.forEach(el => {
                        if (el.dataset.dayIso === iso) scrollChipIntoView(el);
                      });
                    }
                  } catch {}
                }}
                className={cn(
                  "flex-shrink-0 flex flex-col items-center gap-1.5 w-[68px] rounded-2xl border py-2.5 transition-all duration-200",
                  item.isFriend
                    ? "bg-violet-500/[0.06] border-violet-500/[0.15] hover:bg-violet-500/[0.12]"
                    : "bg-white/[0.04] border-white/[0.08] hover:bg-white/[0.08]"
                )}
              >
                {/* Artist thumbnail */}
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
                  {/* RSVP dot for my shows */}
                  {!item.isFriend && item.rsvpStatus && (
                    <span className={cn(
                      "absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-black/30",
                      rsvpDotClass(item.rsvpStatus)
                    )} />
                  )}
                  {/* Friend indicator */}
                  {item.isFriend && (
                    <div className="absolute bottom-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-violet-500/80 border border-black/30 flex items-center justify-center">
                      <Users className="w-2 h-2 text-white" />
                    </div>
                  )}
                </div>

                {/* Day label */}
                <span className={cn(
                  "text-[10px] font-bold leading-none",
                  item.isFriend ? "text-violet-300/70" : "text-primary/70"
                )}>
                  {item.dayLabel}
                </span>

                {/* Artist name */}
                <span className="text-[9px] text-muted-foreground/60 leading-tight text-center px-1 truncate w-full">
                  {item.artistName}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Day-chip strip ── */}
      <div
        ref={stripRef}
        className="flex gap-2 overflow-x-auto pb-3 scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {allDays.map(day => {
          const iso = format(day, "yyyy-MM-dd");
          const isSelected = isSameDay(day, selectedDay);
          const isTodayDay = isToday(day);
          const hasContent = daysWithContent.has(iso);
          const friendsOnly = daysWithFriendsOnly.has(iso);
          const hasMine = hasContent && !friendsOnly;
          const hasBoth = hasMine && calendarFriendsMode && friendsByDate.has(iso);
          const dayIsPast = isPast(day) && !isTodayDay;

          return (
            <button
              key={iso}
              ref={isTodayDay ? todayChipRef : undefined}
              data-day-iso={iso}
              onClick={(e) => {
                setSelectedDay(day);
                scrollChipIntoView(e.currentTarget);
              }}
              className={cn(
                "flex-shrink-0 flex flex-col items-center gap-1 w-12 pt-2 pb-1.5 rounded-2xl border transition-all duration-200",
                isSelected
                  ? "bg-primary/20 border-primary/50 shadow-[0_0_12px_hsl(var(--primary)/0.25)]"
                  : isTodayDay
                  ? "bg-cyan-500/10 border-cyan-400/40"
                  : "bg-white/[0.03] border-white/[0.06] hover:bg-white/[0.07]"
              )}
            >
              {/* Day of week */}
              <span className={cn(
                "text-[9px] font-semibold uppercase tracking-wider leading-none",
                isSelected ? "text-primary" : isTodayDay ? "text-cyan-400" : "text-muted-foreground/60"
              )}>
                {format(day, "EEE")}
              </span>

              {/* Day number */}
              <span className={cn(
                "text-sm font-bold leading-none",
                isSelected ? "text-primary" : isTodayDay ? "text-cyan-400" : dayIsPast ? "text-foreground/40" : "text-foreground/80"
              )}>
                {format(day, "d")}
              </span>

              {/* Dot indicator */}
              <div className="h-1.5 flex items-center justify-center">
                {hasBoth ? (
                  <div className="flex gap-0.5">
                    <div className="w-1 h-1 rounded-full bg-primary/80" />
                    <div className="w-1 h-1 rounded-full bg-violet-400/80" />
                  </div>
                ) : hasMine ? (
                  <div className={cn("w-1.5 h-1.5 rounded-full", isSelected ? "bg-primary" : "bg-primary/60")} />
                ) : friendsOnly ? (
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-400/70" />
                ) : (
                  <div className="w-1 h-1 rounded-full bg-transparent" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Selected day header ── */}
      <div className="flex items-center justify-between mt-1 mb-3">
        <div>
          <p className={cn(
            "text-base font-bold",
            isDayToday ? "text-cyan-400" : "text-foreground"
          )}>
            {isDayToday ? "Today" : format(selectedDay, "EEEE")}
          </p>
          <p className="text-[11px] text-muted-foreground/60">{format(selectedDay, "MMMM d, yyyy")}</p>
        </div>

        {/* Add show to this day — only for today/future */}
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

      {/* ── Agenda content for selected day ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedIso}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.15, ease: "easeOut" }}
          className="space-y-2"
        >
          {/* Past shows (attended) */}
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
                {/* Artist thumbnail */}
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
                    <p className="text-xs text-muted-foreground truncate">
                      {[show.venue.name, show.venue.location].filter(Boolean).join(" · ")}
                    </p>
                  </div>
                  {show.tags && show.tags.length > 0 && (
                    <p className="text-[10px] text-muted-foreground/50 mt-0.5 truncate">{show.tags.slice(0, 3).join(" · ")}</p>
                  )}
                </div>

                {/* Attended badge */}
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/15 border border-primary/25 text-primary/70">
                    ✓ Attended
                  </span>
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/30 group-hover:text-muted-foreground/60 transition-colors" />
                </div>
              </button>
            );
          })}

          {/* Upcoming shows (planned) */}
          {dayUpcoming.map(upcoming => {
            const friendsHere = calendarFriendsMode ? (friendsByDate.get(upcoming.show_date ?? "") ?? []) : [];

            return (
              <button
                key={upcoming.id}
                onClick={() => onUpcomingTap(upcoming)}
                className="w-full flex items-center gap-3 bg-white/[0.04] hover:bg-white/[0.07] border border-dashed border-white/[0.12] hover:border-primary/30 rounded-2xl px-4 py-3 transition-all text-left group"
              >
                {/* Artist thumbnail */}
                <div className="relative w-11 h-11 rounded-xl flex-shrink-0 overflow-hidden bg-primary/[0.08] border border-dashed border-white/20">
                  {upcoming.artist_image_url ? (
                    <img
                      src={upcoming.artist_image_url}
                      alt={upcoming.artist_name}
                      className="w-full h-full object-cover"
                      style={{ filter: "brightness(0.75)" }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-primary/30" />
                    </div>
                  )}
                  {/* RSVP dot */}
                  <span className={cn(
                    "absolute bottom-0.5 right-0.5 w-2 h-2 rounded-full border border-black/30",
                    rsvpDotClass(upcoming.rsvp_status)
                  )} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground/80 truncate">{upcoming.artist_name}</p>
                  {(upcoming.venue_name || upcoming.venue_location) && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <MapPin className="h-3 w-3 text-muted-foreground/40 flex-shrink-0" />
                      <p className="text-xs text-muted-foreground/60 truncate">
                        {[upcoming.venue_name, upcoming.venue_location].filter(Boolean).join(" · ")}
                      </p>
                    </div>
                  )}

                  {/* Friends going */}
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

          {/* Friend shows (friends attending, you are not) */}
          {calendarFriendsMode && dayFriendShows
            .filter(fs => !dayUpcoming.some(u => u.artist_name === fs.artist_name))
            .map(fs => (
              <div
                key={fs.id}
                className="w-full flex items-center gap-3 bg-violet-500/[0.05] border border-violet-500/[0.15] rounded-2xl px-4 py-3"
              >
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
                      <p className="text-xs text-muted-foreground/40 truncate">
                        {[fs.venue_name, fs.venue_location].filter(Boolean).join(" · ")}
                      </p>
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
                    <span className="text-[10px] text-violet-300/60">
                      {fs.friend.full_name?.split(" ")[0] ?? fs.friend.username} is going
                    </span>
                  </div>
                </div>
              </div>
            ))}

          {/* Empty state */}
          {isEmpty && (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center mb-3",
                isDayFuture ? "bg-primary/10" : "bg-white/[0.04]"
              )}>
                <CalendarDays className={cn("w-6 h-6", isDayFuture ? "text-primary/40" : "text-muted-foreground/30")} />
              </div>
              <p className="text-sm font-medium text-muted-foreground/60">
                {isDayPast ? "No shows this day" : isDayToday ? "Nothing planned today" : "Nothing planned yet"}
              </p>
              {isDayFuture && (
                <button
                  onClick={onPlanShow}
                  className="mt-3 text-xs text-primary/60 hover:text-primary transition-colors font-medium"
                >
                  + Add a show for this day
                </button>
              )}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
