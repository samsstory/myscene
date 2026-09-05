# Scene whole-app inventory and preservation map

Date: 2026-09-05
Status: Code-backed inventory and signed-in screen inspection complete. Write-path, multi-account privacy, full live-backend and physical-device verification remain open.

Runtime update: the [runtime walkthrough](2026-09-05-runtime-walkthrough.md) records public/demo failures and 14 signed-in screen checks. Collection, detail, matchup presentation, profile and operator shell render. New findings include sample friends inside signed-in surfaces and automatic ranking initialization on screen entry. Physical-device and save-path checks remain open.

## Executive decision

Inventory the whole existing app before choosing a migration slice. Scene already contains substantial product work. A native client is a new presentation and device-integration layer, not permission to discard the existing product or recreate every capability.

This report supersedes the scope classification in the [July preliminary inventory](2026-07-27-existing-feature-inventory.md). The [alpha recovery plan](../plans/2026-07-26-scene-alpha-recovery-plan.md) remains authoritative for product intent. Conflicts identified below require resolution before implementation, not silent reinterpretation.

Recommended treatment: preserve the full legacy application, extract validated domain rules, reshape alpha capabilities around the approved experience, retain operator tools on web, and park deferred capabilities intact. No deletion, deployment, data migration, or source refactor is authorized by this report.

## Evidence and limits

- Inspected all 216 TypeScript/TSX source modules through a parser-generated import/resource index; traced major screens, hooks, shared logic, and their data dependencies. See the [complete source coverage index](2026-09-05-source-coverage-index.md).
- Identified eight explicit routes plus fallback, 170 component modules including 53 UI modules, 24 hooks, seven libraries, nine pages, 22 generated public tables, 50 legacy migrations, and 16 Edge Function directories.
- Reviewed package/configuration surfaces, native shell, existing audits, visual decisions, and product plans.
- Ran the current web build, lint analysis, and application TypeScript check. Results appear below.
- Did not query customer records, change a backend, verify deployed policies, inspect provider billing, or exercise signed-in user flows. Source presence is not proof of production functionality.

Legend: **Wired** means a static import path and relevant orchestration were found; it does not mean tested. **Partial** means existing behavior falls short of the planned capability. **Dormant** means no static import path from the app entry was found, not that deletion is safe. **New** means no implementation of the required behavior was found in this review. Treatment is a recommendation, not an approved scope change.

## 1. Entry, identity, and onboarding

| Capability | Current implementation and evidence | Status / recommended treatment |
| --- | --- | --- |
| Public marketing | `/` uses [IndexV2](../../src/pages/IndexV2.tsx), with capture, collection, ranking, sharing, and globe sections. `/landing-v1` retains [Index](../../src/pages/Index.tsx). | Wired. Keep public web; update styling/content only when needed. |
| Show invitation landing | [ShowInviteHero](../../src/components/landing/ShowInviteHero.tsx) handles logged/upcoming show previews, referral context, highlights, and a personal note. Preview is loaded by RPC. | Wired, partial alpha invitation. Retain landing/deep-link concepts; verify exactly what anonymous visitors can read. |
| Email/password account access | [Auth](../../src/pages/Auth.tsx) signs up/signs in, handles redirects, and records referrals. | Wired. Preserve legacy access; define mobile identity separately. |
| Email magic-link continuation | Invite hero and [AuthCallback](../../src/pages/AuthCallback.tsx) restore local browser invitation state after authentication, with a fallback timer. | Wired. Rework for native link/lifecycle handling; browser localStorage is not a mobile persistence contract. |
| Referral attribution | [useReferralCapture](../../src/hooks/useReferralCapture.ts) captures query parameters; referral records power inviter reporting. | Wired. Reuse attribution intent with explicit event definitions and retry behavior. |
| Guided onboarding | [Dashboard](../../src/pages/Dashboard.tsx), WelcomeCarousel, SpotlightTour, floating targets, and profile onboarding state. | Wired branches. Existing completion semantics differ from guest-first alpha; preserve learned guidance, redesign sequence. |
| Interactive demo | [Demo](../../src/pages/Demo.tsx), [DemoContext](../../src/contexts/DemoContext.tsx), DemoHome/Rank/Add/Bulk provide temporary interactions, including a five-show limit. | Wired. Keep useful demonstration tools. In-memory demo additions are not durable guest memories. |
| Guest-first capture and Apple sign-in | No durable anonymous memory-to-account transfer or Sign in with Apple implementation found. | New alpha behavior. Must preserve the first memory through authentication, retries, and app restarts. |
| Personal invitation funnel | Existing show sharing/referrals are not the full under-30-second personalized invitation and recipient conversion workflow in the plan. | Partial. Extend deliberately; do not count a share URL as a complete funnel. |

