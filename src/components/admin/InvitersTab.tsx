import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Loader2, Mail, MessageSquare, Send, Trophy, Users2 } from "lucide-react";
import { toast } from "sonner";

interface InviterRow {
  referrer_id: string;
  invite_count: number;
  username: string | null;
  full_name: string | null;
  avatar_url: string | null;
  email: string | null;
  phone_number: string | null;
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

  // Message dialog
  const [msgTarget, setMsgTarget] = useState<InviterRow | null>(null);
  const [msgTab, setMsgTab] = useState<"push" | "email" | "sms">("push");
  const [pushTitle, setPushTitle] = useState("Thanks for spreading the word 🎶");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/");
  const [emailSubject, setEmailSubject] = useState("You're one of our top recruiters 🎉");
  const [emailBody, setEmailBody] = useState("");
  const [smsBody, setSmsBody] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: refs } = await supabase
        .from("referrals")
        .select("referrer_id")
        .not("referrer_id", "is", null);

      if (!refs) { setLoading(false); return; }

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
        .select("id, username, full_name, avatar_url, phone_number")
        .in("id", sortedIds);

      // Fetch emails via admin edge function
      const { data: { session } } = await supabase.auth.getSession();
      let emailMap: Record<string, string> = {};
      try {
        const res = await globalThis.fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-users`,
          { headers: { Authorization: `Bearer ${session?.access_token}`, apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
        );
        const result = await res.json();
        for (const u of result.users ?? []) {
          emailMap[u.id] = u.email;
        }
      } catch { /* emails optional */ }

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

      setRows(
        sortedIds.map((id) => ({
          referrer_id: id,
          invite_count: countMap[id],
          username: profileMap[id]?.username ?? null,
          full_name: profileMap[id]?.full_name ?? null,
          avatar_url: profileMap[id]?.avatar_url ?? null,
          email: emailMap[id] ?? null,
          phone_number: profileMap[id]?.phone_number ?? null,
        }))
      );
      setLoading(false);
    };
    load();
  }, []);

  const openMsg = (row: InviterRow) => {
    setMsgTarget(row);
    setMsgTab("push");
    setPushBody("");
    setEmailBody("");
    setSmsBody("");
  };

  const handleSend = async () => {
    if (!msgTarget) return;
    setSending(true);
    try {
      if (msgTab === "push") {
        if (!pushTitle || !pushBody) { toast.error("Title and message required"); return; }
        const { data, error } = await supabase.functions.invoke("send-push-notification", {
          body: { user_id: msgTarget.referrer_id, title: pushTitle, body: pushBody, url: pushUrl || "/" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success(`Push sent to ${data.sent}/${data.total} device(s)`);
      } else if (msgTab === "email") {
        if (!emailSubject || !emailBody) { toast.error("Subject and body required"); return; }
        if (!msgTarget.email) { toast.error("No email address for this user"); return; }
        const { error } = await supabase.functions.invoke("resend-notification", {
          body: { to: msgTarget.email, subject: emailSubject, body: emailBody },
        });
        if (error) throw error;
        toast.success("Email sent!");
      } else if (msgTab === "sms") {
        if (!smsBody) { toast.error("Message required"); return; }
        if (!msgTarget.phone_number) { toast.error("No phone number for this user"); return; }
        toast.info("SMS sending is not yet configured");
        return;
      }
      setMsgTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
    } finally {
      setSending(false);
    }
  };

  const displayName = msgTarget?.username
    ? `@${msgTarget.username}`
    : msgTarget?.full_name ?? msgTarget?.referrer_id?.slice(0, 8) ?? "";

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
                {["Rank", "User", "Username", "Recruits", ""].map((h) => (
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

                    {/* Message button */}
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 rounded-lg border border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground transition-all"
                        title="Send message"
                        onClick={() => openMsg(row)}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground/50 py-12 text-sm">
                    No referrals yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Message Dialog */}
      <Dialog open={!!msgTarget} onOpenChange={(open) => !open && setMsgTarget(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-white/[0.08] max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <MessageSquare className="h-4 w-4 text-primary/60" />
              Message Recruiter
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground -mt-1">
            To: <span className="font-medium text-foreground/80">{displayName}</span>
            {msgTarget?.email && (
              <span className="ml-1 opacity-60">· {msgTarget.email}</span>
            )}
          </p>

          <Tabs value={msgTab} onValueChange={(v) => setMsgTab(v as any)}>
            <TabsList className="w-full gap-1 rounded-xl bg-white/[0.04] border border-white/[0.06] p-1 h-auto">
              <TabsTrigger value="push" className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground text-muted-foreground">
                <Bell className="h-3 w-3" /> Push
              </TabsTrigger>
              <TabsTrigger value="email" className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground text-muted-foreground">
                <Mail className="h-3 w-3" /> Email
              </TabsTrigger>
              <TabsTrigger value="sms" className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-1.5 text-xs data-[state=active]:bg-white/[0.08] data-[state=active]:text-foreground text-muted-foreground">
                <MessageSquare className="h-3 w-3" /> SMS
              </TabsTrigger>
            </TabsList>

            {/* Push */}
            <TabsContent value="push" className="space-y-3 mt-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Title</Label>
                <Input value={pushTitle} onChange={(e) => setPushTitle(e.target.value)} className="bg-white/[0.04] border-white/[0.08]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Message</Label>
                <Textarea value={pushBody} onChange={(e) => setPushBody(e.target.value)} placeholder="Write your message…" rows={3} className="bg-white/[0.04] border-white/[0.08]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Link (optional)</Label>
                <Input value={pushUrl} onChange={(e) => setPushUrl(e.target.value)} placeholder="/" className="bg-white/[0.04] border-white/[0.08]" />
              </div>
            </TabsContent>

            {/* Email */}
            <TabsContent value="email" className="space-y-3 mt-3">
              {!msgTarget?.email && (
                <p className="text-xs text-amber-400/80 bg-amber-400/[0.06] border border-amber-400/20 rounded-lg px-3 py-2">
                  No email address found for this user.
                </p>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Subject</Label>
                <Input value={emailSubject} onChange={(e) => setEmailSubject(e.target.value)} className="bg-white/[0.04] border-white/[0.08]" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Message</Label>
                <Textarea value={emailBody} onChange={(e) => setEmailBody(e.target.value)} placeholder="Write your message…" rows={4} className="bg-white/[0.04] border-white/[0.08]" />
              </div>
            </TabsContent>

            {/* SMS */}
            <TabsContent value="sms" className="space-y-3 mt-3">
              {!msgTarget?.phone_number && (
                <p className="text-xs text-amber-400/80 bg-amber-400/[0.06] border border-amber-400/20 rounded-lg px-3 py-2">
                  No phone number found for this user.
                </p>
              )}
              {msgTarget?.phone_number && (
                <p className="text-xs text-muted-foreground">
                  Sending to: <span className="font-medium text-foreground/80">{msgTarget.phone_number}</span>
                </p>
              )}
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Message</Label>
                <Textarea value={smsBody} onChange={(e) => setSmsBody(e.target.value)} placeholder="Write your SMS…" rows={3} className="bg-white/[0.04] border-white/[0.08]" />
              </div>
              <p className="text-[11px] text-muted-foreground/50">SMS delivery requires a Twilio integration to be configured.</p>
            </TabsContent>
          </Tabs>

          <DialogFooter className="gap-2 mt-1">
            <Button variant="ghost" size="sm" className="border border-white/[0.08]" onClick={() => setMsgTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSend} disabled={sending}>
              {sending ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-1.5" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
