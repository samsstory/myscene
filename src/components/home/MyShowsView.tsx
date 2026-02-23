import { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpDown, Plus, Search, X } from "lucide-react";
import { format, parseISO } from "date-fns";
import { type Show, type ShowRanking } from "@/hooks/useShows";
import SwipeableRankingCard from "@/components/rankings/SwipeableRankingCard";
import ShowsBarChart from "@/components/rankings/ShowsBarChart";
import { ShowRankBadge } from "@/components/feed/ShowRankBadge";
import { Skeleton } from "@/components/ui/skeleton";
import StatPills, { type StatPillAction, type StatPill } from "./StatPills";

interface MyShowsViewProps {
  shows: Show[];
  rankings: ShowRanking[];
  loading: boolean;
  getShowRankInfo: (showId: string, sortedShowIds?: string[]) => { position: number | null; total: number; comparisonsCount: number };
  onShowTap: (show: Show) => void;
  onDeleteShow: (show: Show) => void;
  onAddPhoto: (show: Show) => void;
  onAddTags: (showId: string) => void;
  onRankShow: () => void;
  statPills?: StatPill[];
  statsLoading?: boolean;
  onPillTap?: (action: StatPillAction, payload?: string) => void;
}

type TimeFilter = "all-time" | "this-year" | "last-year" | "this-month";
type SortMode = "best" | "worst" | "newest" | "oldest";
type ShowTypeFilter = "all" | "set" | "show" | "festival";

