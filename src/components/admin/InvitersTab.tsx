import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Trophy, Users2 } from "lucide-react";

interface InviterRow {
  referrer_id: string;
  invite_count: number;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
}

const medalColor = (rank: number) => {
  if (rank === 1) return "text-yellow-400";
  if (rank === 2) return "text-slate-300";
  if (rank === 3) return "text-amber-600";
  return "text-muted-foreground/50";
};

export function InvitersTab() {
  const [rows, setRows] = useState<InviterRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalInviters, setTotalInviters] = useState(0);
  const [totalRecruits, setTotalRecruits] = useState(0);

  useEffect(() => {
    const load = async () => {
      // Aggregate referrals by referrer, then join profile data
      const { data: refs } = await supabase
        .from("referrals")
        .select("referrer_id")
        .not("referrer_id", "is", null);

      if (!refs) { setLoading(false); return; }

      // Count per referrer
      const countMap: Record<string, number> = {};
      for (const r of refs) {
        if (r.referrer_id) countMap[r.referrer_id] = (countMap[r.referrer_id] ?? 0) + 1;
      }

      const sortedIds = Object.entries(countMap)
        .sort((a, b) => b[1] - a[1])
        .map(([id]) => id);

      setTotalInviters(sortedIds.length);
      setTotalRecruits(refs.length);

      if (sortedIds.length === 0) { setLoading(false); return; }

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, username, full_name, avatar_url")
        .in("id", sortedIds);

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

      setRows(
        sortedIds.map((id) => ({
          referrer_id: id,
          invite_count: countMap[id],
          username: profileMap[id]?.username ?? null,
          full_name: profileMap[id]?.full_name ?? null,
          avatar_url: profileMap[id]?.avatar_url ?? null,
        }))
      );
      setLoading(false);
    };
    load();
  }, []);

  return (
    <div className="space-y-6">
      {/* Stat pills */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm px-4 py-2.5">
          <Users2 className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Total Inviters</span>
          <span className="text-sm font-semibold text-foreground">{totalInviters}</span>
        </div>
        <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm px-4 py-2.5">
          <Trophy className="h-3.5 w-3.5 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Total Recruits</span>
          <span className="text-sm font-semibold text-foreground">{totalRecruits}</span>
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(6)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                {["Rank", "User", "Username", "Recruits"].map((h) => (
                  <TableHead key={h} className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row, i) => {
                const rank = i + 1;
                const initials = (row.username ?? row.full_name ?? "?")[0].toUpperCase();
                return (
                  <TableRow key={row.referrer_id} className="border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                    {/* Rank */}
                    <TableCell className="w-14">
                      <span className={`text-sm font-black ${medalColor(rank)}`}>
                        {rank <= 3 ? (
                          <span style={{ filter: rank === 1 ? "drop-shadow(0 0 6px #facc15)" : undefined }}>
                            #{rank}
                          </span>
                        ) : `#${rank}`}
                      </span>
                    </TableCell>

                    {/* Avatar + name */}
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full overflow-hidden bg-primary/[0.10] border border-primary/[0.18] flex items-center justify-center flex-shrink-0">
                          {row.avatar_url ? (
                            <img src={row.avatar_url} alt={initials} className="w-full h-full object-cover" />
                          ) : (
                            <span className="text-[10px] font-bold text-primary/70">{initials}</span>
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground/90">
                          {row.full_name ?? row.username ?? "Unknown"}
                        </span>
                      </div>
                    </TableCell>

                    {/* Username */}
                    <TableCell className="text-xs text-muted-foreground">
                      {row.username ? `@${row.username}` : "—"}
                    </TableCell>

                    {/* Count */}
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-sm font-bold ${rank <= 3 ? medalColor(rank) : "text-foreground/80"}`}>
                          {row.invite_count}
                        </span>
                        <span className="text-xs text-muted-foreground/50">
                          {row.invite_count === 1 ? "recruit" : "recruits"}
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground/50 py-12 text-sm">
                    No referrals yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