All route declarations are in [App](../../src/App.tsx): `/`, `/landing-v1`, `/auth`, `/dashboard`, `/demo`, `/install`, `/admin`, `/auth/callback`, and fallback. Dashboard navigation additionally exposes collection/home, schedule, shows/rankings, H2H, friends, globe, and profile.

## 2. Capture, search, and enrichment

| Capability | Current implementation and evidence | Status / recommended treatment |
| --- | --- | --- |
| Manual show capture/edit | [AddShowFlow](../../src/components/AddShowFlow.tsx): set/show/festival types, artist, venue, date, highlights, notes, edit, success, optional comparison/photo/share. | Wired. Preserve behavior and edge-case knowledge; replace UI and unsafe multi-step persistence. |
| Unified search and manual fallback | [UnifiedSearchStep](../../src/components/add-show-steps/UnifiedSearchStep.tsx), ArtistsStep, VenueStep combine artist/venue/event entry with manual alternatives. | Wired. High-value reuse candidate behind a documented search contract. |
| Multiple performers and headliner | Artist step plus `show_artists`; headliner and supporting acts carried through entry/review. | Wired. Preserve rather than reducing every memory to a single artist. |
| Date precision | [DateStep](../../src/components/add-show-steps/DateStep.tsx) and CompactDateSelector support exact and approximate dates. Year-only/unknown values can use placeholder calendar dates. | Wired with modeling risk. Preserve uncertainty; never silently present a placeholder as an exact attendance date. |
| Highlights and notes | [RatingStep](../../src/components/add-show-steps/RatingStep.tsx) currently collects highlight tags and notes, not an active star-rating input. [tag-constants](../../src/lib/tag-constants.ts) holds taxonomy. | Wired. Reuse taxonomy/validation selectively. Legacy rating columns do not prove current rating UX. |
| Grouped shows and sets | Parent show IDs, same-venue/date grouping, GroupShowPrompt, StackedShowList/Card. | Wired. Preserve grouping semantics; distinguish canonical performance facts from a user's memory. |
| Photo batch import | [BulkUploadFlow](../../src/components/BulkUploadFlow.tsx): select, extract metadata, match, review/edit, upload, success. | Wired. Preserve future capability; do not force bulk import into the first alpha session. |
| EXIF date/location matching | [exif-utils](../../src/lib/exif-utils.ts), useVenueFromLocation, SmartMatchStep. | Wired. Retain matching knowledge. Adapt browser File/object URL APIs and consent to native. |
| Text import | TextImportStep/TextReviewStep, [useTextImportUpload](../../src/hooks/useTextImportUpload.ts), parse-show-notes. | Wired. Preserve reviewed AI extraction workflow; validate model output, provider availability, and cost controls before reuse. |
| Batch persistence and progress | [useBulkShowUpload](../../src/hooks/useBulkShowUpload.ts) compresses/uploads photos, then sequentially writes show relationships and progress. | Wired with partial-failure risk. Keep review/progress UX; redesign retry/idempotency and orphan cleanup. |

Manual edits can delete/reinsert artists or tags in separate requests. Batch uploads can leave media or incomplete relational records if a later step fails. Mobile must not inherit those operations unchanged. Several date save paths use UTC conversion on calendar dates, requiring timezone tests.

