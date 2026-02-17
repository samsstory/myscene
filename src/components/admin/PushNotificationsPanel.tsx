import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Send, Loader2, Users, User, Bell, Clock, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserEntry {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
}

interface PushLog {
  id: string;
  target_type: string;
  target_user_id: string | null;
  title: string;
  body: string;
  url: string | null;
  sent_count: number;
  failed_count: number;
  total_devices: number;
  created_at: string;
}

export function PushNotificationsPanel() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [logs, setLogs] = useState<PushLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(true);

  const [target, setTarget] = useState<"all" | "user">("all");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [sending, setSending] = useState(false);

  const fetchLogs = useCallback(async () => {
    const { data } = await supabase
      .from("push_notification_logs" as any)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50) as any;
    setLogs(data || []);
    setLoadingLogs(false);
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await globalThis.fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-list-users`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
          },
        }
      );
      const result = await res.json();
      setUsers(result.users || []);
      setLoadingUsers(false);
    })();

    fetchLogs();
  }, [fetchLogs]);

  const handleSend = async () => {
    if (!title.trim() || !body.trim()) return;
    if (target === "user" && !selectedUserId) {
      toast.error("Select a user first");
      return;
    }

    setSending(true);
    try {
      if (target === "user") {
        const { data, error } = await supabase.functions.invoke("send-push-notification", {
          body: { user_id: selectedUserId, title, body, url: url || "/" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success(`Sent to ${data.sent}/${data.total} device(s)`);
      } else {
        const { data, error } = await supabase.functions.invoke("broadcast-push-notification", {
          body: { title, body, url: url || "/" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success(`Broadcast sent: ${data.sent_users}/${data.total_users} users reached`);
      }
      setTitle("");
      setBody("");
      setUrl("/");
      // Refresh logs after short delay
      setTimeout(fetchLogs, 1000);
    } catch (err: any) {
      toast.error(err.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const getUserLabel = (userId: string | null) => {
    if (!userId) return null;
    const u = users.find((u) => u.id === userId);
    return u ? (u.username || u.full_name || u.email || userId.slice(0, 8)) : userId.slice(0, 8);
  };

  return (
    <div className="space-y-6">
      {/* Compose Card */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Bell className="h-4 w-4" />
            Compose Push Notification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Target */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Send To</Label>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant={target === "all" ? "default" : "outline"}
                onClick={() => setTarget("all")}
              >
                <Users className="mr-1.5 h-3.5 w-3.5" />
                All Subscribers
              </Button>
              <Button
                size="sm"
                variant={target === "user" ? "default" : "outline"}
                onClick={() => setTarget("user")}
              >
                <User className="mr-1.5 h-3.5 w-3.5" />
                Specific User
              </Button>
            </div>
          </div>

          {target === "user" && (
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">User</Label>
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingUsers ? "Loading users…" : "Select a user"} />
                </SelectTrigger>
                <SelectContent>
                  {users.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.username || u.full_name || u.email || u.id.slice(0, 8)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Hey from SCENE 🎶" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea rows={3} value={body} onChange={(e) => setBody(e.target.value)} placeholder="What do you want to say?" />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Link (optional)</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="/" />
          </div>

          <Button onClick={handleSend} disabled={sending || !title.trim() || !body.trim()} className="w-full">
            {sending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            {target === "all" ? "Broadcast to All" : "Send to User"}
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <Card className="border-border bg-card">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-4 w-4" />
            Notification History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loadingLogs ? (
            <p className="text-sm text-muted-foreground py-4 text-center">Loading…</p>
          ) : logs.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">No notifications sent yet</p>
          ) : (
            <div className="space-y-3">
              {logs.map((log) => (
                <div key={log.id} className="flex items-start gap-3 rounded-lg border border-border p-3">
                  <div className="mt-0.5">
                    {log.target_type === "broadcast" ? (
                      <Users className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium text-foreground truncate">{log.title}</p>
                      <Badge variant="secondary" className="text-[10px] uppercase tracking-wide shrink-0">
                        {log.target_type === "broadcast" ? "Broadcast" : "Direct"}
                      </Badge>
                      {log.target_type === "user" && log.target_user_id && (
                        <span className="text-[11px] text-muted-foreground">
                          → {getUserLabel(log.target_user_id)}
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{log.body}</p>
                    <div className="mt-1.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                      <span>{format(new Date(log.created_at), "MMM d, yyyy · h:mm a")}</span>
                      <span className="text-green-500 dark:text-green-400">
                        {log.sent_count} sent
                      </span>
                      {log.failed_count > 0 && (
                        <span className="flex items-center gap-0.5 text-destructive">
                          <AlertCircle className="h-3 w-3" />
                          {log.failed_count} failed
                        </span>
                      )}
                      <span>{log.total_devices} device(s)</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
