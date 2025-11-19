import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Plus, Music, TrendingUp, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Feed from "@/components/Feed";
import Stats from "@/components/Stats";
import Profile from "@/components/Profile";
import AddShowDialog from "@/components/AddShowDialog";

const Dashboard = () => {
  const [showAddDialog, setShowAddDialog] = useState(false);

  return (
    <div className="min-h-screen bg-gradient-accent">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Scene
            </h1>
            <Button onClick={() => setShowAddDialog(true)} className="shadow-glow">
              <Plus className="mr-2 h-4 w-4" />
              Add Show
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <Tabs defaultValue="feed" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-8">
            <TabsTrigger value="feed" className="gap-2">
              <Music className="h-4 w-4" />
              Feed
            </TabsTrigger>
            <TabsTrigger value="stats" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              Stats
            </TabsTrigger>
            <TabsTrigger value="profile" className="gap-2">
              <User className="h-4 w-4" />
              Profile
            </TabsTrigger>
          </TabsList>

          <TabsContent value="feed">
            <Feed />
          </TabsContent>

          <TabsContent value="stats">
            <Stats />
          </TabsContent>

          <TabsContent value="profile">
            <Profile />
          </TabsContent>
        </Tabs>
      </main>

      <AddShowDialog open={showAddDialog} onOpenChange={setShowAddDialog} />
    </div>
  );
};

export default Dashboard;
