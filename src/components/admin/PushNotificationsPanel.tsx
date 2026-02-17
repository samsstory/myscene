import { useState, useEffect } from "react";
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
import { Send, Loader2, Users, User, Bell } from "lucide-react";
import { toast } from "sonner";

interface UserEntry {
  id: string;
  username: string | null;
  full_name: string | null;
  email: string | null;
}

export function PushNotificationsPanel() {
  const [users, setUsers] = useState<UserEntry[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [subscribedCount, setSubscribedCount] = useState<number | null>(null);

  const [target, setTarget] = useState<"all" | "user">("all");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [url, setUrl] = useState("/");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch users
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

      // Get count of unique subscribed users
      const countRes = await supabase
        .rpc("has_role", { _user_id: session.user.id, _role: "admin" as const });
      // We need to query via edge function or direct — but push_subscriptions RLS only allows own.
      // We'll use the admin-list-users data length as a proxy, or we can count from the send function.
    })();
  }, []);

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
        // Broadcast to all — send to each user that has subscriptions
        const { data, error } = await supabase.functions.invoke("broadcast-push-notification", {
          body: { title, body, url: url || "/" },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
        toast.success(`Broadcast sent: ${data.sent_users}/${data.total_users} users reached`);
      }
      // Reset form
      setTitle("");
      setBody("");
      setUrl("/");
    } catch (err: any) {
      toast.error(err.message || "Failed to send notification");
    } finally {
      setSending(false);
    }
  };

  const selectedUser = users.find((u) => u.id === selectedUserId);

  return (
    <div className="space-y-4">
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

          {/* User selector */}
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

          {/* Title */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Hey from SCENE 🎶"
            />
          </div>

          {/* Body */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Message</Label>
            <Textarea
              rows={3}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="What do you want to say?"
            />
          </div>

          {/* URL */}
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Link (optional)</Label>
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="/"
            />
          </div>

          {/* Send */}
          <Button
            onClick={handleSend}
            disabled={sending || !title.trim() || !body.trim()}
            className="w-full"
          >
            {sending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            {target === "all" ? "Broadcast to All" : "Send to User"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
