import { useMemo, useRef, useState, useEffect, useCallback } from "react";
import { format, parseISO, eachMonthOfInterval, startOfYear, endOfYear, startOfMonth } from "date-fns";

interface ShowsBarChartProps {
  shows: { date: string }[];
  timeFilter: "all-time" | "this-year" | "last-year" | "this-month";
}

const ShowsBarChart = ({ shows, timeFilter }: ShowsBarChartProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [visibleYear, setVisibleYear] = useState<string>("");

  const monthData = useMemo(() => {
    if (timeFilter === "this-month") return null;

    const counts = new Map<string, number>();
    shows.forEach((s) => {
      const key = format(parseISO(s.date), "yyyy-MM");
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    const now = new Date();
    let months: Date[];

    if (timeFilter === "this-year") {
      months = eachMonthOfInterval({ start: startOfYear(now), end: now });
    } else if (timeFilter === "last-year") {
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      months = eachMonthOfInterval({ start: startOfYear(lastYear), end: endOfYear(lastYear) });
    } else {
      if (shows.length === 0) return null;
      const dates = shows.map((s) => parseISO(s.date)).sort((a, b) => a.getTime() - b.getTime());
      months = eachMonthOfInterval({ start: startOfMonth(dates[0]), end: now });
    }

    const data = months.map((m) => {
      const key = format(m, "yyyy-MM");
      return {
        key,
        label: format(m, "MMM"),
        year: format(m, "yyyy"),
        count: counts.get(key) || 0,
      };
    });

    

    const maxCount = Math.max(...data.map((d) => d.count), 1);
    return { data, maxCount };
  }, [shows, timeFilter]);

  const updateVisibleYear = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !monthData) return;

    // Find the bar element closest to the left edge of the visible area
    const bars = container.querySelectorAll<HTMLElement>("[data-year]");
    const containerLeft = container.getBoundingClientRect().left;
    let closestYear = monthData.data[0]?.year || "";

    for (const bar of bars) {
      const rect = bar.getBoundingClientRect();
      // First bar whose right edge is past the container's left edge
      if (rect.right > containerLeft + 8) {
        closestYear = bar.dataset.year || closestYear;
        break;
      }
    }

    setVisibleYear(closestYear);
  }, [monthData]);

  useEffect(() => {
    if (!monthData) return;
    setVisibleYear(monthData.data[0]?.year || "");
    // Auto-scroll to the right (newest months)
    const container = scrollRef.current;
    if (container) {
      requestAnimationFrame(() => {
        container.scrollLeft = container.scrollWidth;
      });
    }
  }, [monthData]);

  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;
    container.addEventListener("scroll", updateVisibleYear, { passive: true });
    return () => container.removeEventListener("scroll", updateVisibleYear);
  }, [updateVisibleYear]);

  if (!monthData || monthData.data.length === 0) return null;

  const MAX_BAR_H = 64;
  const years = new Set(monthData.data.map((m) => m.year));
  const multiYear = years.size > 1;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 relative">
      {/* Sticky year label */}
      {multiYear && visibleYear && (
        <span className="absolute top-2.5 left-3 text-[11px] font-semibold text-white/50 tabular-nums z-10 pointer-events-none">
          {visibleYear}
        </span>
      )}

      <div
        ref={scrollRef}
        className="overflow-x-auto"
        style={{ paddingTop: multiYear ? 16 : 0 }}
      >
        <div className="flex items-end gap-1.5 min-w-min" style={{ height: MAX_BAR_H + 36 }}>
          {monthData.data.map((m, i) => {
            const barH = m.count === 0 ? 4 : Math.max(8, (m.count / monthData.maxCount) * MAX_BAR_H);
            // Show a thin separator at year boundaries
            const yearBoundary = multiYear && i > 0 && monthData.data[i - 1].year !== m.year;
            return (
              <div key={m.key} className="flex items-end" data-year={m.year}>
                {yearBoundary && (
                  <div className="w-px h-10 bg-white/[0.08] mx-1 self-center" />
                )}
                <div className="flex flex-col items-center gap-1 min-w-[28px]">
                  <span className="text-[10px] text-muted-foreground tabular-nums leading-none">
                    {m.count > 0 ? m.count : ""}
                  </span>
                  <div
                    className="w-3 rounded-full bg-primary transition-all duration-300"
                    style={{
                      height: barH,
                      opacity: m.count === 0 ? 0.2 : 0.4 + (m.count / monthData.maxCount) * 0.6,
                    }}
                  />
                  <span className="text-[10px] text-muted-foreground leading-none">{m.label}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default ShowsBarChart;
