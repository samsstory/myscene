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
import { format } from "date-fns";

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
                </TableRow>
              ))}
              {users.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                    No users yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
