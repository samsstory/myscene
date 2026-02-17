import { useEffect, useState } from "react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WaitlistTab } from "@/components/admin/WaitlistTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { BugReportsTab } from "@/components/admin/BugReportsTab";
import { AnnouncementsPanel } from "@/components/admin/AnnouncementsPanel";
import { QuotesTab } from "@/components/admin/QuotesTab";
import { Shield } from "lucide-react";
import BrandedLoader from "@/components/ui/BrandedLoader";
import { supabase } from "@/integrations/supabase/client";

export default function Admin() {
  const { isAdmin, loading } = useAdminCheck();
  const [newBugCount, setNewBugCount] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    (async () => {
      const { count } = await (supabase
        .from("bug_reports" as any)
        .select("*", { count: "exact", head: true })
        .eq("status", "new") as any);
      setNewBugCount(count ?? 0);
    })();
  }, [isAdmin]);

  if (loading || !isAdmin) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <BrandedLoader />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-white/[0.05] border border-white/[0.08]">
            <Shield className="h-5 w-5 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage waitlist & users</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="waitlist">
          <TabsList className="bg-white/[0.04] border border-white/[0.08]">
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="bugs" className="relative">
              Bug Reports
              {newBugCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive/80 px-1 text-[10px] font-bold text-destructive-foreground">
                  {newBugCount}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="announcements">Announcements</TabsTrigger>
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
          </TabsList>
          <TabsContent value="waitlist">
            <WaitlistTab />
          </TabsContent>
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
          <TabsContent value="bugs">
            <BugReportsTab onCountChange={setNewBugCount} />
          </TabsContent>
          <TabsContent value="announcements">
            <AnnouncementsPanel />
          </TabsContent>
          <TabsContent value="quotes">
            <QuotesTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