## 3. Photos, memories, and sharing

| Capability | Current implementation and evidence | Status / recommended treatment |
| --- | --- | --- |
| Show review and repair | [ShowReviewSheet](../../src/components/ShowReviewSheet.tsx), HeroPhotoSection, NotesQuoteCard, incomplete-tag and missing-photo sheets. | Wired. Preserve detail, repair, and optional-photo concepts. |
| Photo attach/replace/decline | [QuickPhotoAddSheet](../../src/components/QuickPhotoAddSheet.tsx), MissingPhotosSheet and upload hooks. | Wired. Adapt picker/compression/storage privacy; preserve explicit no-photo state. |
| Share-image composition | [PhotoOverlayEditor](../../src/components/PhotoOverlayEditor.tsx): move/resize/rotate overlays, ranking/time filters, colors, opacity, image replacement. | Wired. Substantial product work worth preserving; DOM/canvas rendering and gestures need native adaptation. |
| Image export/share | Editor uses html2canvas, PNG download and browser file sharing/fallback. | Wired. This is not direct Instagram publishing. Define native share-sheet and export quality tests. |
| Show-link sharing | [useShareShow](../../src/hooks/useShareShow.ts) and invite hero create/consume show links. | Wired, partial alpha sharing. Introduce deliberate artifact visibility/revocation after privacy decision. |
| “I was there too” / quick-add | [CompareShowSheet](../../src/components/CompareShowSheet.tsx) and Home prefill copy event facts into a recipient's own show with their own notes/tags. | Wired, partial. Preserve user-value pattern and test that no original personal content is copied. |
| Branded recap and Top 10 reveal | Existing ranked views and image overlays provide ingredients, not the full staged reveal/share-page contract. | Partial. Build around approved Electric Canon, with sharing available while rankings settle. |

The existing custom-photo upload paths use public URLs. Source history is evidence of the legacy design, not a live policy verdict. Media privacy needs explicit tests against the intended backend before carrying these paths into alpha.

## 4. Collection, ranking, and profile

| Capability | Current implementation and evidence | Status / recommended treatment |
| --- | --- | --- |
| Collection navigation and filtering | [Home](../../src/components/Home.tsx) supports chronology/rank sorting, type/time/search filters, incomplete items, and grouped shows. | Wired. Preserve requirements and data behavior; compose smaller native screens. |
| Calendar/history | [ScheduleView](../../src/components/home/ScheduleView.tsx) combines month/day history, future plans and friends. | Wired. Retain; separate core collection need from deferred planning scope. |
| Collection insights | [useHomeStats](../../src/hooks/useHomeStats.ts), StatPills, DynamicInsight, WhatsNextStrip: counts, cities/countries, streaks, top shows, and completion prompts. | Wired. Reuse verified calculations. Some percentile buckets are hard-coded, not measured population statistics. |
| Head-to-head ranking | [Rank](../../src/components/Rank.tsx), FocusedRankingSession, QuickCompareStep, show_comparisons/show_rankings. | Wired. Valuable domain base; consolidate rules and make result recording atomic/idempotent. |
| Smart pairing | [smart-pairing](../../src/lib/smart-pairing.ts) uses comparison history, transitive paths, score proximity, uncertainty, and anchor selection. | Wired, portable candidate. Protect with deterministic fixtures before extraction; efficiency claims in comments are not benchmark evidence. |
| Focused ranking and skips | FocusedRankingSession targets under-ranked shows; skipped comparisons can have no winner. | Wired. Preserve intent and specify skip/retry semantics. |
| Ranking confidence | Progress indicators derive largely from comparison counts/caps. | Partial. Activity progress is not calibrated statistical confidence. Validate wording and alpha settling rules. |
| Five/ten-show milestones and ranking debt | Existing ranking can begin with two shows; no complete five/ten-show unlock, persistent debt, and settling/shareability implementation found. | New/partial alpha domain behavior. Do not label current H2H as already satisfying the plan. |
| Profile and top rankings | [Profile](../../src/components/Profile.tsx) includes identity/avatar editing, counts, top rankings, following and profile-related actions. | Wired. Preserve useful information architecture, rebuild native presentation. |
| Public/private/hidden-show controls | No complete planned profile visibility and per-show eye behavior found. | New, decision blocked. Resolve product/privacy conflict below before schema design. |
| Account export/deletion | No complete user-facing export/deletion flow found in reviewed source. | Gap. Define retention and recovery semantics; do not imply current compliance. |

