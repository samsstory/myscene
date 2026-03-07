# Beta Onboarding Audit — First 50 Users
> Generated 2026-03-07 · Covers: Auth → Onboarding → Cold Start → Discover

---

## Flow 1: Auth (`Auth.tsx`, `AuthCallback.tsx`)

### Findings

| Area | Finding | Severity |
|------|---------|----------|
| **No password reset** | No "Forgot password?" link anywhere on the sign-in form. Users who forget passwords are stuck. | 🔴 Critical |
| **No email verification gate** | `signUp` immediately navigates to `/dashboard` with a success toast — user is logged in before verifying email. Auto-confirm is not explicitly enabled, so Supabase may reject unverified sessions later causing confusing errors. | 🔴 Critical |
| **Misleading social proof** | "Join 1,200+ music lovers" — hardcoded number. If beta has 50 users, this is dishonest. Should be dynamic or removed. | 🟡 Medium |
| **No Google/Apple OAuth** | Only email+password. Social login would significantly reduce signup friction for beta testers. | 🟡 Medium |
| **Generic tagline** | "Capture every show, relive every moment" — doesn't match the updated "track, rank, share" positioning from the WelcomeCarousel rewrite. | 🟠 High |
| **No loading state on auth check** | `Auth.tsx` checks session and redirects, but shows the full auth form briefly before redirect for already-logged-in users (flash of content). | 🟡 Medium |
| **No password strength indicator** | Only `minLength={6}` on signup. No visual feedback on password quality. | ⚪ Low |
| **Visual quality** | Glassmorphism card, mesh gradients, noise texture — feels premium ✅ | ✅ Good |
| **AuthCallback** | Clean implementation with proper timeout fallback. 8s timeout is reasonable. | ✅ Good |

---

## Flow 2: Onboarding (`WelcomeCarousel.tsx`, `SpotlightTour.tsx`, `PushNotificationInterstitial.tsx`)

### Findings

| Area | Finding | Severity |
|------|---------|----------|
| **SpotlightTour targets broken** | Tour targets `[data-tour="nav-rank"]` and `[data-tour="nav-globe"]` — these don't exist. ContentPillNav pills have no `data-tour` attributes. Tour will silently fail/skip steps. | 🔴 Critical |
| **SpotlightTour says 5 steps but only 3 targets exist** | `data: { totalSteps: 5 }` is hardcoded. Steps 2 and 4 will fail to find targets. | 🔴 Critical |
| **Onboarding marks complete immediately** | `Dashboard.tsx` line 202: `onboarding_step: "completed"` is set BEFORE the user does anything — even before WelcomeCarousel renders. The `pendingAddFlowRef` flag triggers carousel, but onboarding is already marked done in the DB. If user closes app, they'll never see onboarding again. | 🟠 High |
| **Push notification interstitial not wired** | `PushNotificationInterstitial` exists but is never rendered in Dashboard or any onboarding flow. Dead component. | 🟠 High |
| **WelcomeCarousel → BulkUploadFlow** | "Log My First Show" opens `BulkUploadFlow` (via `setShowUnifiedAdd(true)`), which is a multi-photo batch upload. Overwhelming for a first action. Should open the simpler `AddShowFlow` instead. | 🟠 High |
| **No profile setup step** | New users have no username, no avatar, no home city. The app needs home_city for "Upcoming Near You" and username for friend discovery. There's no prompt to set these. | 🟠 High |
| **Tour copy is stale** | "Rank shows against each other" and "See everywhere you've been" — doesn't mention social features (friends, shared calendar). Misaligned with current product direction. | 🟡 Medium |
| **WelcomeCarousel visual quality** | Hero mockup with comparison cards is compelling. Copy is clear. CTA is prominent. | ✅ Good |

---

## Flow 3: Cold Start / Empty States

### SceneView (Home tab)

| Area | Finding | Severity |
|------|---------|----------|
| **Cold start card works** | `isColdStart` gate shows "Plan your first show" + "Find friends" — good CTAs | ✅ Good |
| **But the cold start check is wrong** | `isColdStart = hasNoUpcoming && hasNoFollowing` — doesn't check if user has 0 *logged* shows. A user with 1 logged show but 0 upcoming and 0 following won't see the cold start card, but also won't see WhatsNextStrip content. | 🟡 Medium |
| **StatsTrophyCard shows zeros** | For new users: "0 shows, 0 venues, 0 artists" — feels empty/sad. Should show an encouraging message instead of bare zeros. | 🟡 Medium |
| **VSHeroWidget below stats** | VS widget shows even with 0-1 shows — will show empty state. Could be hidden entirely for cold start. | ⚪ Low |

