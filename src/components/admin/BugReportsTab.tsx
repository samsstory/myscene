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
import { CheckCircle2, Loader2, Image, X, ChevronDown, Copy, Check } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

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
    // Include any other keys
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
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (reports.length === 0) {
    return <p className="py-12 text-center text-muted-foreground">No bug reports yet.</p>;
  }

  return (
    <>
      <div className="rounded-lg border border-border overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>User</TableHead>
              <TableHead className="min-w-[240px]">Description</TableHead>
              <TableHead>Page</TableHead>
              <TableHead>Screenshot</TableHead>
              <TableHead>Status</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((r) => {
              const screenshotUrl = getScreenshotUrl(r);
              const hasErrorContext = r.error_context && Object.keys(r.error_context).some(k => k !== "screenshot_url");
              const isExpanded = expandedIds.has(r.id);
              return (
                <React.Fragment key={r.id}>
                  <TableRow className={isExpanded ? "border-b-0" : ""}>
                    <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                      {format(new Date(r.created_at), "MMM d, h:mm a")}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">
                        {r.type || "manual"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs font-mono truncate max-w-[120px]">
                      {r.user_id.slice(0, 8)}…
                    </TableCell>
                    <TableCell className="text-sm">{r.description}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.page_url ?? "—"}</TableCell>
                    <TableCell>
                      {screenshotUrl ? (
                        <button
                          onClick={() => setLightboxUrl(screenshotUrl)}
                          className="group relative h-10 w-16 rounded border border-border overflow-hidden hover:border-primary/50 transition-colors"
                        >
                          <img
                            src={screenshotUrl}
                            alt="Bug screenshot"
                            className="h-full w-full object-cover object-top"
                          />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <Image className="h-3 w-3 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </button>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant={r.status === "resolved" ? "secondary" : "destructive"} className="text-[10px]">
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
                            className="gap-1 text-xs px-2"
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
                            className="gap-1 text-xs"
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
                        <div className="bg-muted/30 border-t border-border px-4 py-3">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-medium text-muted-foreground">Error Context</span>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyErrorContext(r)}
                              className="gap-1 text-xs h-7 px-2"
                            >
                              {copiedId === r.id ? (
                                <><Check className="h-3 w-3" /> Copied</>
                              ) : (
                                <><Copy className="h-3 w-3" /> Copy for debugging</>
                              )}
                            </Button>
                          </div>
                          <pre className="text-xs text-foreground/80 whitespace-pre-wrap font-mono bg-background/50 rounded-md border border-border p-3 max-h-64 overflow-auto">
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
        <DialogContent className="max-w-3xl p-2 bg-card border-border">
          {lightboxUrl && (
            <img
              src={lightboxUrl}
              alt="Bug screenshot full view"
              className="w-full h-auto rounded"
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
