import { useEffect, useState, useMemo } from "react";
import { truncateArtists } from "@/lib/utils";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import ContentPillNav, { type ContentView } from "./home/ContentPillNav";
import MyShowsView from "./home/MyShowsView";
import SceneView from "./home/SceneView";
import TodoActionSheet from "./home/TodoActionSheet";
import { deleteShowById } from "@/lib/delete-show";
import { useShows, type Show } from "@/hooks/useShows";
import { useHomeSheets } from "@/hooks/useHomeSheets";
import { usePlanUpcomingShow } from "@/hooks/usePlanUpcomingShow";
import UpcomingShowDetailSheet from "@/components/home/UpcomingShowDetailSheet";
import ScheduleView from "@/components/home/ScheduleView";

import { ShowReviewSheet } from "./ShowReviewSheet";
import { PhotoOverlayEditor } from "./PhotoOverlayEditor";
import { QuickPhotoAddSheet } from "./QuickPhotoAddSheet";
import MapView from "./MapView";
import Rank from "./Rank";
import AddShowFlow from "./AddShowFlow";
import QuickAddSheet from "./QuickAddSheet";
import { toast } from "sonner";


import { type EdmtrainEvent } from "@/hooks/useEdmtrainEvents";

import IncompleteTagsSheet from "./home/IncompleteTagsSheet";
import MissingPhotosSheet from "./home/MissingPhotosSheet";
import FocusedRankingSession from "./home/FocusedRankingSession";
import PlanShowSheet from "./home/PlanShowSheet";
import { useHomeStats } from "@/hooks/useHomeStats";
import { useFollowers } from "@/hooks/useFollowers";
import { useFriendUpcomingShows } from "@/hooks/useFriendUpcomingShows";
import FriendsPanelView from "./home/FriendsPanelView";
import { usePopularNearMe } from "@/hooks/usePopularNearMe";

type ViewMode = ContentView;

interface HomeProps {
  onViewChange?: (view: ViewMode) => void;
  onNavigateToRank?: () => void;
  onNavigateToProfile?: () => void;
  onAddFromPhotos?: () => void;
  onAddSingleShow?: () => void;
  initialView?: ViewMode;
  openShowId?: string | null;
  onShowOpened?: () => void;
  showsTourActive?: boolean;
  showsRef?: React.RefObject<HTMLButtonElement>;
}