### MyShowsView (Rankings pill)

| Area | Finding | Severity |
|------|---------|----------|
| **Empty state exists but is filter-dependent** | The empty state message says "No shows match this filter" — wrong for a user with 0 shows. Should say "Log your first show to start building your rankings." | 🟡 Medium |
| **No CTA in empty state** | Empty state has no button to add a show. Just text. | 🟡 Medium |

### ScheduleView (Calendar pill)

| Area | Finding | Severity |
|------|---------|----------|
| **Empty state is adequate** | "No shows this month" + "+ Plan a show" link. Works. | ✅ Good |
| **But messaging is weak** | "Add upcoming shows and share your schedule with friends" — could be more motivating. | ⚪ Low |

### FriendsPanelView (Friends pill)

| Area | Finding | Severity |
|------|---------|----------|
| **DUMMY_SHOWS in production** | `WhosGoingCard` renders `DUMMY_SHOWS` (Fred again.., Jamie xx, Mau P with fake friends) when user has no real friend data. These are NOT gated behind a demo flag. Every new user sees fake data labeled "Preview". | 🔴 Critical |
| **"My Scene This Week" with dummy data is misleading** | Shows fake friend avatars from Unsplash URLs. Beta testers will think these are real people. | 🔴 Critical |
| **Activity feed empty state is good** | Shows "No activity from friends yet" with find friends CTA. | ✅ Good |
| **Find Friends works** | Search by name/username with follow/unfollow. Clean UI. | ✅ Good |

---

## Flow 4: Discover / First Value

### EdmtrainDiscoveryFeed

| Area | Finding | Severity |
|------|---------|----------|
| **Location-dependent** | Uses `useEdmtrainEvents` which requires lat/lng. New users without home_city set get no results. | 🟠 High |
| **No fallback for no-location** | Shows "No upcoming events found near you" — doesn't tell user to set their city. | 🟡 Medium |
| **Edmtrain only covers EDM** | Product is for all live music but discovery feed is EDM-only. Could confuse non-EDM beta testers. | 🟡 Medium |

### PopularFeedGrid (Scene Charts)

| Area | Finding | Severity |
|------|---------|----------|
| **Also location-dependent** | `usePopularNearMe` requires lat/lng from profile. No city = empty or "Set your home city" message. | 🟠 High |
| **Good fallback message** | Has `emptyMessage` for no-location case: "Set your home city in your profile to see what's trending near you." | ✅ Good |
| **Community data may be sparse** | With 50 users, "Scene Charts" will have very few entries. Could feel empty. | 🟡 Medium |

### WhatsNextStrip

| Area | Finding | Severity |
|------|---------|----------|
| **DEMO_10_FRIENDS in production** | Line 322: `goingWith={idx === 0 ? DEMO_10_FRIENDS : ...}` — first UpcomingChip always shows 10 fake friends with Unsplash avatars. This is in the PRODUCTION render path, not behind any flag. | 🔴 Critical |
| **Good empty state for Mine tab** | "Plan a show" CTA when no upcoming shows. | ✅ Good |
| **For You tab requires Spotify** | Shows blurred teaser cards with "Connect Spotify" gate. Good soft-gate pattern. | ✅ Good |

### ForYouFeed

| Area | Finding | Severity |
|------|---------|----------|
| **Clean Spotify gate** | Non-connected users see blurred cards + connect CTA. Good pattern. | ✅ Good |
| **Post-connect empty state is vague** | "Keep using Scene to unlock personalized recommendations" — doesn't explain what to do. | ⚪ Low |

---

## Power-Ranked Changes

