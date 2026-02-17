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
import { format } from "date-fns";
import { CheckCircle2, Loader2 } from "lucide-react";

interface BugReport {
  id: string;
  user_id: string;
  description: string;
  page_url: string | null;
  user_agent: string | null;
  device_info: any;
  status: string;
  created_at: string;
}

export function BugReportsTab() {
  const [reports, setReports] = useState<BugReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchReports = async () => {
    setLoading(true);
    const { data } = await (supabase.from("bug_reports" as any).select("*").order("created_at", { ascending: false }) as any);
    setReports((data as BugReport[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const markResolved = async (id: string) => {
    setUpdatingId(id);
    await (supabase.from("bug_reports" as any).update({ status: "resolved" } as any).eq("id", id) as any);
    setReports((prev) => prev.map((r) => (r.id === id ? { ...r, status: "resolved" } : r)));
    setUpdatingId(null);
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
    <div className="rounded-lg border border-border overflow-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>User</TableHead>
            <TableHead className="min-w-[240px]">Description</TableHead>
            <TableHead>Page</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {reports.map((r) => (
            <TableRow key={r.id}>
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {format(new Date(r.created_at), "MMM d, h:mm a")}
              </TableCell>
              <TableCell className="text-xs font-mono truncate max-w-[120px]">
                {r.user_id.slice(0, 8)}…
              </TableCell>
              <TableCell className="text-sm">{r.description}</TableCell>
              <TableCell className="text-xs text-muted-foreground">{r.page_url ?? "—"}</TableCell>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