Ranking formulas currently live in multiple screens. Main/focused ranking and quick comparison do not use identical update rules. Inserting a comparison and updating rankings are separate writes. Tests must cover duplicate submissions, invalid ownership/winner, skips, offline retries and concurrent devices before reuse.

## 5. Friends, discovery, plans, and maps

| Capability | Current implementation and evidence | Status / recommended treatment |
| --- | --- | --- |
| Find people and follow | [FindFriendsSheet](../../src/components/profile/FindFriendsSheet.tsx), useProfileSearch, [useFollowers](../../src/hooks/useFollowers.ts). | Wired. Current relationship is directed following, not automatically accepted invitation connection. Reshape for alpha direct relationships. |
| Contact lookup | [useContactsLookup](../../src/hooks/useContactsLookup.ts) reads device/browser contact selections and matches profile phone information. | Wired call path. Preserve code, defer permission request and redesign lookup privacy before reuse. |
| Friend activity | FriendsPanelView, FriendActivityFeed, [useFriendActivity](../../src/hooks/useFriendActivity.ts) show logged/planned activity and prioritization. | Wired. Retain for later; broad feed is not required to deliver direct friend comparison. |
| Friend upcoming/calendar | useFriendUpcomingShows and ScheduleView. | Wired. Preserve deferred planning/social capability. |
| Popular shows and nearby discovery | [usePopularShows](../../src/hooks/usePopularShows.ts), usePopularNearMe, PopularFeedGrid aggregate show/artist/event activity and nearby venues. | Wired. Preserve but defer broad discovery; broad fetch/client aggregation needs scale and privacy review. |
| Future-show planning | [PlanShowSheet](../../src/components/home/PlanShowSheet.tsx): manual/photo/text/URL entry; [usePlanUpcomingShow](../../src/hooks/usePlanUpcomingShow.ts): save/delete/RSVP/realtime; UpcomingShowDetailSheet: edit/ticket links. | Wired. Substantial separate product surface, parked intact rather than erased. |
| Per-show highlight comparison | CompareShowSheet compares highlights around one show. | Wired. Useful existing interaction, not the planned overall Scene Match. |
| Scene Match and overlap | No complete immediate overlap plus provisional five-ranked-each/full ten-ranked-each comparison flow found. | New alpha requirement. Keep this distinct from a general social feed. |
| Personal concert map | [MapView](../../src/components/MapView.tsx): Mapbox photo markers/clustering, venue groups, filters, panels and statistics. | Wired. Preserve existing map investment; browser implementation is not drop-in React Native. |
| Globe storytelling | LandingGlobe and [globe-arc-utils](../../src/lib/globe-arc-utils.ts) provide marketing globe/arc behavior with demonstration journeys. | Wired. Separate reusable geometry from synthetic data. Constellation remains deferred, not a replacement mandate. |

## 6. Operations and support

Keep these on web unless a mobile user-facing requirement specifically needs an adapter.

