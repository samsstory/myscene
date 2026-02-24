import { useEffect, useState } from "react";
import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WaitlistTab } from "@/components/admin/WaitlistTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { BugReportsTab } from "@/components/admin/BugReportsTab";
import { AnnouncementsPanel } from "@/components/admin/AnnouncementsPanel";
import { QuotesTab } from "@/components/admin/QuotesTab";
import { FeatureRequestsTab } from "@/components/admin/FeatureRequestsTab";
import { InvitersTab } from "@/components/admin/InvitersTab";
import { DataTab } from "@/components/admin/DataTab";
import { Shield } from "lucide-react";
import BrandedLoader from "@/components/ui/BrandedLoader";
import { supabase } from "@/integrations/supabase/client";

export default function Admin() {
  const { isAdmin, loading } = useAdminCheck();
  const [newBugCount, setNewBugCount] = useState(0);
  const [newFeatureCount, setNewFeatureCount] = useState(0);

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
      {/* Ambient mesh gradient */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/[0.04] blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-secondary/[0.03] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <div className="mb-10 flex items-center gap-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.04] border border-white/[0.08] backdrop-blur-sm">
            <Shield className="h-5 w-5 text-primary/60" />
          </div>
          <div>
            <h1 className="text-xl font-semibold tracking-tight text-foreground">Admin</h1>
            <p className="text-xs text-muted-foreground tracking-wide uppercase mt-0.5">Scene Dashboard</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="waitlist">
          <TabsList className="mb-6 gap-1 rounded-xl bg-white/[0.03] border border-white/[0.06] backdrop-blur-sm p-1 h-auto">
            {[
              { value: "waitlist", label: "Waitlist" },
              { value: "users", label: "Users" },
              { value: "inviters", label: "Inviters" },
              { value: "data", label: "Data" },
              { value: "bugs", label: "Bug Reports", badge: newBugCount > 0 ? newBugCount : undefined },
              { value: "features", label: "Feature Requests", badge: newFeatureCount > 0 ? newFeatureCount : undefined },
              { value: "announcements", label: "Announcements" },
              { value: "quotes", label: "Quotes" },
            ].map((tab) => (
              <TabsTrigger
                key={tab.value}
                value={tab.value}
                className="relative rounded-lg px-4 py-2 text-sm font-medium text-muted-foreground transition-all data-[state=active]:bg-white/[0.07] data-[state=active]:text-foreground data-[state=active]:shadow-none"
              >
                {tab.label}
                {tab.badge !== undefined && (
                  <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive/70 px-1 text-[9px] font-bold text-destructive-foreground">
                    {tab.badge}
                  </span>
                )}
              </TabsTrigger>
            ))}
          </TabsList>

          <TabsContent value="waitlist">
            <WaitlistTab />
          </TabsContent>
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
          <TabsContent value="inviters">
            <InvitersTab />
          </TabsContent>
          <TabsContent value="data">
            <DataTab />
          </TabsContent>
          <TabsContent value="bugs">
            <BugReportsTab onCountChange={setNewBugCount} />
          </TabsContent>
          <TabsContent value="features">
            <FeatureRequestsTab onCountChange={setNewFeatureCount} />
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
