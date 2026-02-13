import { useAdminCheck } from "@/hooks/useAdminCheck";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WaitlistTab } from "@/components/admin/WaitlistTab";
import { UsersTab } from "@/components/admin/UsersTab";
import { Shield } from "lucide-react";
import BrandedLoader from "@/components/ui/BrandedLoader";

export default function Admin() {
  const { isAdmin, loading } = useAdminCheck();

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
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <Shield className="h-5 w-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
            <p className="text-sm text-muted-foreground">Manage waitlist & users</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="waitlist">
          <TabsList className="bg-muted">
            <TabsTrigger value="waitlist">Waitlist</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>
          <TabsContent value="waitlist">
            <WaitlistTab />
          </TabsContent>
          <TabsContent value="users">
            <UsersTab />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
