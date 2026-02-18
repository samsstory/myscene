import React, { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { CheckCircle2, Loader2, Image, ChevronDown, Copy, Check } from "lucide-react";

interface BugReport {
  id: string;
  user_id: string;
  description: string;
  page_url: string | null;
  user_agent: string | null;
  device_info: any;
  status: string;
  created_at: string;
  type?: string;
  error_context?: any;
}

export function BugReportsTab({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await (supabase.from("bug_reports" as any).select("*").order("created_at", { ascending: false }) as any);
    setReports((data as BugReport[] | null) ?? []);
    const newCount = ((data as BugReport[] | null) ?? []).filter(r => r.status === "new").length;
    onCountChange?.(newCount);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const markResolved = async (id: string) => {
    setUpdatingId(id);
    await (supabase.from("bug_reports" as any).update({ status: "resolved" } as any).eq("id", id) as any);
    setReports((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, status: "resolved" } : r));
      onCountChange?.(updated.filter(r => r.status === "new").length);
      return updated;
    });
    setUpdatingId(null);
  };

  const getScreenshotUrl = (report: BugReport): string | null => {
    return report.error_context?.screenshot_url || null;
  };

  const toggleExpanded = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const formatErrorContext = (report: BugReport): string => {
    if (!report.error_context) return "No error context available.";
    const ctx = { ...report.error_context };
    delete ctx.screenshot_url;
    if (Object.keys(ctx).length === 0) return "No error context available.";
    const lines: string[] = [
      `Bug Report: ${report.description}`,
      `Page: ${report.page_url ?? "unknown"}`,
      `Type: ${report.type || "manual"}`,
      `Date: ${format(new Date(report.created_at), "MMM d yyyy, h:mm a")}`,
      "",
    ];
    if (ctx.message) lines.push(`Error: ${ctx.message}`);
    if (ctx.stack) lines.push(`\nStack trace:\n${ctx.stack}`);
    if (ctx.componentStack) lines.push(`\nComponent stack:\n${ctx.componentStack}`);
    if (ctx.endpoint) lines.push(`\nEndpoint: ${ctx.endpoint}`);
    if (ctx.duration_ms) lines.push(`Duration: ${ctx.duration_ms}ms`);
    const knownKeys = new Set(["message", "stack", "componentStack", "endpoint", "duration_ms"]);
    for (const [k, v] of Object.entries(ctx)) {
      if (!knownKeys.has(k)) lines.push(`${k}: ${typeof v === "object" ? JSON.stringify(v, null, 2) : v}`);
    }
    return lines.join("\n");
  };

  const copyErrorContext = async (report: BugReport) => {
    const text = formatErrorContext(report);
    await navigator.clipboard.writeText(text);
    setCopiedId(report.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (reports.length === 0) {
    return <p className="py-16 text-center text-muted-foreground/50 text-sm">No bug reports yet.</p>;
  }

  return (
    <>
      <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm overflow-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-white/[0.06] hover:bg-transparent">
              {["Date", "Type", "User", "Description", "Page", "Screenshot", "Status", ""].map((h) => (
                <TableHead key={h} className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">
                  {h === "Description" ? <span className="min-w-[240px] inline-block">{h}</span> : h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r) => {
              const screenshotUrl = getScreenshotUrl(r);
              const hasErrorContext = r.error_context && Object.keys(r.error_context).some(k => k !== "screenshot_url");
              const isExpanded = expandedIds.has(r.id);
              return (
                <React.Fragment key={r.id}>
                  <TableRow className={`border-white/[0.05] hover:bg-white/[0.02] transition-colors ${isExpanded ? "border-b-0" : ""}`}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize border-white/[0.08] text-muted-foreground bg-white/[0.03]">
                        {r.type || "manual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground/60 truncate max-w-[100px]">
                      {r.user_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="text-sm text-foreground/80">{r.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground/60">{r.page_url ?? "—"}</TableCell>
                    <TableCell>
                      {screenshotUrl ? (
                        <button
                          onClick={() => setLightboxUrl(screenshotUrl)}
                          className="group relative h-9 w-14 rounded-lg border border-white/[0.08] overflow-hidden hover:border-primary/40 transition-colors"
                        >
                          <img src={screenshotUrl} alt="screenshot" className="h-full w-full object-cover object-top" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                            <Image className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground/40">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="secondary"
                        className={r.status === "resolved"
                          ? "text-[10px] bg-white/[0.04] text-muted-foreground/60 border-white/[0.06]"
                          : "text-[10px] bg-destructive/[0.12] text-destructive/80 border-destructive/[0.20]"}
                      >
                        {r.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {hasErrorContext && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleExpanded(r.id)}
                            className="gap-1 text-xs px-2 h-7 text-muted-foreground hover:text-foreground border border-white/[0.06] bg-white/[0.02]"
                          >
                            <ChevronDown className={`h-3 w-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            Details
                          </Button>
                        )}
                        {r.status !== "resolved" && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => markResolved(r.id)}
                            disabled={updatingId === r.id}
                            className="gap-1 text-xs h-7 px-2 text-muted-foreground hover:text-foreground border border-white/[0.06] bg-white/[0.02]"
                          >
                            {updatingId === r.id ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <CheckCircle2 className="h-3 w-3" />
                            )}
                            Resolve
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  {isExpanded && hasErrorContext && (
                    <TableRow>
                      <TableCell colSpan={8} className="p-0">
                        <div className="bg-white/[0.02] border-t border-white/[0.05] px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/50 font-medium">Error Context</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => copyErrorContext(r)}
                              className="gap-1 text-xs h-7 px-2 border border-white/[0.08] bg-white/[0.03] text-muted-foreground hover:text-foreground"
                            >
                              {copiedId === r.id ? (
                                <><Check className="h-3 w-3" /> Copied</>
                              ) : (
                                <><Copy className="h-3 w-3" /> Copy</>
                              )}
                            </Button>
                          </div>
                          <pre className="text-xs text-foreground/70 whitespace-pre-wrap font-mono bg-black/20 rounded-lg border border-white/[0.06] p-3 max-h-64 overflow-auto">
                            {formatErrorContext(r)}
                          </pre>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </React.Fragment>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {/* Screenshot lightbox */}
      <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
        <DialogContent className="max-w-3xl p-2 bg-card/95 backdrop-blur-xl border-white/[0.08]">
          {lightboxUrl && (
            <img src={lightboxUrl} alt="Bug screenshot full view" className="w-full h-auto rounded-lg" />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