const Home = ({ onNavigateToRank, onNavigateToProfile, onAddFromPhotos, onAddSingleShow, initialView, openShowId, onShowOpened, showsTourActive, showsRef, onViewChange }: HomeProps) => {
  const { stats, isLoading: statsLoading, refetch: refetchStats } = useHomeStats();
  const { shows, loading, rankings, fetchShows, deleteShow: handleDeleteShow, deleteConfirmShow, setDeleteConfirmShow, isDeleting, getShowRankInfo } = useShows({ onRealtimeChange: refetchStats });
  const [viewMode, setViewMode] = useState<ViewMode>(initialView || "home");
  const sheets = useHomeSheets();

  const [calendarFriendsMode, setCalendarFriendsMode] = useState(false);

  const { upcomingShows, deleteUpcomingShow, updateRsvpStatus, saveUpcomingShow } = usePlanUpcomingShow();
  const { following, followers } = useFollowers();
  const followingIds = useMemo(() => following.map((f) => f.id), [following]);
  const { friendsByDate, friendShows } = useFriendUpcomingShows(followingIds);
  const { items: nearMeItems, totalUsers: nearMeTotalUsers, isLoading: nearMeLoading, hasLocation: nearMeHasLocation } = usePopularNearMe(true);

  useEffect(() => { onViewChange?.(viewMode); }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (initialView) setViewMode(initialView); }, [initialView]);

  const normalizeShowForEditor = (show: Show) => ({
    ...show,
    artists: show.artists.map((a) => ({ ...a, is_headliner: a.isHeadliner ?? false })),
    venue_name: show.venue?.name || "",
    show_date: show.date || ""
  });



  const handleQuickAddFromPopular = (item: any) => {
    sheets.setQuickAddPrefill({
      showType: item.type === 'artist' ? 'set' : (item as any).showType || 'set',
      artistName: item.type === 'artist' ? item.artistName : (item as any).topArtists?.[0] || (item as any).eventName,
      artistImageUrl: item.type === 'artist' ? item.artistImageUrl : (item as any).imageUrl,
      venueName: item.type === 'artist' ? item.sampleVenueName : (item as any).venueName,
      venueLocation: item.type === 'artist' ? (item as any).sampleVenueLocation : (item as any).venueLocation,
      showDate: item.sampleShowDate
    });
    sheets.setQuickAddOpen(true);
  };

  // Collect unique artist names for Edmtrain personalization
  const userArtistNames = useMemo(() => {
    const names = new Set<string>();
    shows.forEach((s) => s.artists.forEach((a) => names.add(a.name)));
    return Array.from(names);
  }, [shows]);

  const handleEdmtrainAddToSchedule = async (event: EdmtrainEvent) => {
    const artistName = event.event_name || truncateArtists(event.artists.map(a => a.name), 3);
    const saved = await saveUpcomingShow({
      artist_name: artistName,
      venue_name: event.venue_name || undefined,
      venue_location: event.venue_location || undefined,
      show_date: event.event_date || undefined,
      ticket_url: event.event_link, // Edmtrain event link as ticket URL (required attribution)
    });
    if (!saved) {
      toast.error("Failed to add to schedule");
    }
  };

  return (
    <div className="space-y-4">
      <ContentPillNav
        activeView={viewMode}
        onViewChange={(v) => setViewMode(v)}
        rankNudge={stats.unrankedCount > 0 || stats.incompleteTagsCount > 0}
      />

      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}
        >
          {viewMode === 'home' && (
            <SceneView
              onPlanShow={() => sheets.setPlanShowOpen(true)}
              onNavigateToFriends={() => setViewMode('friends')}
              nearMeItems={nearMeItems}
              nearMeTotalUsers={nearMeTotalUsers}
              nearMeLoading={nearMeLoading}
              nearMeHasLocation={nearMeHasLocation}
              onQuickAdd={handleQuickAddFromPopular}
              onAddEdmtrainToSchedule={handleEdmtrainAddToSchedule}
              userArtistNames={userArtistNames}
              friendShows={friendShows}
              onAddFriendShowToSchedule={async (show) => {
                const saved = await saveUpcomingShow({
                  artist_name: show.artist_name,
                  venue_name: show.venue_name || undefined,
                  venue_location: show.venue_location || undefined,
                  show_date: show.show_date || undefined,
                  artist_image_url: show.artist_image_url || undefined,
                });
                if (!saved) toast.error("Failed to add to schedule");
              }}
              hasNoUpcoming={upcomingShows.length === 0}
              hasNoFollowing={following.length === 0}
            />
          )}

          {viewMode === 'calendar' && (
            <ScheduleView
              shows={shows}
              rankings={rankings}
              upcomingShows={upcomingShows}
              friendsByDate={friendsByDate}
              friendShows={friendShows}
              onShowTap={sheets.handleShowTap}
              onUpcomingTap={sheets.openUpcomingDetail}
              onFriendShowTap={(fs) => {
                const asUpcoming: import("@/hooks/usePlanUpcomingShow").UpcomingShow = {
                  id: fs.id, artist_name: fs.artist_name, venue_name: fs.venue_name,
                  venue_location: fs.venue_location, show_date: fs.show_date,
                  ticket_url: null, artist_image_url: fs.artist_image_url,
                  rsvp_status: "going", created_at: ""
                };
                sheets.openUpcomingDetail(asUpcoming);
              }}
              onPlanShow={() => sheets.setPlanShowOpen(true)}
              calendarFriendsMode={calendarFriendsMode}
              onToggleFriendsMode={() => setCalendarFriendsMode((v) => !v)}
              followingCount={following.length}
            />
          )}

          {viewMode === 'globe' && (
            <MapView
              shows={shows}
              onEditShow={sheets.openEditDialog}
              onAddFromPhotos={onAddFromPhotos}
              onAddSingleShow={onAddSingleShow}
              onShowTap={sheets.handleShowTap}
            />
          )}

          {viewMode === 'rank' && (
            <Rank onAddShow={onAddSingleShow} onViewAllShows={() => setViewMode('rankings')} />
          )}

          {viewMode === 'rankings' && (
            <MyShowsView
              shows={shows}
              rankings={rankings}
              loading={loading}
              getShowRankInfo={getShowRankInfo}
              onShowTap={sheets.handleShowTap}
              onDeleteShow={(show) => setDeleteConfirmShow(show)}
              onAddPhoto={(show) => { sheets.setQuickPhotoShow(show); sheets.setQuickPhotoOpen(true); }}
              onAddTags={(showId) => { sheets.setIncompleteTagsFocusId(showId); sheets.setIncompleteTagsOpen(true); }}
              onRankShow={() => sheets.setFocusedRankingOpen(true)}
            />
          )}

          {viewMode === 'friends' && <FriendsPanelView />}
        </motion.div>
      </AnimatePresence>

      {/* Sheets & Dialogs */}
      <IncompleteTagsSheet
        open={sheets.incompleteTagsOpen}
        onOpenChange={(open) => { sheets.setIncompleteTagsOpen(open); if (!open) sheets.setIncompleteTagsFocusId(null); }}
        focusShowId={sheets.incompleteTagsFocusId}
        onComplete={() => { refetchStats(); fetchShows(); }}
      />

      <MissingPhotosSheet
        open={sheets.missingPhotosOpen}
        onOpenChange={sheets.setMissingPhotosOpen}
        onComplete={() => { refetchStats(); fetchShows(); }}
      />

      <QuickPhotoAddSheet
        show={sheets.quickPhotoShow}
        open={sheets.quickPhotoOpen}
        onOpenChange={sheets.setQuickPhotoOpen}
        onPhotoAdded={() => sheets.handlePhotoAdded(fetchShows)}
        onShareWithoutPhoto={sheets.handleShareWithoutPhoto}
      />

      <Sheet open={sheets.directEditOpen} onOpenChange={sheets.setDirectEditOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-hidden flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>Share to Instagram</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {sheets.directEditShow && (
              <PhotoOverlayEditor
                show={normalizeShowForEditor(sheets.directEditShow)}
                onClose={() => sheets.setDirectEditOpen(false)}
                allShows={shows.map(normalizeShowForEditor)}
                rankings={rankings}
              />
            )}
          </div>
        </SheetContent>
      </Sheet>

      <ShowReviewSheet
        show={sheets.reviewShow}
        open={sheets.reviewSheetOpen}
        onOpenChange={sheets.setReviewSheetOpen}
        onEdit={sheets.openEditDialog}
        onShareToEditor={(show) => { sheets.setDirectEditShow(show); sheets.setDirectEditOpen(true); }}
        onDelete={async (showId) => {
          try {
            await deleteShowById(showId);
            toast.success('Show deleted');
            fetchShows();
          } catch (error) {
            console.error('Error deleting show:', error);
            toast.error('Failed to delete show');
          }
        }}
        allShows={shows}
        rankings={rankings}
      />

      <PlanShowSheet open={sheets.planShowOpen} onOpenChange={sheets.setPlanShowOpen} />

      <UpcomingShowDetailSheet
        show={sheets.selectedUpcomingShow}
        open={sheets.upcomingDetailOpen}
        onOpenChange={sheets.setUpcomingDetailOpen}
        onDelete={(id) => { deleteUpcomingShow(id); sheets.setUpcomingDetailOpen(false); }}
        onRsvpChange={updateRsvpStatus}
        goingWith={sheets.selectedUpcomingShow ? friendShows.filter((fs) => fs.show_date === sheets.selectedUpcomingShow!.show_date) : []}
      />

      <FocusedRankingSession
        open={sheets.focusedRankingOpen}
        onOpenChange={sheets.setFocusedRankingOpen}
        onComplete={() => { sheets.setFocusedRankingOpen(false); refetchStats(); fetchShows(); }}
      />

      <TodoActionSheet
        open={sheets.todoSheetOpen}
        onOpenChange={sheets.setTodoSheetOpen}
        stats={stats}
        onCompleteProfile={() => onNavigateToProfile?.()}
        onRankShows={() => onNavigateToRank?.()}
        onFixTags={() => sheets.setIncompleteTagsOpen(true)}
        onFixPhotos={() => sheets.setMissingPhotosOpen(true)}
      />

      <AddShowFlow
        open={sheets.editDialogOpen}
        onOpenChange={(open) => { sheets.setEditDialogOpen(open); if (!open) sheets.setAddShowPrefill(null); }}
        prefill={sheets.addShowPrefill}
        editShow={sheets.editShow ? {
          id: sheets.editShow.id, venue: sheets.editShow.venue, date: sheets.editShow.date,
          datePrecision: sheets.editShow.datePrecision || 'exact', artists: sheets.editShow.artists,
          tags: sheets.editShow.tags, notes: sheets.editShow.notes, venueId: sheets.editShow.venueId,
          photo_url: sheets.editShow.photo_url, showType: sheets.editShow.showType
        } : null}
      />

      <QuickAddSheet
        open={sheets.quickAddOpen}
        onOpenChange={(open) => { sheets.setQuickAddOpen(open); if (!open) sheets.setQuickAddPrefill(null); }}
        prefill={sheets.quickAddPrefill}
        onShowAdded={() => { fetchShows(); refetchStats(); }}
      />

      <AlertDialog open={!!deleteConfirmShow} onOpenChange={(open) => !open && setDeleteConfirmShow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this show?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmShow && (
                <>This will permanently delete <strong>{deleteConfirmShow.artists.map((a) => a.name).join(', ')}</strong> at {deleteConfirmShow.venue.name}. This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteShow} disabled={isDeleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {isDeleting ? 'Deleting...' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Home;
