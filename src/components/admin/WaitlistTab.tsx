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

  const stats = [
    { icon: Users, label: "Total", value: entries.length },
    { icon: Clock, label: "Pending", value: pendingCount },
    { icon: CheckCircle, label: "Approved", value: approvedCount },
  ];

  const filters: { key: Filter; label: string; count: number }[] = [
    { key: "all", label: "All", count: entries.length },
    { key: "pending", label: "Pending", count: pendingCount },
    { key: "approved", label: "Approved", count: approvedCount },
  ];

  return (
    <div className="space-y-6">
      {/* Stats + Add */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-3 flex-wrap">
          {stats.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm px-4 py-2.5">
              <Icon className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{label}</span>
              <span className="text-sm font-semibold text-foreground">{value}</span>
            </div>
          ))}
        </div>
        <AddWaitlistDialog onAdded={fetchEntries} />
      </div>

      {/* Filter chips */}
      <div className="flex gap-2">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
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
            <Skeleton key={i} className="h-12 w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] backdrop-blur-sm overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.06] hover:bg-transparent">
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Email</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Source</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Discovery</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Shows/yr</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Status</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Notified</TableHead>
                <TableHead className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">Submitted</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((entry) => (
                <TableRow key={entry.id} className="border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                  <TableCell className="font-mono text-xs">
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
                          className="h-7 text-xs w-44 bg-white/[0.05] border-white/[0.10]"
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
                      <span className="text-foreground/80">{entry.email}</span>
                    ) : (
                      <button
                        className="flex items-center gap-1 text-muted-foreground/50 italic hover:text-muted-foreground transition-colors"
                        onClick={() => { setEditingEmailId(entry.id); setEditingEmailValue(""); }}
                      >
                        <Pencil className="h-3 w-3" />
                        <span>{entry.phone_number || "Add email"}</span>
                      </button>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{entry.source}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{entry.discovery_source || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{entry.shows_per_year || "—"}</TableCell>
                  <TableCell>
                    <Badge
                      variant="secondary"
                      className={entry.status === "approved"
                        ? "bg-primary/[0.10] text-primary/80 border-primary/[0.20] text-[10px]"
                        : "bg-white/[0.04] text-muted-foreground border-white/[0.06] text-[10px]"}
                    >
                      {entry.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {entry.notified_at ? (
                      <div className="flex items-center gap-1.5 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        <span className="text-xs">{format(new Date(entry.notified_at), "MMM d")}</span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground/40 text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(entry.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    {entry.status === "pending" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setApproveEntry(entry)}
                        disabled={!entry.email}
                        className="h-7 px-3 text-xs border border-white/[0.10] bg-white/[0.04] text-foreground hover:bg-white/[0.08] hover:border-white/[0.18] transition-all"
                      >
                        Approve
                      </Button>
                    ) : entry.status === "approved" ? (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => setResendEntry(entry)}
                        disabled={!entry.email}
                        className="h-7 px-3 text-xs border border-white/[0.06] bg-transparent text-muted-foreground hover:bg-white/[0.04] hover:text-foreground transition-all"
                      >
                        <Send className="h-3 w-3 mr-1.5" />
                        {entry.notified_at ? "Resend" : "Send"}
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground/50 py-12 text-sm">
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