| # | Change | Flow | Type | Impact | Effort | Notes |
|---|--------|------|------|--------|--------|-------|
| 1 | **Remove DEMO_10_FRIENDS from WhatsNextStrip** | Cold Start | `remove` | critical | trivial | Line 322 — replace `DEMO_10_FRIENDS` with real `friendOverlapByShowId` data. Delete the entire DEMO_10_FRIENDS constant (lines 26-52). |
| 2 | **Remove DUMMY_SHOWS from FriendsPanelView** | Cold Start | `remove` | critical | trivial | Lines 219-257 in WhosGoingCard — replace with proper empty state ("Follow friends to see their upcoming shows"). Delete dummy data. |
| 3 | **Add "Forgot Password?" link to Auth** | Auth | `add` | critical | small | Add link below password field. Create `/reset-password` page with `supabase.auth.updateUser`. Wire `resetPasswordForEmail`. |
| 4 | **Fix SpotlightTour targets** | Onboarding | `fix` | critical | small | Add `data-tour` attributes to ContentPillNav pills. Update tour steps to match current UI. Update copy to emphasize social features. Reduce to 3-4 working steps. |
| 5 | **Fix onboarding completion timing** | Onboarding | `fix` | high | trivial | Move `onboarding_completed_at` update to AFTER WelcomeCarousel `onComplete` callback, not in `checkOnboarding`. |
| 6 | **Add profile setup step (username + home city)** | Onboarding | `add` | high | medium | Insert a profile setup screen between WelcomeCarousel and first show add. Collect: display name, username, home city (with geocoding). Critical for friend discovery and location-based features. |
| 7 | **Wire PushNotificationInterstitial into onboarding** | Onboarding | `fix` | high | small | Show after first show is logged (success step) or after profile setup. Currently the component exists but is orphaned. |
| 8 | **Update Auth tagline to match product positioning** | Auth | `improve` | high | trivial | Change "Capture every show, relive every moment" → "Track, rank, and share every concert" to match WelcomeCarousel. |
| 9 | **Fix social proof number** | Auth | `fix` | high | trivial | Replace "1,200+" with dynamic count from DB or honest "Join the beta" / "Be one of the first." |
| 10 | **WelcomeCarousel → AddShowFlow instead of BulkUpload** | Onboarding | `improve` | high | trivial | Change `onComplete` callback to open `setShowAddDialog(true)` instead of `setShowUnifiedAdd(true)`. Single show flow is less overwhelming for first action. |
| 11 | **Handle email verification properly** | Auth | `fix` | high | small | After signup, show "Check your email" screen instead of navigating to dashboard. Or explicitly enable auto-confirm for beta and document that decision. |
| 12 | **Add "Set home city" nudge for new users** | Cold Start | `add` | high | small | When home_city is null, show a banner above EdmtrainDiscoveryFeed: "Set your home city to see shows near you" with inline city picker. |
| 13 | **Improve MyShowsView empty state** | Cold Start | `improve` | medium | trivial | Change "No shows match this filter" → "Log your first show to start ranking" with CTA button calling `onRankShow` or equivalent. |
| 14 | **Hide VSHeroWidget during cold start** | Cold Start | `improve` | medium | trivial | Don't render VSHeroWidget when user has 0-1 shows. It can't show useful content. |
| 15 | **Add Google OAuth** | Auth | `add` | medium | small | Use Lovable Cloud social auth. Significantly reduces friction for beta testers. |
| 16 | **StatsTrophyCard empty state** | Cold Start | `improve` | medium | small | When totalShows === 0, show an encouraging "Start your concert journey" card instead of all zeros. |
| 17 | **Add loading state to Auth session check** | Auth | `improve` | medium | trivial | Show spinner/skeleton while checking existing session to prevent form flash for logged-in users. |
| 18 | **Fix SceneView cold start check** | Cold Start | `fix` | medium | trivial | Include `hasNoShows` in the cold start condition: `isColdStart = hasNoUpcoming && hasNoFollowing && hasNoShows`. |
| 19 | **Clarify EdmtrainDiscoveryFeed no-location state** | Discover | `improve` | medium | trivial | When no location, show "Set your home city in Profile → Settings" instead of generic "No upcoming events found near you." |
| 20 | **Scene Charts sparse data handling** | Discover | `improve` | low | small | When <5 items, show "Be an early contributor" message encouraging logging shows. For beta, consider defaulting to "Worldwide" scope. |

---

## Implementation Priority Order

### Sprint 1: "Nothing fake, nothing broken" (Day 1)
1. Remove DEMO_10_FRIENDS (#1)
2. Remove DUMMY_SHOWS (#2)
3. Fix social proof number (#9)
4. Update Auth tagline (#8)
5. Fix onboarding completion timing (#5)
6. WelcomeCarousel → AddShowFlow (#10)

### Sprint 2: "Core flows work" (Day 2-3)
7. Add Forgot Password (#3)
8. Fix SpotlightTour (#4)
9. Handle email verification (#11)
10. Add home city nudge (#12)
11. Wire PushNotificationInterstitial (#7)

### Sprint 3: "First impression polish" (Day 4-5)
12. Add profile setup step (#6)
13. Improve empty states (#13, #14, #16)
14. Add Google OAuth (#15)
15. Fix cold start check (#18)

### Sprint 4: "Delight" (Day 6+)
16. Remaining polish items (#17, #19, #20)
