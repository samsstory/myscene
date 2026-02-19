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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";

interface FeatureRequest {
  id: string;
  user_id: string;
  description: string;
  page_url: string | null;
  status: string;
  created_at: string;
}

const STATUS_OPTIONS = [
  { value: "new", label: "New" },
  { value: "under_consideration", label: "Under Consideration" },
  { value: "planned", label: "Planned" },
  { value: "shipped", label: "Shipped" },
];

const statusStyles: Record<string, string> = {
  new: "bg-destructive/[0.12] text-destructive/80 border-destructive/[0.20]",
  under_consideration: "bg-yellow-500/[0.12] text-yellow-400/80 border-yellow-500/[0.20]",
  planned: "bg-primary/[0.12] text-primary/80 border-primary/[0.20]",
  shipped: "bg-emerald-500/[0.12] text-emerald-400/80 border-emerald-500/[0.20]",
};

export function FeatureRequestsTab({ onCountChange }: { onCountChange?: (count: number) => void }) {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchRequests = async () => {
    setLoading(true);
    const { data } = await (supabase as any)
      .from("feature_requests")
      .select("*")
      .order("created_at", { ascending: false });
    const rows = (data as FeatureRequest[] | null) ?? [];
    setRequests(rows);
    onCountChange?.(rows.filter((r) => r.status === "new").length);
    setLoading(false);
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    setUpdatingId(id);
    await (supabase as any).from("feature_requests").update({ status }).eq("id", id);
    setRequests((prev) => {
      const updated = prev.map((r) => (r.id === id ? { ...r, status } : r));
      onCountChange?.(updated.filter((r) => r.status === "new").length);
      return updated;
    });
    setUpdatingId(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground/40" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <p className="py-16 text-center text-muted-foreground/50 text-sm">
        No feature requests yet.
      </p>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm overflow-auto">
      <Table>
        <TableHeader>
          <TableRow className="border-white/[0.06] hover:bg-transparent">
            {["Date", "User", "Description", "Page", "Status", ""].map((h) => (
              <TableHead
                key={h}
                className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium"
              >
                {h === "Description" ? (
                  <span className="min-w-[280px] inline-block">{h}</span>
                ) : (
                  h
                )}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.map((r) => (
            <TableRow
              key={r.id}
              className="border-white/[0.05] hover:bg-white/[0.02] transition-colors"
            >
              <TableCell className="whitespace-nowrap text-xs text-muted-foreground">
                {format(new Date(r.created_at), "MMM d, h:mm a")}
              </TableCell>
              <TableCell className="text-xs font-mono text-muted-foreground/60 truncate max-w-[100px]">
                {r.user_id.slice(0, 8)}…
              </TableCell>
              <TableCell className="text-sm text-foreground/80 max-w-[340px]">
                {r.description}
              </TableCell>
              <TableCell className="text-xs text-muted-foreground/60">
                {r.page_url ?? "—"}
              </TableCell>
              <TableCell>
                <Badge
                  variant="secondary"
                  className={`text-[10px] capitalize ${statusStyles[r.status] ?? statusStyles.new}`}
                >
                  {STATUS_OPTIONS.find((o) => o.value === r.status)?.label ?? r.status}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  {updatingId === r.id ? (
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground/40" />
                  ) : (
                    <Select
                      value={r.status}
                      onValueChange={(val) => updateStatus(r.id, val)}
                    >
                      <SelectTrigger className="h-7 text-xs border-white/[0.08] bg-white/[0.02] w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
