import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ApproveModal } from "./ApproveModal";
import { ResendDialog } from "./ResendDialog";

import { AddWaitlistDialog } from "./AddWaitlistDialog";
import { format } from "date-fns";
import { CheckCircle, Clock, Users, Mail, Send, Pencil, Check, X } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface WaitlistEntry {
  id: string;
  email: string | null;
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
  const [resendEntry, setResendEntry] = useState<WaitlistEntry | null>(null);
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);
  const [editingEmailValue, setEditingEmailValue] = useState("");
  const [savingEmail, setSavingEmail] = useState(false);

  const handleSaveEmail = async (entryId: string) => {
    if (!editingEmailValue.trim()) return;
    setSavingEmail(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/update-waitlist`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
          body: JSON.stringify({ waitlistId: entryId, email: editingEmailValue.trim() }),
        }
      );
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || "Failed to update");
      toast({ title: "Email saved" });
      setEditingEmailId(null);
      fetchEntries();
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      setSavingEmail(false);
    }
  };

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

      {/* Stats + Add */}
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-4 py-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Total</span>
          <span className="font-semibold">{entries.length}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-4 py-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Pending</span>
          <span className="font-semibold">{pendingCount}</span>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white/[0.04] border border-white/[0.06] px-4 py-2">
          <CheckCircle className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">Approved</span>
          <span className="font-semibold">{approvedCount}</span>
        </div>
        </div>
        <AddWaitlistDialog onAdded={fetchEntries} />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3 py-1 text-sm font-medium transition-all ${
              filter === f.key
                ? "bg-primary/[0.10] border-primary/[0.25] text-primary/80"
                : "bg-transparent border-white/[0.06] text-muted-foreground hover:bg-white/[0.04] hover:text-foreground"
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
                <TableHead>Email</TableHead>
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
                  <TableCell className="font-mono text-sm">
                    {editingEmailId === entry.id ? (
                      <div className="flex items-center gap-1">
                        <Input
                          type="email"
                          value={editingEmailValue}
                          onChange={(e) => setEditingEmailValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveEmail(entry.id);
                            if (e.key === "Escape") setEditingEmailId(null);
                          }}
                          className="h-7 text-xs w-44"
                          placeholder="email@example.com"
                          autoFocus
                          disabled={savingEmail}
                        />
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => handleSaveEmail(entry.id)} disabled={savingEmail}>
                          <Check className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingEmailId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ) : entry.email ? (
                      <span>{entry.email}</span>
                    ) : (
                      <button
                        className="flex items-center gap-1 text-muted-foreground italic hover:text-foreground transition-colors"
                        onClick={() => { setEditingEmailId(entry.id); setEditingEmailValue(""); }}
                      >
                        <Pencil className="h-3 w-3" />
                        <span>{entry.phone_number || "Add email"}</span>
                      </button>
                    )}
                  </TableCell>
                  <TableCell>{entry.source}</TableCell>
                  <TableCell>{entry.discovery_source || "—"}</TableCell>
                  <TableCell>{entry.shows_per_year || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant={entry.status === "approved" ? "default" : "secondary"}
                      className={entry.status === "approved" ? "bg-white/[0.08] text-foreground border-white/[0.12]" : "bg-white/[0.04] text-muted-foreground border-white/[0.06]"}
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entry.notified_at ? (
                      <div className="flex items-center gap-1.5 text-foreground/60">
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
                    {entry.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setApproveEntry(entry)}
                        disabled={!entry.email}
                        className="border border-white/[0.12] bg-white/[0.06] text-foreground hover:bg-white/[0.10] hover:border-white/[0.20] transition-all"
                      >
                        Approve
                      </Button>
                    ) : entry.status === "approved" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setResendEntry(entry)}
                        disabled={!entry.email}
                        className="border border-white/[0.08] bg-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-all"
                      >
                        <Send className="h-3.5 w-3.5 mr-1.5" />
                        {entry.notified_at ? "Resend" : "Send Email"}
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
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

      <ResendDialog
        open={!!resendEntry}
        onOpenChange={(open) => !open && setResendEntry(null)}
        waitlistEntry={resendEntry}
        onSent={fetchEntries}
      />
    </div>
  );
}
