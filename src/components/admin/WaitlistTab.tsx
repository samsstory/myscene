import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApproveModal } from "./ApproveModal";
import { format } from "date-fns";
import { CheckCircle, Clock, Users, Mail } from "lucide-react";

interface WaitlistEntry {
  id: string;
  phone_number: string;
  country_code: string;
  source: string;
  discovery_source: string | null;
  shows_per_year: string | null;
  status: string;
  created_at: string;
  notified_at: string | null;
}

type Filter = "all" | "pending" | "approved";

export function WaitlistTab() {
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [approveEntry, setApproveEntry] = useState<WaitlistEntry | null>(null);

  const fetchEntries = async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch(
      `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-waitlist`,
      {
        headers: {
          Authorization: `Bearer ${session?.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
      }
    );
    const result = await res.json();
    setEntries(result.waitlist || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchEntries();
  }, []);

  const filtered = entries.filter((e) => {
    if (filter === "all") return true;
    return e.status === filter;
  });

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const approvedCount = entries.filter((e) => e.status === "approved").length;

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: entries.length },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "approved", label: "Approved", count: approvedCount },
  ];

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="flex gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
          <Users className="h-4 w-4 text-primary" />
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-semibold">{entries.length}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
          <Clock className="h-4 w-4 text-secondary" />
          <span className="text-sm text-muted-foreground">Pending</span>
          <span className="font-semibold">{pendingCount}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2">
          <CheckCircle className="h-4 w-4 text-green-400" />
          <span className="text-sm text-muted-foreground">Approved</span>
          <span className="font-semibold">{approvedCount}</span>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full px-3 py-1 text-sm font-medium transition-colors ${
              filter === f.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <div className="rounded-lg border border-border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Phone</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Source</TableHead>
                <TableHead>Discovery</TableHead>
                <TableHead>Shows/Year</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notified</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={entry.id}>
                  <TableCell className="font-mono text-sm">{entry.phone_number}</TableCell>
                  <TableCell>{entry.country_code}</TableCell>
                  <TableCell>{entry.source}</TableCell>
                  <TableCell>{entry.discovery_source || "—"}</TableCell>
                  <TableCell>{entry.shows_per_year || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={entry.status === "approved" ? "default" : "secondary"}
                      className={entry.status === "approved" ? "bg-green-600/20 text-green-400 border-green-600/30" : ""}
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entry.notified_at ? (
                      <div className="flex items-center gap-1.5 text-green-400">
                        <Mail className="h-3.5 w-3.5" />
                        <span className="text-xs text-muted-foreground">
                          {format(new Date(entry.notified_at), "MMM d")}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(entry.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {entry.status === "pending" && (
                      <Button size="sm" onClick={() => setApproveEntry(entry)}>
                        Approve
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                    No entries found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      <ApproveModal
        open={!!approveEntry}
        onOpenChange={(open) => !open && setApproveEntry(null)}
        waitlistEntry={approveEntry}
        onApproved={fetchEntries}
      />
    </div>
  );
}
