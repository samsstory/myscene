import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VenuesBrowser } from "./data/VenuesBrowser";
import { ShowsBrowser } from "./data/ShowsBrowser";
import { SuggestionsQueue } from "./data/SuggestionsQueue";
import { FestivalsBrowser } from "./data/FestivalsBrowser";
import BackfillLogsWidget from "./data/BackfillLogsWidget";

export function DataTab() {
  return (
    <div className="space-y-6">
      <BackfillLogsWidget />
      <Tabs defaultValue="venues">
        <TabsList className="mb-4 gap-1 rounded-lg bg-white/[0.03] border border-white/[0.06] p-1 h-auto">
          <TabsTrigger value="venues" className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-white/[0.07] data-[state=active]:text-foreground">
            Venues
          </TabsTrigger>
          <TabsTrigger value="shows" className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-white/[0.07] data-[state=active]:text-foreground">
            Shows
          </TabsTrigger>
          <TabsTrigger value="festivals" className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-white/[0.07] data-[state=active]:text-foreground">
            Festivals
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="rounded-md px-3 py-1.5 text-xs font-medium text-muted-foreground data-[state=active]:bg-white/[0.07] data-[state=active]:text-foreground">
            AI Suggestions
          </TabsTrigger>
        </TabsList>

        <TabsContent value="venues">
          <VenuesBrowser />
        </TabsContent>
        <TabsContent value="shows">
          <ShowsBrowser />
        </TabsContent>
        <TabsContent value="festivals">
          <FestivalsBrowser />
        </TabsContent>
        <TabsContent value="suggestions">
          <SuggestionsQueue />
        </TabsContent>
      </Tabs>
    </div>
  );
}
