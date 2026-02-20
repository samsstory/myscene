import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerDescription, DrawerFooter } from "@/components/ui/drawer";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Music, Layers } from "lucide-react";
import { format } from "date-fns";

interface SiblingShow {
  id: string;
  artistName: string;
  artistImageUrl?: string | null;
}

interface GroupShowPromptProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  venueName: string;
  showDate: string;
  siblingShows: SiblingShow[];
  onGroup: () => void;
  onDismiss: () => void;
  isGrouping?: boolean;
}

const GroupShowPrompt = ({
  open,
  onOpenChange,
  venueName,
  showDate,
  siblingShows,
  onGroup,
  onDismiss,
  isGrouping = false,
}: GroupShowPromptProps) => {
  const formattedDate = (() => {
    try {
      return format(new Date(showDate + "T12:00:00"), "MMM d, yyyy");
    } catch {
      return showDate;
    }
  })();

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent className="max-h-[85vh]">
        <DrawerHeader className="text-center pb-2">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
            <Layers className="h-6 w-6 text-primary" />
          </div>
          <DrawerTitle className="text-lg">
            Group as a Show?
          </DrawerTitle>
          <DrawerDescription className="text-sm text-muted-foreground">
            You saw {siblingShows.length} artists at <span className="font-medium text-foreground">{venueName}</span> on{" "}
            <span className="font-medium text-foreground">{formattedDate}</span>. Want to group these into a single Show?
          </DrawerDescription>
        </DrawerHeader>

        <div className="px-4 pb-2">
          <div className="space-y-2">
            {siblingShows.map((show) => (
              <div
                key={show.id}
                className="flex items-center gap-3 rounded-lg bg-white/[0.03] border border-white/[0.08] p-3"
              >
                <Avatar className="h-9 w-9">
                  {show.artistImageUrl ? (
                    <AvatarImage src={show.artistImageUrl} alt={show.artistName} />
                  ) : null}
                  <AvatarFallback className="bg-primary/10 text-primary text-xs">
                    <Music className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium">{show.artistName}</span>
              </div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground text-center">
            Each set stays individually ranked. The Show enters the Show ranking pool.
          </p>
        </div>

        <DrawerFooter className="pt-2">
          <Button onClick={onGroup} disabled={isGrouping} className="w-full">
            {isGrouping ? "Grouping…" : "Group as a Show"}
          </Button>
          <Button variant="ghost" onClick={onDismiss} disabled={isGrouping} className="w-full">
            Not now
          </Button>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
};

export default GroupShowPrompt;
