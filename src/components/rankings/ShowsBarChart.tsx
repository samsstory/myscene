import { useMemo } from "react";
import { format, parseISO, eachMonthOfInterval, startOfYear, endOfYear, startOfMonth } from "date-fns";

interface ShowsBarChartProps {
  shows: { date: string }[];
  timeFilter: "all-time" | "this-year" | "last-year" | "this-month";
}

const ShowsBarChart = ({ shows, timeFilter }: ShowsBarChartProps) => {
  const monthData = useMemo(() => {
    if (timeFilter === "this-month") return null;

    // Count shows per month key
    const counts = new Map<string, number>();
    shows.forEach((s) => {
      const key = format(parseISO(s.date), "yyyy-MM");
      counts.set(key, (counts.get(key) || 0) + 1);
    });

    // Determine month range
    const now = new Date();
    let months: Date[];

    if (timeFilter === "this-year") {
      months = eachMonthOfInterval({ start: startOfYear(now), end: now });
    } else if (timeFilter === "last-year") {
      const lastYear = new Date(now.getFullYear() - 1, 0, 1);
      months = eachMonthOfInterval({ start: startOfYear(lastYear), end: endOfYear(lastYear) });
    } else {
      // all-time: first show month to now
      if (shows.length === 0) return null;
      const dates = shows.map((s) => parseISO(s.date)).sort((a, b) => a.getTime() - b.getTime());
      months = eachMonthOfInterval({ start: startOfMonth(dates[0]), end: now });
    }

    const data = months.map((m) => {
      const key = format(m, "yyyy-MM");
      return {
        key,
        label: format(m, "MMM"),
        count: counts.get(key) || 0,
      };
    });

    const maxCount = Math.max(...data.map((d) => d.count), 1);
    return { data, maxCount };
  }, [shows, timeFilter]);

  if (!monthData || monthData.data.length === 0) return null;

  const MAX_BAR_H = 64;

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 overflow-x-auto">
      <div className="flex items-end gap-1.5 min-w-min" style={{ height: MAX_BAR_H + 36 }}>
        {monthData.data.map((m) => {
          const barH = m.count === 0 ? 4 : Math.max(8, (m.count / monthData.maxCount) * MAX_BAR_H);
          return (
            <div key={m.key} className="flex flex-col items-center gap-1 min-w-[28px]">
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
          );
        })}
      </div>
    </div>
  );
};

export default ShowsBarChart;
