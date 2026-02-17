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
import { Bell, Loader2, Send } from "lucide-react";
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
    <div className="space-y-4">
      <div className="flex items-center gap-2 rounded-lg bg-muted px-4 py-2 w-fit">
        <span className="text-sm text-muted-foreground">Total Users</span>
        <span className="font-semibold">{users.length}</span>
      </div>

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
                <TableHead>Username</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>City</TableHead>
                <TableHead>Shows</TableHead>
                <TableHead>Joined</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.username || "—"}</TableCell>
                  <TableCell>{u.full_name || "—"}</TableCell>
                  <TableCell className="text-sm">{u.email || "—"}</TableCell>
                  <TableCell>{u.home_city || "—"}</TableCell>
                  <TableCell>{u.show_count}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {format(new Date(u.created_at), "MMM d, yyyy")}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      title="Send test push notification"
                      onClick={() => setPushTarget(u)}
                    >
                      <Bell className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Send Push Notification
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            To: <span className="font-medium text-foreground">{pushTarget?.username || pushTarget?.email || pushTarget?.id}</span>
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="push-title">Title</Label>
              <Input
                id="push-title"
                value={pushTitle}
                onChange={(e) => setPushTitle(e.target.value)}
                placeholder="Notification title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="push-body">Message</Label>
              <Textarea
                id="push-body"
                value={pushBody}
                onChange={(e) => setPushBody(e.target.value)}
                placeholder="What do you want to say?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="push-url">Link (optional)</Label>
              <Input
                id="push-url"
                value={pushUrl}
                onChange={(e) => setPushUrl(e.target.value)}
                placeholder="/"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPushTarget(null)}>Cancel</Button>
            <Button onClick={handleSendPush} disabled={sending || !pushTitle || !pushBody}>
              {sending ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Send
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
