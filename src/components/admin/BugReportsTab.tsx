import { useEffect, useState } from "react";
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
import { CheckCircle2, Loader2, Image, X } from "lucide-react";

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
              return (
                <TableRow key={r.id}>
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
                  </TableCell>
                </TableRow>
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
