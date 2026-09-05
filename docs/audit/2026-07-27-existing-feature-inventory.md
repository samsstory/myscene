# Scene Existing Feature Inventory

Superseded for capability classification by the [September 5 whole-app inventory](2026-09-05-current-app-inventory.md). This preliminary document is retained as history. In particular, generated legacy types are reference evidence, not the new alpha source of truth.

**Status:** Phase 0 preliminary inventory  
**Date:** July 27, 2026  
**Purpose:** Preserve existing work while rebuilding the fan-facing mobile app in React Native + Expo.

## Ground rule

This is a classification exercise, not a deletion list. Existing code, data, and operating surfaces remain intact unless Sam explicitly approves retirement. The mobile UI is rebuilt; the product capability underneath is preserved, reused, reshaped, or hidden for the alpha.

## Reuse in the alpha foundation

| Existing area | Current evidence | Alpha treatment |
| --- | --- | --- |
| Supabase client and generated types | `src/integrations/supabase/` | Preserve as the source of truth. Move platform-neutral types and access patterns into shared packages when the Expo app is created. |
| Show capture model | `AddShowFlow`, artist, venue, date, search, and review components | Rebuild the mobile UI, retain the event/search/creation behavior and validate it against the new specific-performance model. |
| Ranking foundations | `Rank`, ranking cards, ranking confirmation, `smart-pairing` | Reuse the domain logic after audit. Replace the current presentation with the intentional alpha Rank mode and ranking-debt behavior. |
| Photos and EXIF support | `PhotoOverlayEditor`, `QuickPhotoAddSheet`, `exif-utils` | Preserve the photo and metadata knowledge. Reimplement device capture/library UI with Expo-native capabilities. |
| Profile, followers, and sharing | profile, follower, share hooks/components | Reshape around public/private profile, direct connection, staged Scene Match, and alpha share pages. |
| Feedback and bug reporting | `FeedbackSheet`, `BugReportButton`, bug prompt/screenshot utilities | Keep one feedback system. Adapt native screenshot/device context rather than creating a second feedback product. |
| Admin and operator capabilities | `Admin` and `components/admin/` | Keep in the web app. Reassess each panel against the alpha invite and support workflow. |

## Reshape for the alpha

| Existing area | Why it changes | Alpha role |
| --- | --- | --- |
| Home/dashboard | Current `Home` and home modules mix collection, discovery, planning, activity, and ranking | Rebuild as **My Scene**, a collection-first home with progress, prompt, Add, ranking debt, and relevant comparison prompts. |
| Existing map | `MapView` and map components already exist | Remove it as a primary tab. Reintroduce it as a collection insight or 10-show celebration only when it earns the moment. |
| Friends and activity | friend panels, follower hooks, activity feed | Replace feed-first behavior with direct connection, shared shows, "I was there too," and staged comparison. |
| Current share flow | `useShareShow` and share/review components | Preserve share knowledge but rebuild the public share page around #1 hero, Top 5, expandable Top 10, settling state, and invite attribution. |
| Onboarding | welcome carousel, tours, push interstitial | Replace with personal invite, memory-prompt deck, first show, first-card payoff, and Save with Apple. |

## Hide from the alpha experience

These features remain in the codebase but do not belong in alpha primary navigation or onboarding.

- Upcoming-show planning and schedule views
- Broad discovery, popular shows, near-me, and Explore-like surfaces
- Activity feed and public community feed
- Contact syncing and broad contact import
- Standalone map tab
- Push-notification onboarding
- Waitlist acquisition flow and general referral leaderboard
- Bulk historical import and text import during onboarding
- Consumer-facing admin surfaces

## Preserve for the web/operator surface

- Invite generation and invite-status reporting, rebuilt or adapted from the existing admin/operator foundation
- Public share and landing pages
- Admin support, feedback review, announcements, and user operations that are needed for the alpha
- Existing production routes until their replacement is verified

## Explicitly not classified as retired

Nothing is approved for deletion. In particular, the existing Capacitor/iOS work, landing variants, map work, planning work, discovery work, and broad social features remain available for later reuse or a more intentional product role.

## Next audit passes

1. Inspect the Supabase schema, policies, and storage rules for the show/profile/invite/privacy model.
2. Trace current show creation and ranking writes end-to-end to distinguish reusable domain logic from web-only UI.
3. Inventory the uncommitted Capacitor/iOS work and identify reusable credentials, deep-link setup, assets, and native capability knowledge.
4. Define the shared package boundary before creating the Expo prototype.
