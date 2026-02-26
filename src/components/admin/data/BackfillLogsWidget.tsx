import React, { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { RefreshCw, CheckCircle, AlertCircle, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface BackfillLog {
  id: string;
  run_at: string;
  requested: number;
  enriched: number;
  source: string;
  details: Record<string, unknown>;
}

const BackfillLogsWidget = React.memo(function BackfillLogsWidget() {
  const { data: logs, isLoading, refetch } = useQuery({
    queryKey: ["backfill-logs"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("backfill_logs")
        .select("id, run_at, requested, enriched, source, details")
        .order("run_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data || []) as BackfillLog[];
    },
    staleTime: 60_000,
  });

  const { data: nullCount } = useQuery({
    queryKey: ["artists-null-image-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("artists")
        .select("id", { count: "exact", head: true })
        .is("image_url", null);
      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 60_000,
  });

  const totalEnriched = useMemo(
    () => (logs || []).reduce((sum, l) => sum + l.enriched, 0),
    [logs]
  );

  const triggerBackfill = async () => {
    try {
      await supabase.functions.invoke("backfill-artist-images", {
        body: {},
      });
      refetch();
    } catch {
      // silent
    }
  };

  return (
    <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-cyan-400" strokeWidth={1.5} />
          <h3 className="text-sm font-semibold tracking-tight text-foreground">
            Artist Image Backfill
          </h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={triggerBackfill}
          className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
        >
          <RefreshCw className="h-3 w-3 mr-1" strokeWidth={1.5} />
          Run now
        </Button>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-lg font-bold text-foreground">{nullCount ?? "—"}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Missing images
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-lg font-bold text-foreground">{totalEnriched}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Total enriched
          </p>
        </div>
        <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-3 text-center">
          <p className="text-lg font-bold text-foreground">{logs?.length ?? 0}</p>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">
            Runs logged
          </p>
        </div>
      </div>

      {/* Run history */}
      {isLoading ? (
        <p className="text-xs text-muted-foreground">Loading…</p>
      ) : !logs || logs.length === 0 ? (
        <p className="text-xs text-muted-foreground">No backfill runs yet.</p>
      ) : (
        <div className="space-y-1.5 max-h-60 overflow-y-auto">
          {logs.map((log) => {
            const hasError = !!(log.details as Record<string, unknown>)?.error;
            return (
              <div
                key={log.id}
                className="flex items-center justify-between rounded-lg bg-white/[0.02] border border-white/[0.04] px-3 py-2"
              >
                <div className="flex items-center gap-2">
                  {hasError ? (
                    <AlertCircle className="h-3.5 w-3.5 text-destructive" strokeWidth={1.5} />
                  ) : (
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-400" strokeWidth={1.5} />
                  )}
                  <span className="text-xs text-foreground">
                    {log.enriched}/{log.requested} enriched
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {format(new Date(log.run_at), "MMM d, h:mm a")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
});

export default BackfillLogsWidget;
