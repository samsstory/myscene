# Scene source coverage index

Date: 2026-09-05

Companion to [the full capability inventory](2026-09-05-current-app-inventory.md). Generated from TypeScript source using the installed TypeScript parser. This covers all 216 source modules, including generic UI primitives. Static import reachability includes lazy literal imports and type imports; it is not proof that a screen renders, a branch executes, or a feature works. No runtime imports generated from variables are resolved. Resources are direct literal .from() calls (tables or storage buckets); calls are direct literal RPC/Edge Function names. Indirect hooks and dynamic RPC names require the main inventory. A blank resource column does not mean no data access.

No module in this list is approved for deletion.

| Source | Import path from main | Direct resources | Direct RPC / function calls |
| --- | --- | --- | --- |
| [src/App.tsx](../../src/App.tsx) | Found | None found | None found |
| [src/components/add-show-steps/ArtistsStep.tsx](../../src/components/add-show-steps/ArtistsStep.tsx) | Found | None found | search-artists |
| [src/components/add-show-steps/DateStep.tsx](../../src/components/add-show-steps/DateStep.tsx) | Found | None found | None found |
| [src/components/add-show-steps/QuickCompareStep.tsx](../../src/components/add-show-steps/QuickCompareStep.tsx) | Found | shows, show_rankings, show_artists, show_comparisons | None found |
| [src/components/add-show-steps/RatingStep.tsx](../../src/components/add-show-steps/RatingStep.tsx) | Found | None found | None found |
| [src/components/add-show-steps/ShowTypeStep.tsx](../../src/components/add-show-steps/ShowTypeStep.tsx) | Found | None found | None found |
| [src/components/add-show-steps/SuccessStep.tsx](../../src/components/add-show-steps/SuccessStep.tsx) | Found | None found | None found |
| [src/components/add-show-steps/UnifiedSearchStep.tsx](../../src/components/add-show-steps/UnifiedSearchStep.tsx) | Found | None found | unified-search |
| [src/components/add-show-steps/VenueStep.tsx](../../src/components/add-show-steps/VenueStep.tsx) | Found | user_venues, events, venues | search-venues |
| [src/components/AddChoiceSheet.tsx](../../src/components/AddChoiceSheet.tsx) | Found | None found | None found |
| [src/components/AddShowFlow.tsx](../../src/components/AddShowFlow.tsx) | Found | profiles, venues, shows, show_artists, events, user_venues, show_tags, show-photos | None found |
| [src/components/admin/AddWaitlistDialog.tsx](../../src/components/admin/AddWaitlistDialog.tsx) | Found | waitlist | None found |
| [src/components/admin/AnnouncementsPanel.tsx](../../src/components/admin/AnnouncementsPanel.tsx) | Found | None found | None found |
| [src/components/admin/ApproveModal.tsx](../../src/components/admin/ApproveModal.tsx) | Found | None found | None found |
| [src/components/admin/BugReportsTab.tsx](../../src/components/admin/BugReportsTab.tsx) | Found | None found | None found |
| [src/components/admin/EmailPreviewPanel.tsx](../../src/components/admin/EmailPreviewPanel.tsx) | Found | None found | None found |
| [src/components/admin/EmailTemplateEditor.tsx](../../src/components/admin/EmailTemplateEditor.tsx) | Found | None found | None found |
| [src/components/admin/FeatureRequestsTab.tsx](../../src/components/admin/FeatureRequestsTab.tsx) | Found | feature_requests | None found |
| [src/components/admin/InvitersTab.tsx](../../src/components/admin/InvitersTab.tsx) | Found | referrals, profiles | send-push-notification, resend-notification |
| [src/components/admin/PushNotificationsPanel.tsx](../../src/components/admin/PushNotificationsPanel.tsx) | Found | None found | send-push-notification, broadcast-push-notification |
| [src/components/admin/QuotesTab.tsx](../../src/components/admin/QuotesTab.tsx) | Found | loading_quotes, app_settings | None found |
| [src/components/admin/ResendDialog.tsx](../../src/components/admin/ResendDialog.tsx) | Found | None found | None found |
| [src/components/admin/UsersTab.tsx](../../src/components/admin/UsersTab.tsx) | Found | None found | send-push-notification |
| [src/components/admin/WaitlistTab.tsx](../../src/components/admin/WaitlistTab.tsx) | Found | None found | None found |
| [src/components/BugPromptBanner.tsx](../../src/components/BugPromptBanner.tsx) | Found | None found | None found |
| [src/components/BugReportButton.tsx](../../src/components/BugReportButton.tsx) | Not found | None found | None found |
| [src/components/bulk-upload/ArtistTagInput.tsx](../../src/components/bulk-upload/ArtistTagInput.tsx) | Found | None found | unified-search |
| [src/components/bulk-upload/BulkReviewStep.tsx](../../src/components/bulk-upload/BulkReviewStep.tsx) | Found | None found | None found |
| [src/components/bulk-upload/BulkSuccessStep.tsx](../../src/components/bulk-upload/BulkSuccessStep.tsx) | Found | None found | None found |
| [src/components/bulk-upload/CompactDateSelector.tsx](../../src/components/bulk-upload/CompactDateSelector.tsx) | Found | None found | None found |
| [src/components/bulk-upload/PhotoReviewCard.tsx](../../src/components/bulk-upload/PhotoReviewCard.tsx) | Found | None found | unified-search |
| [src/components/bulk-upload/PhotoSelectStep.tsx](../../src/components/bulk-upload/PhotoSelectStep.tsx) | Found | None found | None found |
| [src/components/bulk-upload/SmartMatchStep.tsx](../../src/components/bulk-upload/SmartMatchStep.tsx) | Found | None found | None found |
| [src/components/bulk-upload/TextImportStep.tsx](../../src/components/bulk-upload/TextImportStep.tsx) | Found | None found | parse-show-notes |
| [src/components/bulk-upload/TextReviewStep.tsx](../../src/components/bulk-upload/TextReviewStep.tsx) | Found | None found | unified-search |
| [src/components/BulkUploadFlow.tsx](../../src/components/BulkUploadFlow.tsx) | Found | None found | None found |
| [src/components/CompareShowSheet.tsx](../../src/components/CompareShowSheet.tsx) | Found | show_tags, shows, show_artists, followers | None found |
| [src/components/DemoAddShowFlow.tsx](../../src/components/DemoAddShowFlow.tsx) | Found | None found | None found |
| [src/components/DemoBanner.tsx](../../src/components/DemoBanner.tsx) | Found | None found | None found |
| [src/components/DemoBulkUploadFlow.tsx](../../src/components/DemoBulkUploadFlow.tsx) | Found | None found | None found |
| [src/components/DemoHome.tsx](../../src/components/DemoHome.tsx) | Found | None found | None found |
| [src/components/DemoRank.tsx](../../src/components/DemoRank.tsx) | Found | None found | None found |
| [src/components/ErrorBoundary.tsx](../../src/components/ErrorBoundary.tsx) | Found | None found | None found |
| [src/components/feed/ShowRankBadge.tsx](../../src/components/feed/ShowRankBadge.tsx) | Found | None found | None found |
| [src/components/FeedbackSheet.tsx](../../src/components/FeedbackSheet.tsx) | Found | feature_requests | None found |
| [src/components/FriendsPanel.tsx](../../src/components/FriendsPanel.tsx) | Not found | None found | None found |
| [src/components/Home.tsx](../../src/components/Home.tsx) | Found | show_artists, show_rankings, show_comparisons, shows, show_tags | None found |
| [src/components/home/ContentPillNav.tsx](../../src/components/home/ContentPillNav.tsx) | Found | None found | None found |
| [src/components/home/DemoIncompleteTagsSheet.tsx](../../src/components/home/DemoIncompleteTagsSheet.tsx) | Found | None found | None found |
| [src/components/home/DemoMissingPhotosSheet.tsx](../../src/components/home/DemoMissingPhotosSheet.tsx) | Found | None found | None found |
| [src/components/home/DiscoveryCards.tsx](../../src/components/home/DiscoveryCards.tsx) | Not found | None found | None found |
| [src/components/home/DynamicInsight.tsx](../../src/components/home/DynamicInsight.tsx) | Found | None found | None found |
| [src/components/home/FocusedRankingSession.tsx](../../src/components/home/FocusedRankingSession.tsx) | Found | shows, show_rankings, show_comparisons, show_artists | None found |
| [src/components/home/FriendActivityFeed.tsx](../../src/components/home/FriendActivityFeed.tsx) | Found | None found | None found |
| [src/components/home/FriendsPanelView.tsx](../../src/components/home/FriendsPanelView.tsx) | Found | None found | None found |
| [src/components/home/FriendTeaser.tsx](../../src/components/home/FriendTeaser.tsx) | Found | None found | None found |
| [src/components/home/GroupShowPrompt.tsx](../../src/components/home/GroupShowPrompt.tsx) | Found | None found | None found |
| [src/components/home/HighlightReel.tsx](../../src/components/home/HighlightReel.tsx) | Not found | None found | None found |
| [src/components/home/IncompleteTagsSheet.tsx](../../src/components/home/IncompleteTagsSheet.tsx) | Found | show_tags, shows, show_artists | None found |
| [src/components/home/MissingPhotosSheet.tsx](../../src/components/home/MissingPhotosSheet.tsx) | Found | shows, show_artists, show-photos | None found |
| [src/components/home/PlanShowSheet.tsx](../../src/components/home/PlanShowSheet.tsx) | Found | show-photos | search-artists, parse-upcoming-show |
| [src/components/home/PopularFeedGrid.tsx](../../src/components/home/PopularFeedGrid.tsx) | Found | None found | None found |
| [src/components/home/PopularShowsGrid.tsx](../../src/components/home/PopularShowsGrid.tsx) | Not found | None found | None found |
| [src/components/home/RankingProgressCard.tsx](../../src/components/home/RankingProgressCard.tsx) | Found | None found | None found |
| [src/components/home/ScheduleView.tsx](../../src/components/home/ScheduleView.tsx) | Found | None found | None found |
| [src/components/home/StackedShowCard.tsx](../../src/components/home/StackedShowCard.tsx) | Found | None found | None found |
| [src/components/home/StackedShowList.tsx](../../src/components/home/StackedShowList.tsx) | Found | None found | None found |
| [src/components/home/StatPills.tsx](../../src/components/home/StatPills.tsx) | Found | None found | None found |
| [src/components/home/UpcomingShowDetailSheet.tsx](../../src/components/home/UpcomingShowDetailSheet.tsx) | Found | None found | None found |
| [src/components/home/WhatsNextStrip.tsx](../../src/components/home/WhatsNextStrip.tsx) | Found | None found | None found |
| [src/components/landing/CaptureShowcase.tsx](../../src/components/landing/CaptureShowcase.tsx) | Found | None found | None found |
| [src/components/landing/GlobeShowcase.tsx](../../src/components/landing/GlobeShowcase.tsx) | Found | None found | None found |
| [src/components/landing/LandingCTA.tsx](../../src/components/landing/LandingCTA.tsx) | Found | None found | None found |
| [src/components/landing/LandingGlobe.tsx](../../src/components/landing/LandingGlobe.tsx) | Found | None found | None found |
| [src/components/landing/LandingHero.tsx](../../src/components/landing/LandingHero.tsx) | Found | None found | None found |
| [src/components/landing/LogShowcase.tsx](../../src/components/landing/LogShowcase.tsx) | Found | None found | None found |
| [src/components/landing/PhoneMockup.tsx](../../src/components/landing/PhoneMockup.tsx) | Found | None found | None found |
| [src/components/landing/RankingSpotlight.tsx](../../src/components/landing/RankingSpotlight.tsx) | Found | None found | None found |
| [src/components/landing/ShareExperience.tsx](../../src/components/landing/ShareExperience.tsx) | Found | None found | None found |
| [src/components/landing/ShowInviteHero.tsx](../../src/components/landing/ShowInviteHero.tsx) | Found | None found | None found |
| [src/components/landing/v2/CaptureShowcaseV2.tsx](../../src/components/landing/v2/CaptureShowcaseV2.tsx) | Found | None found | None found |
| [src/components/landing/v2/GlobeShowcaseV2.tsx](../../src/components/landing/v2/GlobeShowcaseV2.tsx) | Found | None found | None found |
| [src/components/landing/v2/LandingCTAV2.tsx](../../src/components/landing/v2/LandingCTAV2.tsx) | Found | None found | None found |
| [src/components/landing/v2/LandingHeroV2.tsx](../../src/components/landing/v2/LandingHeroV2.tsx) | Found | None found | None found |
| [src/components/landing/v2/LazyGlobeShowcase.tsx](../../src/components/landing/v2/LazyGlobeShowcase.tsx) | Found | None found | None found |
| [src/components/landing/v2/LogShowcaseV2.tsx](../../src/components/landing/v2/LogShowcaseV2.tsx) | Found | None found | None found |
| [src/components/landing/v2/RankingSpotlightV2.tsx](../../src/components/landing/v2/RankingSpotlightV2.tsx) | Found | None found | None found |
| [src/components/landing/v2/ShareExperienceV2.tsx](../../src/components/landing/v2/ShareExperienceV2.tsx) | Found | None found | None found |
| [src/components/landing/WaitlistEmailInput.tsx](../../src/components/landing/WaitlistEmailInput.tsx) | Not found | waitlist | None found |
| [src/components/landing/WaitlistFollowUp.tsx](../../src/components/landing/WaitlistFollowUp.tsx) | Not found | None found | update-waitlist |
| [src/components/landing/WaitlistModal.tsx](../../src/components/landing/WaitlistModal.tsx) | Not found | None found | None found |
| [src/components/landing/WaitlistPhoneInput.tsx](../../src/components/landing/WaitlistPhoneInput.tsx) | Not found | waitlist | None found |
| [src/components/landing/WaitlistSignup.tsx](../../src/components/landing/WaitlistSignup.tsx) | Not found | None found | None found |
| [src/components/landing/WaitlistSuccess.tsx](../../src/components/landing/WaitlistSuccess.tsx) | Not found | None found | None found |
| [src/components/map/MapHoverCard.tsx](../../src/components/map/MapHoverCard.tsx) | Not found | None found | None found |
| [src/components/map/MapNavButton.tsx](../../src/components/map/MapNavButton.tsx) | Not found | None found | None found |
| [src/components/map/MapRightPanel.tsx](../../src/components/map/MapRightPanel.tsx) | Found | None found | None found |
| [src/components/map/MapStatsCard.tsx](../../src/components/map/MapStatsCard.tsx) | Found | None found | None found |
| [src/components/map/MapYearToggle.tsx](../../src/components/map/MapYearToggle.tsx) | Found | None found | None found |
| [src/components/MapView.tsx](../../src/components/MapView.tsx) | Found | profiles | backfill-venue-coordinates |
| [src/components/NavLink.tsx](../../src/components/NavLink.tsx) | Not found | None found | None found |
| [src/components/onboarding/FloatingTourTarget.tsx](../../src/components/onboarding/FloatingTourTarget.tsx) | Found | None found | None found |
| [src/components/onboarding/PushNotificationInterstitial.tsx](../../src/components/onboarding/PushNotificationInterstitial.tsx) | Found | profiles | None found |
| [src/components/onboarding/SpotlightTour.tsx](../../src/components/onboarding/SpotlightTour.tsx) | Found | None found | None found |
| [src/components/onboarding/WelcomeCarousel.tsx](../../src/components/onboarding/WelcomeCarousel.tsx) | Found | None found | None found |
| [src/components/PhotoOverlayEditor.tsx](../../src/components/PhotoOverlayEditor.tsx) | Found | profiles, show-photos, shows | None found |
| [src/components/Profile.tsx](../../src/components/Profile.tsx) | Found | show_rankings, shows, show_artists, profiles, show-photos | get_referral_rank |
| [src/components/profile/FindFriendsSheet.tsx](../../src/components/profile/FindFriendsSheet.tsx) | Found | profiles | None found |
| [src/components/pwa/InstallBanner.tsx](../../src/components/pwa/InstallBanner.tsx) | Found | None found | None found |
| [src/components/QuickPhotoAddSheet.tsx](../../src/components/QuickPhotoAddSheet.tsx) | Found | show-photos, shows | None found |
| [src/components/Rank.tsx](../../src/components/Rank.tsx) | Found | shows, show_rankings, show_comparisons, show_artists | None found |
| [src/components/rankings/RankingCard.tsx](../../src/components/rankings/RankingCard.tsx) | Found | None found | None found |
| [src/components/rankings/RankingProgressBar.tsx](../../src/components/rankings/RankingProgressBar.tsx) | Found | None found | None found |
| [src/components/rankings/ShowsBarChart.tsx](../../src/components/rankings/ShowsBarChart.tsx) | Found | None found | None found |
| [src/components/rankings/SwipeableRankingCard.tsx](../../src/components/rankings/SwipeableRankingCard.tsx) | Found | None found | None found |
| [src/components/show-review/HeroPhotoSection.tsx](../../src/components/show-review/HeroPhotoSection.tsx) | Found | None found | None found |
| [src/components/show-review/NotesQuoteCard.tsx](../../src/components/show-review/NotesQuoteCard.tsx) | Found | None found | None found |
| [src/components/ShowReviewSheet.tsx](../../src/components/ShowReviewSheet.tsx) | Found | show-photos, shows | None found |
| [src/components/ui/accordion.tsx](../../src/components/ui/accordion.tsx) | Not found | None found | None found |
| [src/components/ui/alert-dialog.tsx](../../src/components/ui/alert-dialog.tsx) | Found | None found | None found |
| [src/components/ui/alert.tsx](../../src/components/ui/alert.tsx) | Not found | None found | None found |
| [src/components/ui/aspect-ratio.tsx](../../src/components/ui/aspect-ratio.tsx) | Not found | None found | None found |
| [src/components/ui/avatar.tsx](../../src/components/ui/avatar.tsx) | Found | None found | None found |
| [src/components/ui/badge.tsx](../../src/components/ui/badge.tsx) | Found | None found | None found |
| [src/components/ui/BrandedLoader.tsx](../../src/components/ui/BrandedLoader.tsx) | Found | app_settings, loading_quotes | None found |
| [src/components/ui/breadcrumb.tsx](../../src/components/ui/breadcrumb.tsx) | Not found | None found | None found |
| [src/components/ui/button.tsx](../../src/components/ui/button.tsx) | Found | None found | None found |
| [src/components/ui/calendar.tsx](../../src/components/ui/calendar.tsx) | Found | None found | None found |
| [src/components/ui/card.tsx](../../src/components/ui/card.tsx) | Found | None found | None found |
| [src/components/ui/carousel.tsx](../../src/components/ui/carousel.tsx) | Not found | None found | None found |
| [src/components/ui/chart.tsx](../../src/components/ui/chart.tsx) | Not found | None found | None found |
| [src/components/ui/checkbox.tsx](../../src/components/ui/checkbox.tsx) | Found | None found | None found |
| [src/components/ui/collapsible.tsx](../../src/components/ui/collapsible.tsx) | Found | None found | None found |
| [src/components/ui/command.tsx](../../src/components/ui/command.tsx) | Not found | None found | None found |
| [src/components/ui/ConfirmationRing.tsx](../../src/components/ui/ConfirmationRing.tsx) | Found | None found | None found |
| [src/components/ui/context-menu.tsx](../../src/components/ui/context-menu.tsx) | Not found | None found | None found |
| [src/components/ui/dialog.tsx](../../src/components/ui/dialog.tsx) | Found | None found | None found |
| [src/components/ui/drawer.tsx](../../src/components/ui/drawer.tsx) | Found | None found | None found |
| [src/components/ui/dropdown-menu.tsx](../../src/components/ui/dropdown-menu.tsx) | Found | None found | None found |
| [src/components/ui/DynamicIslandOverlay.tsx](../../src/components/ui/DynamicIslandOverlay.tsx) | Found | None found | None found |
| [src/components/ui/form.tsx](../../src/components/ui/form.tsx) | Not found | None found | None found |
| [src/components/ui/hover-card.tsx](../../src/components/ui/hover-card.tsx) | Not found | None found | None found |
| [src/components/ui/input-otp.tsx](../../src/components/ui/input-otp.tsx) | Not found | None found | None found |
| [src/components/ui/input.tsx](../../src/components/ui/input.tsx) | Found | None found | None found |
| [src/components/ui/label.tsx](../../src/components/ui/label.tsx) | Found | None found | None found |
| [src/components/ui/menubar.tsx](../../src/components/ui/menubar.tsx) | Not found | None found | None found |
| [src/components/ui/navigation-menu.tsx](../../src/components/ui/navigation-menu.tsx) | Not found | None found | None found |
| [src/components/ui/pagination.tsx](../../src/components/ui/pagination.tsx) | Not found | None found | None found |
| [src/components/ui/popover.tsx](../../src/components/ui/popover.tsx) | Found | None found | None found |
| [src/components/ui/progress.tsx](../../src/components/ui/progress.tsx) | Found | None found | None found |
| [src/components/ui/radio-group.tsx](../../src/components/ui/radio-group.tsx) | Not found | None found | None found |
| [src/components/ui/resizable.tsx](../../src/components/ui/resizable.tsx) | Not found | None found | None found |
| [src/components/ui/SceneLogo.tsx](../../src/components/ui/SceneLogo.tsx) | Found | None found | None found |
| [src/components/ui/scroll-area.tsx](../../src/components/ui/scroll-area.tsx) | Found | None found | None found |
| [src/components/ui/select.tsx](../../src/components/ui/select.tsx) | Found | None found | None found |
| [src/components/ui/separator.tsx](../../src/components/ui/separator.tsx) | Not found | None found | None found |
| [src/components/ui/sheet.tsx](../../src/components/ui/sheet.tsx) | Found | None found | None found |
| [src/components/ui/sidebar.tsx](../../src/components/ui/sidebar.tsx) | Not found | None found | None found |
| [src/components/ui/skeleton.tsx](../../src/components/ui/skeleton.tsx) | Found | None found | None found |
| [src/components/ui/slider.tsx](../../src/components/ui/slider.tsx) | Found | None found | None found |
| [src/components/ui/sonner.tsx](../../src/components/ui/sonner.tsx) | Found | None found | None found |
| [src/components/ui/switch.tsx](../../src/components/ui/switch.tsx) | Found | None found | None found |
| [src/components/ui/table.tsx](../../src/components/ui/table.tsx) | Found | None found | None found |
| [src/components/ui/tabs.tsx](../../src/components/ui/tabs.tsx) | Found | None found | None found |
| [src/components/ui/textarea.tsx](../../src/components/ui/textarea.tsx) | Found | None found | None found |
| [src/components/ui/toast.tsx](../../src/components/ui/toast.tsx) | Found | None found | None found |
| [src/components/ui/toaster.tsx](../../src/components/ui/toaster.tsx) | Found | None found | None found |
| [src/components/ui/toggle-group.tsx](../../src/components/ui/toggle-group.tsx) | Not found | None found | None found |
| [src/components/ui/toggle.tsx](../../src/components/ui/toggle.tsx) | Not found | None found | None found |
| [src/components/ui/tooltip.tsx](../../src/components/ui/tooltip.tsx) | Found | None found | None found |
| [src/components/ui/use-toast.ts](../../src/components/ui/use-toast.ts) | Not found | None found | None found |
| [src/contexts/DemoContext.tsx](../../src/contexts/DemoContext.tsx) | Found | None found | None found |
| [src/hooks/use-mobile.tsx](../../src/hooks/use-mobile.tsx) | Not found | None found | None found |
| [src/hooks/use-toast.ts](../../src/hooks/use-toast.ts) | Found | None found | None found |
| [src/hooks/useAdminCheck.ts](../../src/hooks/useAdminCheck.ts) | Found | user_roles | None found |
| [src/hooks/useBugReportPrompt.ts](../../src/hooks/useBugReportPrompt.ts) | Found | None found | None found |
| [src/hooks/useBulkShowUpload.ts](../../src/hooks/useBulkShowUpload.ts) | Found | venues, show-photos, shows, show_artists, show_tags, user_venues | None found |
| [src/hooks/useContactsLookup.ts](../../src/hooks/useContactsLookup.ts) | Found | profiles | None found |
| [src/hooks/useDemoBulkUpload.ts](../../src/hooks/useDemoBulkUpload.ts) | Found | None found | None found |
| [src/hooks/useDemoData.ts](../../src/hooks/useDemoData.ts) | Found | None found | get-demo-data |
| [src/hooks/useFollowers.ts](../../src/hooks/useFollowers.ts) | Found | followers, profiles | None found |
| [src/hooks/useFriendActivity.ts](../../src/hooks/useFriendActivity.ts) | Found | profiles, upcoming_shows, shows, show_artists, show_rankings | None found |
| [src/hooks/useFriendUpcomingShows.ts](../../src/hooks/useFriendUpcomingShows.ts) | Found | upcoming_shows, profiles | None found |
| [src/hooks/useHomeStats.ts](../../src/hooks/useHomeStats.ts) | Found | shows, show_tags, show_rankings, show_artists, profiles | None found |
| [src/hooks/useMultiTouchTransform.ts](../../src/hooks/useMultiTouchTransform.ts) | Found | None found | None found |
| [src/hooks/usePlanUpcomingShow.ts](../../src/hooks/usePlanUpcomingShow.ts) | Found | followers, profiles | parse-upcoming-show |
| [src/hooks/usePopularNearMe.ts](../../src/hooks/usePopularNearMe.ts) | Found | profiles, venues, shows, show_artists | None found |
| [src/hooks/usePopularShows.ts](../../src/hooks/usePopularShows.ts) | Found | shows, show_artists | None found |
| [src/hooks/useProfileSearch.ts](../../src/hooks/useProfileSearch.ts) | Found | profiles | None found |
| [src/hooks/usePushSubscription.ts](../../src/hooks/usePushSubscription.ts) | Found | push_subscriptions | None found |
| [src/hooks/useRankingConfirmation.ts](../../src/hooks/useRankingConfirmation.ts) | Not found | shows, show_rankings | None found |
| [src/hooks/useReferralCapture.ts](../../src/hooks/useReferralCapture.ts) | Found | None found | None found |
| [src/hooks/useShareShow.ts](../../src/hooks/useShareShow.ts) | Found | profiles | None found |
| [src/hooks/useSlowLoadDetector.ts](../../src/hooks/useSlowLoadDetector.ts) | Found | None found | None found |
| [src/hooks/useTextImportUpload.ts](../../src/hooks/useTextImportUpload.ts) | Found | venues, shows, show_artists, user_venues | None found |
| [src/hooks/useVenueFromLocation.ts](../../src/hooks/useVenueFromLocation.ts) | Found | None found | match-venue-from-location |
| [src/integrations/supabase/client.ts](../../src/integrations/supabase/client.ts) | Found | None found | None found |
| [src/integrations/supabase/types.ts](../../src/integrations/supabase/types.ts) | Found | None found | None found |
| [src/lib/bug-screenshot.ts](../../src/lib/bug-screenshot.ts) | Found | bug-screenshots | None found |
| [src/lib/exif-utils.ts](../../src/lib/exif-utils.ts) | Found | None found | None found |
| [src/lib/globe-arc-utils.ts](../../src/lib/globe-arc-utils.ts) | Found | None found | None found |
| [src/lib/push-constants.ts](../../src/lib/push-constants.ts) | Found | None found | None found |
| [src/lib/smart-pairing.ts](../../src/lib/smart-pairing.ts) | Found | None found | None found |
| [src/lib/tag-constants.ts](../../src/lib/tag-constants.ts) | Found | None found | None found |
| [src/lib/utils.ts](../../src/lib/utils.ts) | Found | None found | None found |
| [src/main.tsx](../../src/main.tsx) | Found | None found | None found |
| [src/pages/Admin.tsx](../../src/pages/Admin.tsx) | Found | None found | None found |
| [src/pages/Auth.tsx](../../src/pages/Auth.tsx) | Found | profiles, referrals | None found |
| [src/pages/AuthCallback.tsx](../../src/pages/AuthCallback.tsx) | Found | None found | None found |
| [src/pages/Dashboard.tsx](../../src/pages/Dashboard.tsx) | Found | profiles | None found |
| [src/pages/Demo.tsx](../../src/pages/Demo.tsx) | Found | None found | None found |
| [src/pages/Index.tsx](../../src/pages/Index.tsx) | Found | None found | None found |
| [src/pages/IndexV2.tsx](../../src/pages/IndexV2.tsx) | Found | None found | None found |
| [src/pages/Install.tsx](../../src/pages/Install.tsx) | Found | None found | None found |
| [src/pages/NotFound.tsx](../../src/pages/NotFound.tsx) | Found | None found | None found |
| [src/vite-env.d.ts](../../src/vite-env.d.ts) | Not found | None found | None found |
