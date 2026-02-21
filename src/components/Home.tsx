import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, ArrowUpDown, ArrowLeft, Plus, UserCircle, Tag, Camera } from "lucide-react";
import ContentPillNav, { type ContentView } from "./home/ContentPillNav";
import MyShowsView from "./home/MyShowsView";
import { supabase } from "@/integrations/supabase/client";
import { useShows, type Show, type ShowRanking } from "@/hooks/useShows";
import { usePlanUpcomingShow } from "@/hooks/usePlanUpcomingShow";
import UpcomingShowDetailSheet from "@/components/home/UpcomingShowDetailSheet";
import ScheduleView from "@/components/home/ScheduleView";

import { ShowReviewSheet } from "./ShowReviewSheet";
import { PhotoOverlayEditor } from "./PhotoOverlayEditor";
import { QuickPhotoAddSheet } from "./QuickPhotoAddSheet";
import MapView from "./MapView";
import Rank from "./Rank";
import AddShowFlow, { type AddShowPrefill } from "./AddShowFlow";
import QuickAddSheet, { type QuickAddPrefill } from "./QuickAddSheet";
import { toast } from "sonner";

// Home components
import StatPills, { StatPillAction } from "./home/StatPills";
import DynamicInsight, { InsightAction } from "./home/DynamicInsight";
import StackedShowList from "./home/StackedShowList";

import IncompleteTagsSheet from "./home/IncompleteTagsSheet";
import MissingPhotosSheet from "./home/MissingPhotosSheet";
import FocusedRankingSession from "./home/FocusedRankingSession";
import RankingProgressCard from "./home/RankingProgressCard";
import FriendTeaser from "./home/FriendTeaser";
import WhatsNextStrip from "./home/WhatsNextStrip";
import FriendActivityFeed, { type IWasTherePayload } from "./home/FriendActivityFeed";
import PopularFeedGrid from "./home/PopularFeedGrid";
import { usePopularShows, type ShowTypeFilter, type PopularItem } from "@/hooks/usePopularShows";
import { usePopularNearMe } from "@/hooks/usePopularNearMe";
import { useFriendActivity } from "@/hooks/useFriendActivity";
import PlanShowSheet from "./home/PlanShowSheet";
import { useHomeStats } from "@/hooks/useHomeStats";
import { useFollowers } from "@/hooks/useFollowers";
import { useFriendUpcomingShows } from "@/hooks/useFriendUpcomingShows";
import { Skeleton } from "./ui/skeleton";
import FriendsPanelView from "./home/FriendsPanelView";

// Types are now imported from @/hooks/useShows

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
  // Tour-related props for Step 5 (Shows stat pill)
  showsTourActive?: boolean;
  showsRef?: React.RefObject<HTMLButtonElement>;
}

