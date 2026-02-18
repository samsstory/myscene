import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Bell, Loader2, Send, Users } from "lucide-react";
import { toast } from "sonner";

interface UserEntry {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
  home_city: string | null;
  created_at: string;
  show_count: number;
}

export function UsersTab() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [pushTarget, setPushTarget] = useState<UserEntry | null>(null);
  const [pushTitle, setPushTitle] = useState("Hey from SCENE 🎶");
  const [pushBody, setPushBody] = useState("");
  const [pushUrl, setPushUrl] = useState("/");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const fetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await globalThis.fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-users`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await res.json();
      setUsers(result.users || []);
      setLoading(false);
    };
    fetch();
  }, []);

  const handleSendPush = async () => {
    if (!pushTarget || !pushTitle || !pushBody) return;
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-push-notification", {
        body: {
          user_id: pushTarget.id,
          title: pushTitle,
          body: pushBody,
          url: pushUrl || "/",
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      toast.success(`Sent to ${data.sent}/${data.total} device(s)`);
      setPushTarget(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stat pill */}
      <div className="flex items-center gap-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm px-4 py-2.5 w-fit">
        <Users className="h-3.5 w-3.5 text-muted-foreground" />
        <span className="text-xs text-muted-foreground">Total Users</span>
        <span className="text-sm font-semibold text-foreground">{users.length}</span>
      </div>

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
                {["Username", "Name", "Email", "City", "Shows", "Joined", ""].map((h) => (
                  <TableHead key={h} className="text-[11px] uppercase tracking-wider text-muted-foreground/60 font-medium">{h}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id} className="border-white/[0.05] hover:bg-white/[0.02] transition-colors">
                  <TableCell className="text-sm font-medium text-foreground/90">{u.username || "—"}</TableCell>
                  <TableCell className="text-sm text-foreground/70">{u.full_name || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.email || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.home_city || "—"}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">{u.show_count}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(u.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 rounded-lg border border-white/[0.06] bg-white/[0.03] text-muted-foreground hover:bg-white/[0.07] hover:text-foreground transition-all"
                      title="Send push notification"
                      onClick={() => setPushTarget(u)}
                    >
                      <Bell className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground/50 py-12 text-sm">
                    No users yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Send Push Notification Dialog */}
      <Dialog open={!!pushTarget} onOpenChange={(open) => !open && setPushTarget(null)}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-white/[0.08]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-semibold">
              <Bell className="h-4 w-4 text-primary/60" />
              Send Push Notification
            </DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            To: <span className="font-medium text-foreground/80">{pushTarget?.username || pushTarget?.email || pushTarget?.id}</span>
          </p>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Title</Label>
              <Input
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="Notification title"
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Message</Label>
              <Textarea
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                placeholder="What do you want to say?"
                rows={3}
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Link (optional)</Label>
              <Input
                value={pushUrl}
                onChange={(e) => setPushUrl(e.target.value)}
                placeholder="/"
                className="bg-white/[0.04] border-white/[0.08]"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="ghost" size="sm" className="border border-white/[0.08]" onClick={() => setPushTarget(null)}>Cancel</Button>
            <Button size="sm" onClick={handleSendPush} disabled={sending || !pushTitle || !pushBody}>
              {sending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Send className="h-3.5 w-3.5 mr-2" />}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
