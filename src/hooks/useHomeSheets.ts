import { useState } from "react";
import type { Show } from "@/hooks/useShows";
import type { AddShowPrefill } from "@/components/AddShowFlow";
import type { QuickAddPrefill } from "@/components/QuickAddSheet";
import type { UpcomingShow } from "@/hooks/usePlanUpcomingShow";

export interface HomeSheetState {
  // Edit / Add show
  editShow: Show | null;
  editDialogOpen: boolean;
  addShowPrefill: AddShowPrefill | null;
  // Show review
  reviewShow: Show | null;
  reviewSheetOpen: boolean;
  // Direct photo editor
  directEditShow: Show | null;
  directEditOpen: boolean;
  // Quick photo add
  quickPhotoShow: Show | null;
  quickPhotoOpen: boolean;
  // Incomplete tags
  incompleteTagsOpen: boolean;
  incompleteTagsFocusId: string | null;
  // Missing photos
  missingPhotosOpen: boolean;
  // Focused ranking
  focusedRankingOpen: boolean;
  // Plan show
  planShowOpen: boolean;
  // Quick add (I was there)
  quickAddOpen: boolean;
  quickAddPrefill: QuickAddPrefill | null;
  // Todo sheet
  todoSheetOpen: boolean;
  // Upcoming show detail
  selectedUpcomingShow: UpcomingShow | null;
  upcomingDetailOpen: boolean;
}

export function useHomeSheets() {
  const [editShow, setEditShow] = useState<Show | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [addShowPrefill, setAddShowPrefill] = useState<AddShowPrefill | null>(null);
  const [reviewShow, setReviewShow] = useState<Show | null>(null);
  const [reviewSheetOpen, setReviewSheetOpen] = useState(false);
  const [directEditShow, setDirectEditShow] = useState<Show | null>(null);
  const [directEditOpen, setDirectEditOpen] = useState(false);
  const [quickPhotoShow, setQuickPhotoShow] = useState<Show | null>(null);
  const [quickPhotoOpen, setQuickPhotoOpen] = useState(false);
  const [incompleteTagsOpen, setIncompleteTagsOpen] = useState(false);
  const [incompleteTagsFocusId, setIncompleteTagsFocusId] = useState<string | null>(null);
  const [missingPhotosOpen, setMissingPhotosOpen] = useState(false);
  const [focusedRankingOpen, setFocusedRankingOpen] = useState(false);
  const [planShowOpen, setPlanShowOpen] = useState(false);
  const [quickAddOpen, setQuickAddOpen] = useState(false);
  const [quickAddPrefill, setQuickAddPrefill] = useState<QuickAddPrefill | null>(null);
  const [todoSheetOpen, setTodoSheetOpen] = useState(false);
  const [selectedUpcomingShow, setSelectedUpcomingShow] = useState<UpcomingShow | null>(null);
  const [upcomingDetailOpen, setUpcomingDetailOpen] = useState(false);

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

  // Card tap handler - opens ShowReviewSheet
  const handleShowTap = (show: Show) => {
    setReviewShow(show);
    setReviewSheetOpen(true);
  };

  // Photo added via QuickPhotoAddSheet
  const handlePhotoAdded = (fetchShows: () => void) => {
    setQuickPhotoOpen(false);
    fetchShows();
  };

  // Share without photo - goes to PhotoOverlayEditor
  const handleShareWithoutPhoto = () => {
    if (quickPhotoShow) {
      setQuickPhotoOpen(false);
      setDirectEditShow(quickPhotoShow);
      setDirectEditOpen(true);
    }
  };

  // Open edit dialog for a show
  const openEditDialog = (show: Show) => {
    setEditShow(show);
    setEditDialogOpen(true);
  };

  // Close edit dialog
  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setAddShowPrefill(null);
  };

  // Open upcoming show detail
  const openUpcomingDetail = (show: UpcomingShow) => {
    setSelectedUpcomingShow(show);
    setUpcomingDetailOpen(true);
  };

  return {
    // State
    editShow,
    editDialogOpen,
    addShowPrefill,
    reviewShow,
    reviewSheetOpen,
    directEditShow,
    directEditOpen,
    quickPhotoShow,
    quickPhotoOpen,
    incompleteTagsOpen,
    incompleteTagsFocusId,
    missingPhotosOpen,
    focusedRankingOpen,
    planShowOpen,
    quickAddOpen,
    quickAddPrefill,
    todoSheetOpen,
    selectedUpcomingShow,
    upcomingDetailOpen,
    // Setters
    setEditShow,
    setEditDialogOpen,
    setAddShowPrefill,
    setReviewShow,
    setReviewSheetOpen,
    setDirectEditShow,
    setDirectEditOpen,
    setQuickPhotoShow,
    setQuickPhotoOpen,
    setIncompleteTagsOpen,
    setIncompleteTagsFocusId,
    setMissingPhotosOpen,
    setFocusedRankingOpen,
    setPlanShowOpen,
    setQuickAddOpen,
    setQuickAddPrefill,
    setTodoSheetOpen,
    setSelectedUpcomingShow,
    setUpcomingDetailOpen,
    // Handlers
    handleShareFromCard,
    handleShowTap,
    handlePhotoAdded,
    handleShareWithoutPhoto,
    openEditDialog,
    closeEditDialog,
    openUpcomingDetail,
  };
}
