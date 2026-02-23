import { format, parseISO } from "date-fns";
import { Users } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { UpcomingShow } from "@/hooks/usePlanUpcomingShow";
import type { FriendShow } from "@/hooks/useFriendUpcomingShows";

interface FriendsGoingSheetProps {
  show: UpcomingShow | null;
  goingWith: FriendShow[];
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export default function FriendsGoingSheet({ show, goingWith, open, onOpenChange }: FriendsGoingSheetProps) {
  if (!show) return null;
  const dateLabel = show.show_date
    ? (() => { try { return format(parseISO(show.show_date), "EEEE, MMMM d"); } catch { return ""; } })()
    : "Date TBD";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-background border-white/10 pb-safe">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left text-base font-semibold">
            {show.artist_name}
          </SheetTitle>
          <p className="text-xs text-muted-foreground text-left">{dateLabel}{show.venue_name ? ` · ${show.venue_name}` : ""}</p>
        </SheetHeader>

        <div className="mb-4 flex items-center gap-2">
          <Users className="h-4 w-4 text-primary/70" />
          <span className="text-sm font-semibold text-foreground">
            {goingWith.length} {goingWith.length === 1 ? "friend" : "friends"} going
          </span>
        </div>

        <div className="space-y-3 max-h-[50vh] overflow-y-auto">
          {goingWith.map((fs) => {
            const name = fs.friend.full_name ?? fs.friend.username ?? "Friend";
            const username = fs.friend.username;
            const initial = (username ?? name ?? "?")[0].toUpperCase();
            return (
              <div key={fs.friend.id} className="flex items-center gap-3 py-1">
                {fs.friend.avatar_url ? (
                  <img
                    src={fs.friend.avatar_url}
                    alt={name}
                    className="w-9 h-9 rounded-full object-cover border border-white/10 flex-shrink-0"
                  />
                ) : (
                  <div className="w-9 h-9 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center flex-shrink-0">
                    <span className="text-sm font-bold text-primary/90">{initial}</span>
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{name}</p>
                  {username && (
                    <p className="text-xs text-muted-foreground truncate">@{username}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </SheetContent>
    </Sheet>
  );
}