| Capability | Current implementation and evidence | Status / recommended treatment |
| --- | --- | --- |
| Feedback collection | [FeedbackSheet](../../src/components/FeedbackSheet.tsx): bug/feature forms, validation, user/device/page context, screenshot. | Wired. Preserve one support workflow. Screenshot currently captures/uploads on bug selection, before final submission; cancellation/redaction/consent need repair. |
| Error/slow-load prompting | [ErrorBoundary](../../src/components/ErrorBoundary.tsx), useSlowLoadDetector, useBugReportPrompt, BugPromptBanner. | Wired. Preserve useful context/prompt patterns; not a complete production crash-monitoring system. |
| Bug and feature triage | Admin BugReportsTab and FeatureRequestsTab support status/review/archival. | Wired. Retain operator tools; verify role enforcement with backend tests. |
| Waitlist administration | WaitlistTab, manual add, approval, resend and edit dialogs; admin-list-waitlist/approve-waitlist/resend-notification/update-waitlist functions. | Wired. Public waitlist entry is dormant, but these operator actions are not. Preserve and harden. |
| User administration | UsersTab plus admin-list-users combines profile, account and collection information; targeted push actions. | Wired. Preserve server-authorized web operations. |
| Inviter reporting | InvitersTab aggregates referral outcomes and communication actions. | Wired. Reuse reporting concepts; add explicit alpha funnel semantics rather than assuming coverage. |
| Announcements and templates | AnnouncementsPanel, EmailTemplateEditor/Preview, PushNotificationsPanel. Email and web-push workflows; SMS is a disabled “Soon” surface. | Wired/partial. Keep web. Do not advertise SMS as implemented or emailed credentials as an alpha auth design. |
| Branded loading content | QuotesTab manages loading_quotes and app_settings consumed by BrandedLoader. | Wired. Preserve content controls if they improve the new experience. |
| Notification bell/inbox | Dashboard bell displays “No notifications yet” without a working inbox action. | Placeholder. Do not count as a notification center. |

## 7. Platform and integration inventory

### Client/platform

- Existing client: React/Vite, React Router, React Query, Tailwind/Radix UI and browser libraries. Keep platform-neutral models/validation/calculations where appropriate. CSS components, DOM gestures, HTML screenshotting, browser contacts, Mapbox GL and Web Push need adapters or new native presentation.
- PWA: InstallBanner, Install page, manifest/service-worker configuration and web-push worker. Supabase response caching requires account-switch/offline review; this review does not prove a cross-account leak.
- Capacitor/iOS shell exists alongside changed package files. Prior audit identifies a shell/package-version mismatch. This is not a verified native release foundation. No Expo application or Android application source was found in this inventory.
- Assets/visual decisions: approved Electric Canon reference and existing logo/photo/marketing assets remain useful. Font/image licensing and provenance were not audited.
- The root repository is dirty, including untracked docs and iOS work. “Files preserved locally” does not mean a reviewed, recoverable Git checkpoint exists.

### Edge Functions: all 16 source directories

| Function(s) | Purpose / external dependencies | Reuse gate |
| --- | --- | --- |
| `admin-list-users`, `admin-list-waitlist` | Privileged account/waitlist reporting; source has user/role checks. | Keep web; test authorized/unauthorized cases. |
| `approve-waitlist`, `resend-notification` | Account/invite email operations using Resend; source has role checks. | Keep operator knowledge; revisit credential/email templates and retry semantics. |
| `update-waitlist` | Service-role update by supplied record identifier. | No internal caller authentication found; verify deployed protections and repair before reuse. |
| `send-push-notification`, `broadcast-push-notification` | Web Push/VAPID and delivery logs; claim/role checks in source. | Preserve web path; not APNs/FCM native delivery. |
| `get-demo-data` | Service-role access to a fixed legacy user's show dataset. | Verify intended public fields and replace with safe fixtures if needed. |
| `search-artists` | Spotify artist enrichment. | Caller authorization/quota and provider credentials need review. |
| `unified-search` | Spotify, Google Places, Foursquare and local history/events. Optional authenticated personalization. | Define permitted anonymous behavior and cost/rate limits. |
| `search-venues` | Authenticated search with local history, Foursquare and Google Places. | Preserve relevance logic; review response minimization and caching. |
| `match-venue-from-location` | Google Places and cached venues using submitted coordinates. | No internal caller auth found; review location retention and spend protection. |
| `parse-show-notes`, `parse-upcoming-show` | Lovable AI gateway and Spotify enrichment. | No internal caller auth found; validate outputs, limits and provider independence. |
| `backfill-artist-images` | Service-role artist repair with Spotify. | No internal caller auth found. Verify deployed access before using privileged repair. |
| `backfill-venue-coordinates` | Authenticated venue repair using Mapbox and service access. | Limit scope, audit mutations, and test ownership. |