const MyShowsView = ({
  shows,
  rankings,
  loading,
  getShowRankInfo,
  onShowTap,
  onDeleteShow,
  onAddPhoto,
  onAddTags,
  onRankShow,
  statPills,
  statsLoading,
  onPillTap,
}: MyShowsViewProps) => {
  const [topRatedFilter, setTopRatedFilter] = useState<TimeFilter>("all-time");
  const [sortMode, setSortMode] = useState<SortMode>("best");
  const [attentionFilterActive, setAttentionFilterActive] = useState(false);
  const [showTypeFilter, setShowTypeFilter] = useState<ShowTypeFilter>("all");
  const [rankingsSearch, setRankingsSearch] = useState("");
  const [floatingSearchOpen, setFloatingSearchOpen] = useState(false);
  const [searchBarHidden, setSearchBarHidden] = useState(false);
  const searchBarRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Callback ref to attach IntersectionObserver when the search bar mounts
  const searchBarCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    searchBarRef.current = node;
    if (node) {
      const observer = new IntersectionObserver(
        ([entry]) => setSearchBarHidden(!entry.isIntersecting),
        { threshold: 0 }
      );
      observer.observe(node);
      observerRef.current = observer;
    } else {
      setSearchBarHidden(false);
    }
  }, []);

  const rankingMap = new Map(rankings.map((r) => [r.show_id, r]));

  // Compute attention status per show
  const getAttentionNeeds = (show: Show) => {
    const needs: string[] = [];
    const ranking = rankingMap.get(show.id);
    if (!ranking || ranking.comparisons_count === 0) needs.push("unranked");
    if (!show.photo_url && !show.photo_declined) needs.push("no moment");
    if (!show.tags || show.tags.length === 0) needs.push("no highlights");
    return needs;
  };

  const getSortedShows = useCallback(() => {
    let filteredShows = shows;
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthNum = now.getMonth();

    if (topRatedFilter === "this-year") {
      filteredShows = shows.filter((show) => parseISO(show.date).getFullYear() === currentYear);
    } else if (topRatedFilter === "last-year") {
      filteredShows = shows.filter((show) => parseISO(show.date).getFullYear() === currentYear - 1);
    } else if (topRatedFilter === "this-month") {
      filteredShows = shows.filter((show) => {
        const showDate = parseISO(show.date);
        return showDate.getFullYear() === currentYear && showDate.getMonth() === currentMonthNum;
      });
    }

    if (showTypeFilter !== "all") {
      filteredShows = filteredShows.filter((show) => show.showType === showTypeFilter);
    }

    if (rankingsSearch.trim()) {
      const q = rankingsSearch.trim().toLowerCase();
      filteredShows = filteredShows.filter((show) => {
        const artistMatch = show.artists.some((a) => a.name.toLowerCase().includes(q));
        const venueMatch = show.venue.name.toLowerCase().includes(q);
        const locationMatch = show.venue.location?.toLowerCase().includes(q);
        return artistMatch || venueMatch || locationMatch;
      });
    }

    const rMap = new Map(rankings.map((r) => [r.show_id, { elo: r.elo_score, comparisons: r.comparisons_count }]));
    const sorted = [...filteredShows].sort((a, b) => {
      if (sortMode === "newest" || sortMode === "oldest") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      const eloA = rMap.get(a.id)?.elo || 1200;
      const eloB = rMap.get(b.id)?.elo || 1200;
      if (eloB !== eloA) return eloB - eloA;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    });

    if (sortMode === "worst" || sortMode === "oldest") {
      sorted.reverse();
    }

    return sorted;
  }, [shows, topRatedFilter, showTypeFilter, sortMode, rankings, rankingsSearch]);

  // Always compute attention shows from the FULL shows list
  const attentionShows = shows.filter((s) => getAttentionNeeds(s).length > 0);

  const sortedShows = attentionFilterActive ? attentionShows : getSortedShows();
  const filteredShowIds = sortedShows.map((s) => s.id);

  return (
    <>
      {statPills && (
        <div className="mb-4">
          <StatPills stats={statPills} isLoading={statsLoading} onPillTap={onPillTap} />
        </div>
      )}
      <div className="space-y-4">
        {/* Needs Attention strip */}
        {!loading && attentionShows.length > 0 && (
          <button
            onClick={() => {
              setAttentionFilterActive((prev) => !prev);
              setRankingsSearch("");
            }}
            className={cn(
              "w-full text-left rounded-2xl border px-4 py-3 transition-all duration-200",
              attentionFilterActive
                ? "bg-amber-500/[0.10] border-amber-500/30"
                : "bg-white/[0.03] border-white/[0.08] hover:bg-white/[0.06]"
            )}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0",
                    attentionFilterActive ? "bg-amber-500/20" : "bg-white/[0.06]"
                  )}
                >
                  <span className="text-sm">✦</span>
                </div>
                <div>
                  <p
                    className={cn(
                      "text-sm font-semibold leading-snug",
                      attentionFilterActive ? "text-amber-300" : "text-white/80"
                    )}
                  >
                    {attentionFilterActive
                      ? `Showing ${attentionShows.length} show${attentionShows.length === 1 ? "" : "s"} needing attention`
                      : `${attentionShows.length} show${attentionShows.length === 1 ? "" : "s"} need${attentionShows.length === 1 ? "s" : ""} attention`}
                  </p>
                  {!attentionFilterActive && (
                    <p className="text-[11px] text-white/35 mt-0.5">
                      {[
                        rankings.filter((r) => r.comparisons_count === 0).length > 0 &&
                          `${rankings.filter((r) => r.comparisons_count === 0).length} unranked`,
                        shows.filter((s) => !s.photo_url && !s.photo_declined).length > 0 &&
                          `${shows.filter((s) => !s.photo_url && !s.photo_declined).length} without a moment`,
                        shows.filter((s) => !s.tags || s.tags.length === 0).length > 0 &&
                          `${shows.filter((s) => !s.tags || s.tags.length === 0).length} without highlights`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  )}
                </div>
              </div>
              <span
                className={cn(
                  "text-xs font-semibold px-2.5 py-1 rounded-full transition-colors",
                  attentionFilterActive
                    ? "bg-amber-500/20 text-amber-300"
                    : "bg-white/[0.06] text-white/40"
                )}
              >
                {attentionFilterActive ? "Clear" : "Review"}
              </span>
            </div>
          </button>
        )}

        {/* Mini bar chart */}
        {!attentionFilterActive && (
          <ShowsBarChart shows={sortedShows} timeFilter={topRatedFilter} />
        )}

        {/* Search bar */}
        {!attentionFilterActive && (
          <div className="relative" ref={searchBarCallbackRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40" />
            <input
              type="text"
              placeholder="Search artist, venue, or city..."
              value={rankingsSearch}
              onChange={(e) => setRankingsSearch(e.target.value)}
              className="w-full h-10 pl-9 pr-9 rounded-lg text-sm bg-white/[0.05] border border-white/[0.08] text-foreground placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
            />
            {rankingsSearch && (
              <button
                onClick={() => setRankingsSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Filter bar */}
        <div className="flex items-center justify-between gap-4">
          <Select value={topRatedFilter} onValueChange={(v) => setTopRatedFilter(v as TimeFilter)}>
            <SelectTrigger className="w-[140px] bg-white/[0.05] border-white/[0.08] text-white/80">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all-time">All Time</SelectItem>
              <SelectItem value="this-year">This Year</SelectItem>
              <SelectItem value="last-year">Last Year</SelectItem>
              <SelectItem value="this-month">This Month</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              const cycle: SortMode[] = ["best", "worst", "newest", "oldest"];
              setSortMode((prev) => cycle[(cycle.indexOf(prev) + 1) % cycle.length]);
            }}
            className="flex items-center gap-2 bg-white/[0.05] border-white/[0.08] text-white/70 hover:bg-white/[0.08] hover:text-white"
          >
            <ArrowUpDown className="h-4 w-4" />
            <span>{{ best: "Best", worst: "Worst", newest: "Newest", oldest: "Oldest" }[sortMode]}</span>
          </Button>
        </div>

        {/* Show type filter pills */}
        {(() => {
          const typeCounts = {
            set: shows.filter((s) => s.showType === "set").length,
            show: shows.filter((s) => s.showType === "show").length,
            festival: shows.filter((s) => s.showType === "festival").length,
          };
          const hasMultipleTypes = [typeCounts.set > 0, typeCounts.show > 0, typeCounts.festival > 0].filter(Boolean).length > 1;
          if (!hasMultipleTypes) return null;
          const pills: { value: ShowTypeFilter; label: string; count: number }[] = [
            { value: "all", label: "All", count: shows.length },
            ...(typeCounts.set > 0 ? [{ value: "set" as const, label: "Sets", count: typeCounts.set }] : []),
            ...(typeCounts.show > 0 ? [{ value: "show" as const, label: "Shows", count: typeCounts.show }] : []),
            ...(typeCounts.festival > 0 ? [{ value: "festival" as const, label: "Festivals", count: typeCounts.festival }] : []),
          ];

          return (
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 scrollbar-none">
              {pills.map((pill) => (
                <button
                  key={pill.value}
                  onClick={() => setShowTypeFilter(pill.value)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border",
                    showTypeFilter === pill.value
                      ? "bg-primary/20 border-primary/40 text-primary"
                      : "bg-white/[0.04] border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/70"
                  )}
                >
                  {pill.label}
                  <span
                    className={cn(
                      "text-[10px] font-bold tabular-nums",
                      showTypeFilter === pill.value ? "text-primary/70" : "text-white/30"
                    )}
                  >
                    {pill.count}
                  </span>
                </button>
              ))}
            </div>
          );
        })()}

        {/* Show list */}
        {loading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <Skeleton key={i} className="h-24 w-full rounded-xl" />
            ))}
          </div>
        ) : sortedShows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="relative mb-4">
              <div className="absolute inset-0 bg-primary/20 rounded-full blur-2xl animate-pulse" />
              <div className="relative flex items-center justify-center">
                <span
                  className="text-4xl font-black tracking-[0.25em] select-none"
                  style={{ textShadow: "0 0 12px rgba(255,255,255,0.7), 0 0 30px rgba(255,255,255,0.4), 0 0 60px rgba(255,255,255,0.2)" }}
                >
                  ✦
                </span>
              </div>
            </div>
            <h3 className="text-lg font-semibold text-white/80 mb-1" style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}>
              {attentionFilterActive
                ? "Nothing needs attention right now"
                : rankingsSearch.trim()
                ? "No shows match your search"
                : "No shows match this filter"}
            </h3>
            <p className="text-sm text-white/50">
              {attentionFilterActive
                ? "All your shows are ranked and have moments."
                : rankingsSearch.trim()
                ? "Try a different artist, venue, or city"
                : "Try selecting a different time period"}
            </p>
            {attentionFilterActive && (
              <button
                onClick={() => setAttentionFilterActive(false)}
                className="mt-4 text-sm font-medium text-primary/80 hover:text-primary transition-colors underline underline-offset-2"
              >
                View all shows
              </button>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {sortedShows.map((show) => {
              const baseRankInfo = getShowRankInfo(show.id, filteredShowIds);
              const rankInfo =
                sortMode === "worst" && baseRankInfo.position
                  ? { ...baseRankInfo, position: baseRankInfo.total - baseRankInfo.position + 1 }
                  : baseRankInfo;
              const attentionNeeds = getAttentionNeeds(show);
              return (
                <SwipeableRankingCard key={show.id} onDelete={() => onDeleteShow(show)}>
                  <Card
                    className="border-white/[0.08] bg-white/[0.02] backdrop-blur-sm hover:bg-white/[0.05] transition-all duration-300 cursor-pointer relative overflow-hidden"
                    onClick={() => onShowTap(show)}
                  >
                    <CardContent className="p-4 relative">
                      <div className="flex gap-4 pr-2">
                        {/* Thumbnail - three-tier fallback */}
                        {(() => {
                          const headliner = show.artists?.find((a) => a.isHeadliner) || show.artists?.[0];
                          const displayImage = show.photo_url || headliner?.imageUrl;

                          if (displayImage) {
                            return (
                              <div
                                className="relative w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md border border-white/10 group cursor-pointer"
                                onClick={(e) => {
                                  if (!show.photo_url) {
                                    e.stopPropagation();
                                    onAddPhoto(show);
                                  }
                                }}
                              >
                                <img
                                  src={displayImage}
                                  alt="Show photo"
                                  className={cn("w-full h-full object-cover", !show.photo_url && "scale-110")}
                                />
                                {!show.photo_url && (
                                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Plus className="h-4 w-4 text-white/80" />
                                  </div>
                                )}
                              </div>
                            );
                          }

                          return (
                            <div
                              className="relative w-20 h-20 rounded-xl bg-white/[0.05] flex items-center justify-center flex-shrink-0 border border-white/[0.08] group cursor-pointer hover:bg-white/[0.08] transition-colors"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddPhoto(show);
                              }}
                            >
                              <span className="text-2xl text-white/40 select-none" style={{ textShadow: "0 0 8px rgba(255,255,255,0.3)" }}>
                                ✦
                              </span>
                              <div className="absolute bottom-1 right-1 h-5 w-5 rounded-full bg-primary/80 flex items-center justify-center shadow-lg opacity-70 group-hover:opacity-100 transition-opacity">
                                <Plus className="h-3 w-3 text-primary-foreground" />
                              </div>
                            </div>
                          );
                        })()}

                        <div className="min-w-0 flex-1 space-y-1">
                          {/* Artist name */}
                          <div className="font-bold text-base leading-tight truncate" style={{ textShadow: "0 0 12px rgba(255,255,255,0.3)" }}>
                            {show.artists.slice(0, 2).map((artist, idx) => (
                              <span key={idx}>
                                {artist.name}
                                {idx < Math.min(show.artists.length - 1, 1) && <span className="text-white/40"> • </span>}
                              </span>
                            ))}
                            {show.artists.length > 2 && <span className="text-white/40 font-normal"> +{show.artists.length - 2}</span>}
                          </div>
                          {/* Venue */}
                          <div className="text-sm text-white/60 truncate" style={{ textShadow: "0 0 8px rgba(255,255,255,0.15)" }}>
                            {show.venue.name}
                          </div>
                          {/* Date */}
                          <div className="text-sm text-white/60" style={{ textShadow: "0 0 8px rgba(255,255,255,0.15)" }}>
                            {format(parseISO(show.date), parseISO(show.date).getFullYear() === new Date().getFullYear() ? "MMM d" : "MMM yyyy")}
                          </div>

                          {/* Attention chips */}
                          {attentionNeeds.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {attentionNeeds.includes("unranked") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onRankShow();
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-500/[0.15] border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 hover:border-amber-400/50 transition-colors cursor-pointer"
                                >
                                  ↕ Rank it
                                </button>
                              )}
                              {attentionNeeds.includes("no moment") && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-sky-500/[0.12] border border-sky-500/25 text-sky-400/80 cursor-pointer hover:border-sky-400/40 hover:text-sky-300 transition-colors"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddPhoto(show);
                                  }}
                                >
                                  + Add moment
                                </span>
                              )}
                              {attentionNeeds.includes("no highlights") && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onAddTags(show.id);
                                  }}
                                  className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-500/[0.12] border border-violet-500/25 text-violet-300/80 hover:bg-violet-500/20 hover:border-violet-400/40 hover:text-violet-200 transition-colors cursor-pointer"
                                >
                                  ✦ Add highlights
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="absolute bottom-3 right-3">
                        <ShowRankBadge position={rankInfo.position} total={rankInfo.total} comparisonsCount={rankInfo.comparisonsCount} />
                      </div>
                    </CardContent>
                  </Card>
                </SwipeableRankingCard>
              );
            })}
          </div>
        )}
      </div>

      {/* Floating search button */}
      <AnimatePresence>
        {searchBarHidden && !attentionFilterActive && !floatingSearchOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            onClick={() => setFloatingSearchOpen(true)}
            className="fixed bottom-[8.5rem] right-[1.85rem] z-[51] w-10 h-10 rounded-full bg-white/[0.08] backdrop-blur-md border border-white/[0.16] flex items-center justify-center shadow-lg hover:bg-white/[0.14] hover:border-white/[0.22] transition-colors active:scale-95 py-0 px-0 my-[10px] mx-[5px]"
          >
            <Search className="h-5 w-5 text-foreground/80" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Floating search sheet */}
      <Sheet open={floatingSearchOpen} onOpenChange={setFloatingSearchOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl border-t border-white/[0.12] bg-background/95 backdrop-blur-xl px-4 pb-8 pt-4">
          <SheetHeader className="sr-only">
            <SheetTitle>Search Shows</SheetTitle>
          </SheetHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
            <input
              type="text"
              autoFocus
              placeholder="Search artist, venue, or city..."
              value={rankingsSearch}
              onChange={(e) => setRankingsSearch(e.target.value)}
              className="w-full h-11 pl-9 pr-9 rounded-xl text-sm bg-white/[0.05] border border-white/[0.08] text-foreground placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-200"
            />
            {rankingsSearch && (
              <button
                onClick={() => setRankingsSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-foreground/70 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {rankingsSearch.trim() && (
            <p className="text-xs text-muted-foreground/50 mt-2 text-center">Results are filtered in your list below</p>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
};

export default MyShowsView;
