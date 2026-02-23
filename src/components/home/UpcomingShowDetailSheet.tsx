import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useShareShow } from "@/hooks/useShareShow";
import { truncateArtists } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ShowDetailSheet from "./ShowDetailSheet";
import type { UpcomingShow } from "@/hooks/usePlanUpcomingShow";
import type { FriendShow } from "@/hooks/useFriendUpcomingShows";

interface UpcomingShowDetailSheetProps {
  show: UpcomingShow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDelete: (id: string) => void;
  onRsvpChange: (id: string, status: "going" | "maybe" | "not_going") => Promise<void>;
  goingWith?: FriendShow[];
}

export default function UpcomingShowDetailSheet({
  show,
  open,
  onOpenChange,
  onDelete,
  onRsvpChange,
  goingWith = [],
}: UpcomingShowDetailSheetProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [localTicketUrl, setLocalTicketUrl] = useState<string | null>(show?.ticket_url ?? null);
  const { shareShow } = useShareShow();

  useEffect(() => {
    setLocalTicketUrl(show?.ticket_url ?? null);
  }, [show?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!show) return null;

  const dateLabel = show.show_date
    ? (() => {
        try {
          return format(parseISO(show.show_date), "EEEE, MMMM d, yyyy");
        } catch {
          return show.show_date;
        }
      })()
    : "Date TBD";

  const handleSaveTicketUrl = async (url: string) => {
    try {
      const { error } = await supabase
        .from("upcoming_shows" as any)
        .update({ ticket_url: url })
        .eq("id", show.id);
      if (error) throw error;
      setLocalTicketUrl(url);
      toast.success("Ticket link saved!");
    } catch {
      toast.error("Failed to save ticket link");
    }
  };

  const handleDelete = () => {
    onDelete(show.id);
    setConfirmOpen(false);
    onOpenChange(false);
  };

  // Map FriendShow[] → GoingWithFriend[]
  const goingWithFriends = goingWith.map((fs) => ({
    id: fs.friend.id,
    username: fs.friend.username,
    full_name: fs.friend.full_name,
    avatar_url: fs.friend.avatar_url,
  }));

  return (
    <>
      <ShowDetailSheet
        open={open}
        onOpenChange={onOpenChange}
        title={truncateArtists(show.artist_name, 3)}
        imageUrl={show.artist_image_url}
        dateLabel={dateLabel}
        venueName={show.venue_name}
        venueLocation={show.venue_location}
        spotifySearchTerm={show.artist_name}
        ticketUrl={localTicketUrl}
        editableTicket
        onSaveTicketUrl={handleSaveTicketUrl}
        rsvpMode="toggle"
        currentRsvp={show.rsvp_status ?? "going"}
        onRsvpChange={(status) => onRsvpChange(show.id, status)}
        goingWith={goingWithFriends}
        onInvite={() =>
          shareShow({
            showId: show.id,
            type: "upcoming",
            artistName: show.artist_name,
            venueName: show.venue_name ?? undefined,
          })
        }
        inviteDescription={`Invite them to join you at ${truncateArtists(show.artist_name, 3)}`}
        footer={
          <Button
            variant="outline"
            className="w-full border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 gap-2"
            onClick={() => setConfirmOpen(true)}
          >
            <Trash2 className="h-4 w-4" />
            Remove from calendar
          </Button>
        }
      />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent className="bg-background/95 border-white/10 backdrop-blur-xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Remove this show?</AlertDialogTitle>
            <AlertDialogDescription>
              <span className="font-semibold text-foreground">{show.artist_name}</span> will be removed
              from your upcoming calendar. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-white/10">Keep it</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-red-500/80 hover:bg-red-500 text-white border-0"
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