Source: [function directories](../../supabase/functions), [configuration](../../supabase/config.toml). Gateway settings and internal authorization must be considered together. A missing internal check is not by itself proof of a publicly exploitable deployed endpoint. No vendor account, quota, billing, credential or deployment status was verified here. No direct Firecrawl call was found in the inspected application code.

### Legacy data coverage

The [generated types](../../src/integrations/supabase/types.ts) and [50 migration files](../../supabase/migrations) describe legacy intent, not a verified deployed state or the new alpha contract.

| Domain | Public tables represented in generated types |
| --- | --- |
| Identity / relationships | `profiles`, `user_roles`, `followers`, `referrals` |
| Concert collection | `shows`, `show_artists`, `show_tags`, `venues`, `events`, `user_venues` |
| Ranking | `show_comparisons`, `show_rankings` |
| Planning / enrichment | `upcoming_shows`, `artist_associations`, `venue_artist_popularity` |
| Support / entry | `bug_reports`, `feature_requests`, `waitlist` |
| Delivery / content | `push_subscriptions`, `push_notification_logs`, `loading_quotes`, `app_settings` |

Storage paths include `show-photos` (also used for avatars) and `bug-screenshots`. Important RPCs include logged/upcoming invite previews, mutual followers, referral rank/code generation, and role checks. Database triggers and grants are part of any migration contract, not just table columns.

Do not run a routine root `supabase db push` toward the owned alpha project: this repository contains the legacy migration chain. First define an isolated, reviewed alpha migration/configuration path. No data transfer or legacy retirement has been performed by this review.

## 8. Dormant and misleading surfaces

No import path from `src/main.tsx` was found for the older public waitlist component family, FriendsPanel, BugReportButton, NavLink, DiscoveryCards, HighlightReel, PopularShowsGrid, MapHoverCard, MapNavButton, and useRankingConfirmation. Generic unused UI/helpers also appear in the coverage appendix.

These remain preserved. Static analysis cannot establish business obsolescence. An imported branch can also be unavailable at runtime. In particular:

- Waitlist administration still calls backend functions despite dormant public signup components.
- FriendsPanelView is wired even though FriendsPanel is not.
- Ranking progress remains in active screens even though useRankingConfirmation is dormant.
- Demo interactions are not equivalent to persisted guest onboarding.
- A per-show comparison is not Scene Match; a bell is not an inbox; file sharing is not direct social publishing.

## 9. Decisions that must be reconciled before implementation

| Conflict | Why it matters | Required resolution |
| --- | --- | --- |
| Alpha plan allows public-default profiles/inherited show visibility; later AGENTS/constitution says private-default memories and narrow share artifacts. | Changes data policy, invite pages, comparison and user expectations. | Sam explicitly chooses the intended product behavior; then align all documents and privacy tests. Do not silently choose during schema work. |
| Alpha includes direct connections, immediate overlap and staged Scene Match; shorthand “defer social” can hide them. | Could ship the wrong core product. | Keep direct friend comparison in alpha planning; defer broad feed/discovery/contact sync separately. |
| Plan preserves existing users/data with additive migration; an owned backend is now intended for alpha. | Linking a project is not a migration or permission to reset users. | Document controlled import/transition/recovery after live ownership/access verification. Preserve old data in the meantime. |
| Preliminary inventory calls generated legacy types the source of truth. | Could import legacy schema/privacy issues wholesale. | Treat them as legacy evidence; new alpha contracts and reviewed migrations define new truth. |
| Engineering standards exist as documents, but enforcement is incomplete. | A written quality bar can create false confidence. | Add test/CI/type gates incrementally around chosen work; do not claim governance is already enforced. |