const Home = ({ onNavigateToRank, onNavigateToProfile, onAddFromPhotos, onAddSingleShow, initialView, openShowId, onShowOpened, showsTourActive, showsRef, onViewChange }: HomeProps) => {
  const { stats, statPills, insights, isLoading: statsLoading, refetch: refetchStats } = useHomeStats();
  const { shows, loading, rankings, fetchShows, deleteShow: handleDeleteShow, deleteConfirmShow, setDeleteConfirmShow, isDeleting, getShowRankInfo } = useShows({ onRealtimeChange: refetchStats });
  const [viewMode, setViewMode] = useState<ViewMode>(initialView || "home");
  const [editShow, setEditShow] = useState<Show | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addShowPrefill, setAddShowPrefill] = useState<AddShowPrefill | null>(null);
  const [reviewShow, setReviewShow] = useState<Show | null>(null);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  // topRatedFilter removed — now inside MyShowsView

  // Notify parent when view changes internally
  useEffect(() => {
    onViewChange?.(viewMode);
  }, [viewMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync viewMode when initialView prop changes
  useEffect(() => {
    if (initialView) {
      setViewMode(initialView);
    }
  }, [initialView]);
  // Rankings-specific state removed — now inside MyShowsView
  

  // Direct photo editor state for feed cards
  const [directEditShow, setDirectEditShow] = useState<Show | null>(null);
  const [directEditOpen, setDirectEditOpen] = useState(false);

  // Quick photo add sheet state for shows without photos
  const [quickPhotoShow, setQuickPhotoShow] = useState<Show | null>(null);
  const [quickPhotoOpen, setQuickPhotoOpen] = useState(false);

  // Incomplete tags sheet state
  const [incompleteTagsOpen, setIncompleteTagsOpen] = useState(false);
  const [incompleteTagsFocusId, setIncompleteTagsFocusId] = useState<string | null>(null);

  // Missing photos sheet state
  const [missingPhotosOpen, setMissingPhotosOpen] = useState(false);

  // Focused ranking session state
  const [focusedRankingOpen, setFocusedRankingOpen] = useState(false);

  // Plan a show sheet state
  const [planShowOpen, setPlanShowOpen] = useState(false);

  // Quick add sheet state (for "I was there" flow)
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddPrefill, setQuickAddPrefill] = useState<QuickAddPrefill | null>(null);

  // Todo action sheet state
  const [todoSheetOpen, setTodoSheetOpen] = useState(false);

  // Upcoming show detail sheet state (for calendar ghost tiles)
  const [selectedUpcomingShow, setSelectedUpcomingShow] = useState<import("@/hooks/usePlanUpcomingShow").UpcomingShow | null>(null);
  const [upcomingDetailOpen, setUpcomingDetailOpen] = useState(false);

  // Feed toggle: scene feed / near me / explore
  const [feedMode, setFeedMode] = useState<"scene" | "near-me" | "explore">("scene");
  // Sub-tab show type for near-me and explore
  const [nearMeShowType, setNearMeShowType] = useState<ShowTypeFilter>("set");
  const [exploreShowType, setExploreShowType] = useState<ShowTypeFilter>("set");

  // Calendar: Friends overlay toggle + friends-on-day sheet
  const [calendarFriendsMode, setCalendarFriendsMode] = useState(false);

  const { upcomingShows, deleteUpcomingShow, updateRsvpStatus } = usePlanUpcomingShow();
  const { following, followers } = useFollowers();
  const followingIds = useMemo(() => following.map((f) => f.id), [following]);
  const { friendsByDate, friendShows } = useFriendUpcomingShows(followingIds);
  const { items: activityItems, isLoading: activityLoading } = useFriendActivity(followingIds);
  const { items: exploreItems, totalUsers: exploreTotalUsers, isLoading: exploreLoading } = usePopularShows(true, exploreShowType);
  const { items: nearMeItems, totalUsers: nearMeTotalUsers, isLoading: nearMeLoading, hasLocation: nearMeHasLocation } = usePopularNearMe(true, nearMeShowType);

  // Normalizer for PhotoOverlayEditor show format
  const normalizeShowForEditor = (show: Show) => ({
    ...show,
    artists: show.artists.map((a) => ({
      ...a,
      is_headliner: a.isHeadliner ?? false
    })),
    venue_name: show.venue?.name || "",
    show_date: show.date || ""
  });

  // Smart share handler - direct to editor if photo exists, otherwise quick photo add
  const handleShareFromCard = (show: Show) => {
    if (show.photo_url) {
      setDirectEditShow(show);
      setDirectEditOpen(true);
    } else {
      setQuickPhotoShow(show);
      setQuickPhotoOpen(true);
    }
  };

  // Card tap handler - opens ShowReviewSheet for detail view (review-first UX)
  const handleShowTap = (show: Show) => {
    setReviewShow(show);
    setReviewSheetOpen(true);
  };

  // Handler when photo is added via QuickPhotoAddSheet
  const handlePhotoAdded = (photoUrl: string) => {
    if (quickPhotoShow) {
      // Close the sheet and refresh shows - don't open the editor
      setQuickPhotoOpen(false);
      fetchShows();
    }
  };

  // Handler for sharing without photo - now goes to PhotoOverlayEditor
  const handleShareWithoutPhoto = () => {
    if (quickPhotoShow) {
      setQuickPhotoOpen(false);
      setDirectEditShow(quickPhotoShow);
      setDirectEditOpen(true);
    }
  };


  // getSortedShows removed — now inside MyShowsView



  const handlePillTap = (action: StatPillAction, payload?: string) => {
    switch (action) {
      case 'rankings':
        setViewMode('rankings');
        break;
      case 'calendar':
        setViewMode('calendar');
        break;
      case 'globe':
        setViewMode('globe');
        break;
      case 'rank-tab':
        setViewMode('rank');
        break;
      case 'todo-sheet':
        setTodoSheetOpen(true);
        break;
      case 'rankings-attention':
        setViewMode('rankings');
        break;
      case 'show-detail':
        if (payload) {
          const show = shows.find((s) => s.id === payload);
          if (show) {
            setReviewShow(show);
            setReviewSheetOpen(true);
          }
        }
        break;
    }
  };

  const handleBackToHome = () => {
    setViewMode('home');
  };

  // Render functions for sub-views
  const renderHomeView = () => {

    return (
      <div className="space-y-5">
        {/* Stat Pills */}
        <StatPills stats={statPills} isLoading={statsLoading} onPillTap={handlePillTap} showsTourActive={showsTourActive} showsRef={showsRef} />

        {/* What's Next Strip */}
        <WhatsNextStrip onPlanShow={() => setPlanShowOpen(true)} />


        {/* Scene Feed / Popular Near Me / Explore — toggle */}
        <div className="space-y-3">
          {/* Tab headers */}
          <div className="flex items-center gap-4">
            {(["scene", "near-me", "explore"] as const).map((mode) => {
              const labels = { scene: "Scene Feed", "near-me": "Popular Near Me", explore: "Explore" };
              const isActive = feedMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => setFeedMode(mode)}
                  className={cn(
                    "text-[11px] uppercase tracking-[0.2em] font-semibold transition-colors",
                    isActive ? "text-white/80" : "text-white/30 hover:text-white/50"
                  )}
                  style={isActive ? { textShadow: "0 0 8px rgba(255,255,255,0.2)" } : undefined}>

                  {labels[mode]}
                </button>);

            })}
          </div>

          {/* Content */}
          {feedMode === "scene" &&
          <FriendActivityFeed
            items={activityItems}
            isLoading={activityLoading}
            hasFollowing={following.length > 0}
            onFindFriends={() => setViewMode("friends")}
            onIWasThere={(payload: IWasTherePayload) => {
              setQuickAddPrefill({
                showType: payload.showType as any || 'set',
                artistName: payload.artistName,
                artistImageUrl: (payload as any).artistImageUrl || null,
                venueName: payload.venueName,
                venueLocation: (payload as any).venueLocation || null,
                showDate: payload.showDate
              });
              setQuickAddOpen(true);
            }} />

          }
          {feedMode === "near-me" &&
          <PopularFeedGrid
            items={nearMeItems}
            totalUsers={nearMeTotalUsers}
            isLoading={nearMeLoading}
            showType={nearMeShowType}
            onShowTypeChange={setNearMeShowType}
            onQuickAdd={(item) => {
              setQuickAddPrefill({
                showType: item.type === 'artist' ? 'set' : (item as any).showType || 'set',
                artistName: item.type === 'artist' ? item.artistName : (item as any).topArtists?.[0] || (item as any).eventName,
                artistImageUrl: item.type === 'artist' ? item.artistImageUrl : (item as any).imageUrl,
                venueName: item.type === 'artist' ? item.sampleVenueName : (item as any).venueName,
                venueLocation: item.type === 'artist' ? (item as any).sampleVenueLocation : (item as any).venueLocation,
                showDate: item.sampleShowDate
              });
              setQuickAddOpen(true);
            }}
            onFindFriends={() => setViewMode("friends")}
            emptyMessage={nearMeHasLocation === false ? "Set your home city in your profile to see what's popular near you." : undefined} />

          }
          {feedMode === "explore" &&
          <PopularFeedGrid
            items={exploreItems}
            totalUsers={exploreTotalUsers}
            isLoading={exploreLoading}
            showType={exploreShowType}
            onShowTypeChange={setExploreShowType}
            onQuickAdd={(item) => {
              setQuickAddPrefill({
                showType: item.type === 'artist' ? 'set' : (item as any).showType || 'set',
                artistName: item.type === 'artist' ? item.artistName : (item as any).topArtists?.[0] || (item as any).eventName,
                artistImageUrl: item.type === 'artist' ? item.artistImageUrl : (item as any).imageUrl,
                venueName: item.type === 'artist' ? item.sampleVenueName : (item as any).venueName,
                venueLocation: item.type === 'artist' ? (item as any).sampleVenueLocation : (item as any).venueLocation,
                showDate: item.sampleShowDate
              });
              setQuickAddOpen(true);
            }}
            onFindFriends={() => setViewMode("friends")} />

          }
        </div>
      </div>);

  };

  // renderRankingsView removed — now MyShowsView component




  const renderSubViewHeader = (title: string) =>
  <div className="flex items-center gap-3 mb-4">
      <Button variant="ghost" size="icon" onClick={handleBackToHome} className="h-9 w-9">
        <ArrowLeft className="h-5 w-5" />
      </Button>
      <h2 className="text-xl font-bold">{title}</h2>
    </div>;


  const renderFriendsView = () => <FriendsPanelView />;

  return (
    <div className="space-y-4">
      {/* Spotify-style horizontal pill sub-nav */}
      <ContentPillNav
        activeView={viewMode}
        onViewChange={(v) => setViewMode(v)}
        rankNudge={stats.unrankedCount > 0 || stats.incompleteTagsCount > 0} />


      <AnimatePresence mode="wait">
        <motion.div
          key={viewMode}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -4 }}
          transition={{ duration: 0.18, ease: "easeOut" }}>

          {viewMode === 'home' && renderHomeView()}

          {viewMode === 'calendar' &&
          <ScheduleView
            shows={shows}
            rankings={rankings}
            upcomingShows={upcomingShows}
            friendsByDate={friendsByDate}
            friendShows={friendShows}
            onShowTap={handleShowTap}
            onUpcomingTap={(show) => {setSelectedUpcomingShow(show);setUpcomingDetailOpen(true);}}
            onFriendShowTap={(fs) => {
              // Convert FriendShow to UpcomingShow shape so the detail sheet can display it
              const asUpcoming: import("@/hooks/usePlanUpcomingShow").UpcomingShow = {
                id: fs.id,
                artist_name: fs.artist_name,
                venue_name: fs.venue_name,
                venue_location: fs.venue_location,
                show_date: fs.show_date,
                ticket_url: null,
                artist_image_url: fs.artist_image_url,
                rsvp_status: "going",
                created_at: ""
              };
              setSelectedUpcomingShow(asUpcoming);
              setUpcomingDetailOpen(true);
            }}
            onPlanShow={() => setPlanShowOpen(true)}
            calendarFriendsMode={calendarFriendsMode}
            onToggleFriendsMode={() => setCalendarFriendsMode((v) => !v)}
            followingCount={following.length} />

          }

          {viewMode === 'globe' &&
          <MapView
            shows={shows}
            onEditShow={(show) => {setEditShow(show);setEditDialogOpen(true);}}
            onAddFromPhotos={onAddFromPhotos}
            onAddSingleShow={onAddSingleShow}
            onShowTap={(show) => {setReviewShow(show);setReviewSheetOpen(true);}} />

          }

          {viewMode === 'rank' &&
          <Rank
            onAddShow={onAddSingleShow}
            onViewAllShows={() => setViewMode('rankings')} />

          }

          {viewMode === 'rankings' && (
            <MyShowsView
              shows={shows}
              rankings={rankings}
              loading={loading}
              getShowRankInfo={getShowRankInfo}
              onShowTap={handleShowTap}
              onDeleteShow={(show) => setDeleteConfirmShow(show)}
              onAddPhoto={(show) => { setQuickPhotoShow(show); setQuickPhotoOpen(true); }}
              onAddTags={(showId) => { setIncompleteTagsFocusId(showId); setIncompleteTagsOpen(true); }}
              onRankShow={() => setFocusedRankingOpen(true)}
            />
          )}

          {viewMode === 'friends' && renderFriendsView()}
        </motion.div>
      </AnimatePresence>

      {/* Floating search removed — now inside MyShowsView */}

      
      {/* Incomplete Tags Sheet */}
      <IncompleteTagsSheet
        open={incompleteTagsOpen}
        onOpenChange={(open) => {setIncompleteTagsOpen(open);if (!open) setIncompleteTagsFocusId(null);}}
        focusShowId={incompleteTagsFocusId}
        onComplete={() => {
          refetchStats();
          fetchShows();
        }} />

      
      {/* Missing Photos Sheet */}
      <MissingPhotosSheet
        open={missingPhotosOpen}
        onOpenChange={setMissingPhotosOpen}
        onComplete={() => {
          refetchStats();
          fetchShows();
        }} />

      
      {/* Quick Photo Add Sheet for shows without photos */}
      <QuickPhotoAddSheet
        show={quickPhotoShow}
        open={quickPhotoOpen}
        onOpenChange={setQuickPhotoOpen}
        onPhotoAdded={handlePhotoAdded}
        onShareWithoutPhoto={handleShareWithoutPhoto} />

      
      {/* Direct Photo Overlay Editor for feed cards */}
      <Sheet open={directEditOpen} onOpenChange={setDirectEditOpen}>
        <SheetContent side="bottom" className="h-[90vh] overflow-hidden flex flex-col">
          <SheetHeader className="flex-shrink-0">
            <SheetTitle>Share to Instagram</SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto mt-4">
            {directEditShow &&
            <PhotoOverlayEditor
              show={normalizeShowForEditor(directEditShow)}
              onClose={() => setDirectEditOpen(false)}
              allShows={shows.map(normalizeShowForEditor)}
              rankings={rankings} />

            }
          </div>
        </SheetContent>
      </Sheet>
      
      <ShowReviewSheet
        show={reviewShow}
        open={reviewSheetOpen}
        onOpenChange={setReviewSheetOpen}
        onEdit={(show) => {
          setEditShow(show);
          setEditDialogOpen(true);
        }}
        onShareToEditor={(show) => {
          setDirectEditShow(show);
          setDirectEditOpen(true);
        }}
        onDelete={async (showId) => {
          try {
            await supabase.from('show_tags').delete().eq('show_id', showId);
            await supabase.from('show_artists').delete().eq('show_id', showId);
            await supabase.from('show_rankings').delete().eq('show_id', showId);
            await supabase.from('show_comparisons').delete().or(`show1_id.eq.${showId},show2_id.eq.${showId}`);
            const { error } = await supabase.from('shows').delete().eq('id', showId);
            if (error) throw error;
            toast.success('Show deleted');
            fetchShows();
          } catch (error) {
            console.error('Error deleting show:', error);
            toast.error('Failed to delete show');
          }
        }}
        allShows={shows}
        rankings={rankings} />


      {/* Plan Show Sheet */}
      <PlanShowSheet open={planShowOpen} onOpenChange={setPlanShowOpen} />

      {/* Upcoming Show Detail Sheet (from calendar ghost tiles) */}
      <UpcomingShowDetailSheet
        show={selectedUpcomingShow}
        open={upcomingDetailOpen}
        onOpenChange={setUpcomingDetailOpen}
        onDelete={(id) => {
          deleteUpcomingShow(id);
          setUpcomingDetailOpen(false);
        }}
        onRsvpChange={updateRsvpStatus}
        goingWith={selectedUpcomingShow ?
        friendShows.filter((fs) => fs.show_date === selectedUpcomingShow.show_date) :
        []} />



      <FocusedRankingSession
        open={focusedRankingOpen}
        onOpenChange={setFocusedRankingOpen}
        onComplete={() => {
          setFocusedRankingOpen(false);
          refetchStats();
          fetchShows();
        }} />


      {/* Todo Action Sheet */}
      <Sheet open={todoSheetOpen} onOpenChange={setTodoSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-2xl">
          <SheetHeader>
            <SheetTitle className="text-left text-lg font-bold">Things to do</SheetTitle>
          </SheetHeader>
          <div className="space-y-2 mt-4 pb-4">
            {stats.profileIncomplete &&
            <button
              onClick={() => {setTodoSheetOpen(false);onNavigateToProfile?.();}}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.98]">

                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center">
                    <UserCircle className="h-4 w-4 text-primary" />
                  </div>
                  <span className="text-sm text-foreground">Complete your profile</span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </button>
            }
            {stats.unrankedCount > 0 &&
            <button
              onClick={() => {setTodoSheetOpen(false);onNavigateToRank?.();}}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.98]">

                <div className="flex items-center gap-3">
                  <ArrowUpDown className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">{stats.unrankedCount} {stats.unrankedCount === 1 ? 'show' : 'shows'} to rank</span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </button>
            }
            {stats.incompleteTagsCount > 0 &&
            <button
              onClick={() => {setTodoSheetOpen(false);setIncompleteTagsOpen(true);}}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.98]">

                <div className="flex items-center gap-3">
                  <Tag className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">{stats.incompleteTagsCount} {stats.incompleteTagsCount === 1 ? 'show needs' : 'shows need'} highlights</span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </button>
            }
            {stats.missingPhotosCount > 0 &&
            <button
              onClick={() => {setTodoSheetOpen(false);setMissingPhotosOpen(true);}}
              className="w-full flex items-center justify-between p-3 rounded-xl bg-white/[0.04] backdrop-blur-sm border border-white/[0.08] hover:bg-white/[0.08] transition-all active:scale-[0.98]">

                <div className="flex items-center gap-3">
                  <Camera className="h-4 w-4 text-primary" />
                  <span className="text-sm text-foreground">{stats.missingPhotosCount} {stats.missingPhotosCount === 1 ? 'show needs' : 'shows need'} a photo</span>
                </div>
                <ChevronRight className="h-4 w-4 text-white/30" />
              </button>
            }
          </div>
        </SheetContent>
      </Sheet>

      <AddShowFlow
        open={editDialogOpen}
        onOpenChange={(open) => {setEditDialogOpen(open);if (!open) setAddShowPrefill(null);}}
        prefill={addShowPrefill}
        editShow={editShow ? {
          id: editShow.id,
          venue: editShow.venue,
          date: editShow.date,
          datePrecision: editShow.datePrecision || 'exact',
          artists: editShow.artists,
          tags: editShow.tags,
          notes: editShow.notes,
          venueId: editShow.venueId,
          photo_url: editShow.photo_url,
          showType: editShow.showType
        } : null} />


      <QuickAddSheet
        open={quickAddOpen}
        onOpenChange={(open) => {setQuickAddOpen(open);if (!open) setQuickAddPrefill(null);}}
        prefill={quickAddPrefill}
        onShowAdded={() => {fetchShows();refetchStats();}} />


      <AlertDialog open={!!deleteConfirmShow} onOpenChange={(open) => !open && setDeleteConfirmShow(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this show?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteConfirmShow &&
              <>
                  This will permanently delete <strong>{deleteConfirmShow.artists.map((a) => a.name).join(', ')}</strong> at {deleteConfirmShow.venue.name}.
                  This action cannot be undone.
                </>
              }
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
    </div>);

};

export default Home;