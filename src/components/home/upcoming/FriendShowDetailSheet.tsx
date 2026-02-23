import { format, parseISO } from "date-fns";
import { Plus, Check, Loader2 } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import type { GroupedFriendShow } from "./types";

interface FriendShowDetailSheetProps {
  show: GroupedFriendShow | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isAdded: boolean;
  isToggling: boolean;
  onToggle: (show: GroupedFriendShow) => void;
}

export default function FriendShowDetailSheet({
  show,
  open,
  onOpenChange,
  isAdded,
  isToggling,
  onToggle,
}: FriendShowDetailSheetProps) {
  if (!show) return null;

  const dateLabel = show.show_date
    ? (() => { try { return format(parseISO(show.show_date), "EEEE, MMMM d, yyyy"); } catch { return ""; } })()
    : "Date TBD";

  const allFriends = show.allFriends ?? [show.friend];
  const friendCount = allFriends.length;
  const friendLabel = friendCount === 1
    ? `${allFriends[0].full_name?.split(" ")[0] ?? allFriends[0].username ?? "Friend"} is going`
    : `${friendCount} friends going`;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="rounded-t-3xl bg-background border-white/10 pb-safe">
        <SheetHeader className="pb-4">
          <SheetTitle className="text-left text-base font-semibold">
            {show.artist_name}
          </SheetTitle>
        </SheetHeader>

        {show.artist_image_url && (
          <div className="relative w-full h-40 rounded-2xl overflow-hidden mb-4">
            <img src={show.artist_image_url} alt={show.artist_name} className="w-full h-full object-cover" style={{ filter: "blur(1px)" }} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          </div>
        )}

        <div className="space-y-3 text-sm mb-5">
          {/* Who's going */}
          <div className="flex items-center gap-2.5">
            <div className="flex items-center">
              {allFriends.slice(0, 4).map((f, i) =>
                f.avatar_url ? (
                  <img
                    key={f.id}
                    src={f.avatar_url}
                    alt={f.username ?? f.full_name ?? ""}
                    className="w-7 h-7 rounded-full border-2 border-background object-cover"
                    style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i }}
                  />
                ) : (
                  <div
                    key={f.id}
                    className="w-7 h-7 rounded-full border-2 border-background bg-primary/40 flex items-center justify-center"
                    style={{ marginLeft: i === 0 ? 0 : -10, zIndex: 4 - i }}
                  >
                    <span className="text-[9px] font-bold text-primary-foreground">
                      {(f.username ?? f.full_name ?? "?")[0].toUpperCase()}
                    </span>
                  </div>
                )
              )}
            </div>
            <span className="text-sm font-medium text-foreground">{friendLabel}</span>
          </div>
          <div className="text-muted-foreground text-sm">{dateLabel}</div>
          {(show.venue_name || show.venue_location) && (
            <div className="text-muted-foreground text-sm">
              {show.venue_name}{show.venue_name && show.venue_location ? " · " : ""}{show.venue_location}
            </div>
          )}
        </div>

        <button
          onClick={() => onToggle(show)}
          disabled={isToggling}
          className={`w-full h-11 rounded-2xl font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
            isAdded
              ? "bg-white/[0.08] border border-white/10 text-white/60 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          }`}
        >
          {isToggling ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : isAdded ? (
            <>
              <Check className="h-4 w-4" />
              Added to my calendar · tap to remove
            </>
          ) : (
            <>
              <Plus className="h-4 w-4" />
              I'm going too
            </>
          )}
        </button>
      </SheetContent>
    </Sheet>
  );
}