## 10. Verified technical baseline

| Check | Result on 2026-09-05 | What it establishes |
| --- | --- | --- |
| `npm run build` | PASS; 3,288 modules transformed. Large-chunk warnings. Mapbox chunk about 1.66 MB raw/461 kB gzip, index 552/147 kB, Dashboard 474/127 kB. | Existing web code bundles. Does not typecheck, test authorization, or prove user flows. |
| ESLint JSON analysis | 144 errors, 27 warnings. Includes 120 explicit-any errors and hook dependency warnings. | Current legacy lint is not clean. The JSON summary wrapper exiting successfully is not a lint pass. |
| `tsc --noEmit -p tsconfig.app.json` | FAIL, TS2687 at `src/hooks/usePushSubscription.ts:9`: pushManager declarations have differing modifiers. | Existing application TypeScript baseline fails independently of bundling. |
| Test/CI inventory | No test script in package.json and no existing CI test gate found in this review. TypeScript strictness is not the proposed clean alpha standard. | Quality foundation is work to do, not verified protection. |
| Production/backend/device | NOT RUN. | No claim of working deployed policies, data migration, provider access, iPhone or Android readiness. |

Do not launch a whole-repository cleanup from these numbers. Repair defects relevant to the selected slice, protect reused domain behavior with tests, and establish clean gates for new work without concealing old debt.

## 11. Recommended sequence and verification gates

1. **Review this preservation map.** Mark which existing behaviors Sam considers essential, surprising, or no longer desirable. Do not choose based only on screen count or line count.
2. **Walk through the current app with a designated test account.** Capture behavior and failures for the checklist below. Obtain permission before operations that send notifications, email real people, or modify production data.
3. **Create a reviewed preservation checkpoint.** Inspect dirty/untracked files and secrets before a scoped Git snapshot; verify where the recoverable copy lives. This report does not create that checkpoint.
4. **Resolve product/data contracts.** Especially visibility, canonical performance versus personal memory, identity continuity, and existing-user transition. Map read/write dependencies before choosing the first production slice.
5. **Select the smallest useful end-to-end slice.** Invitation-to-memory is a candidate, not yet a mandate. Define acceptance and reuse tests first, then build its native UI and only the supporting foundation it needs.

Core dependency chain: identity and canonical performance facts -> personal memory/media -> collection/ranking -> share artifact -> recipient quick-add/direct comparison. Ranking, sharing and privacy cannot safely be designed as unrelated screen ports.

### Runtime walkthrough still required

| Area | Demonstrate with safe test data | Record |
| --- | --- | --- |
| Entry/account | Fresh invite, expired/reopened link, signup/login, callback, restart. | Preserved/lost state, errors, actual public fields. |
| Capture | Exact/approximate date, multiple artists, festival/set grouping, edit, duplicate and failed save. | Database/UI result and recoverability. |
| Import/media | Missing EXIF, denied permissions, invalid text, failed partial batch, cancel and replace photo. | Consent, progress accuracy, orphan cleanup. |
| Ranking | New/old shows, skips, repeat submission, interrupted comparison, same account on two devices. | Stable ordering and coherent stored comparisons. |
| Sharing/friends | Anonymous and unrelated-user links, own quick-add, no personal content copied, follow behavior. | What is actually visible and who can change it. |
| Profile/support | Identity edit, feedback preview/cancel/submit, screenshot content, role-denied admin access. | Privacy exposure, successful triage, failure recovery. |
| Maps/plans | Empty collection, bad coordinates, past/future dates, RSVP/delete. | Current feature value and provider failure behavior. |
| Platform | Small screen, keyboard, loading, offline/account switch, accessibility, lifecycle and install. | Real friction and native requirements. |

Completion boundary: the source inventory is complete; the whole app is not certified functional or migration-ready. The next decision is what to preserve and verify, not what to throw away.
