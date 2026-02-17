

## Optimize First Sign-Up Flow for Show Creation

### Current Flow (5 steps before first show)
1. User signs up on `/auth`
2. Redirected to `/dashboard`
3. Sees WelcomeCarousel onboarding screen
4. Taps "Log Your First Show" -- opens BulkUploadFlow (photo picker)
5. User selects photo, fills details, submits
6. Sees BulkSuccessStep with share/rank options
7. Install banner may appear at any time (even on auth page)

### Problems
- The WelcomeCarousel is a full-screen blocker between signup and logging the first show -- it adds friction
- The install banner shows globally (even on the auth page), competing with signup
- After success, there's no install prompt at the optimal "aha moment"

### Proposed Optimized Flow

```text
Sign Up --> Dashboard --> Add Show Flow (auto-opens) --> Success --> Install Prompt
```

**Step-by-step:**

1. **Remove the WelcomeCarousel screen entirely for new users** -- instead of showing a full-screen onboarding, skip straight to the dashboard with the Add Show flow auto-opening. The user just signed up; they're motivated. Get them to their first show immediately.

2. **Suppress the install banner on `/auth` and during onboarding** -- update `InstallBanner.tsx` to check the current route and hide on `/auth`, `/`, and other non-dashboard routes. Also suppress it until the user has at least 1 show logged.

3. **Trigger the install prompt on the success screen** -- after the user logs their first show, show the PWA install prompt directly on the `BulkSuccessStep` (or `SuccessStep` for manual add). This is the "aha moment" where they've just experienced value.

4. **Streamline the Dashboard onboarding check** -- instead of showing `WelcomeCarousel`, new users (with `onboarding_step !== 'completed'`) will immediately get the add-show flow opened, and `onboarding_step` will be set to `completed` right away.

### Technical Changes

**`src/pages/Dashboard.tsx`**
- Remove the WelcomeCarousel render block
- Remove the `showOnboarding` state and related logic
- When a new user is detected (onboarding_step not completed), directly set `pendingAddFlowRef.current = true` and mark onboarding as completed in the DB
- Remove `handleTakeTour` and `handleOnboardingComplete` (simplify to just auto-open the add flow)

**`src/components/pwa/InstallBanner.tsx`**
- Add route check: only show on `/dashboard`
- Add a check for whether the user has logged at least 1 show (using a localStorage flag like `scene-first-show-logged`)
- Only display the banner when both conditions are met

**`src/components/bulk-upload/BulkSuccessStep.tsx`**
- After showing the success state, check if this is the user's first show (e.g., via a prop `isFirstShow`)
- If first show, display a compact inline install CTA within the success screen (before the share/rank actions) -- "Get SCENE on your home screen" with an Install button
- Set the `scene-first-show-logged` localStorage flag so the floating InstallBanner can also appear later if they dismiss

**`src/components/add-show-steps/SuccessStep.tsx`**
- Same first-show install CTA treatment for the manual add flow

**`src/components/onboarding/WelcomeCarousel.tsx`**
- File remains but is no longer imported/used from Dashboard (kept for potential re-use or tour reference)

### Result
- New users go from signup to logging their first show in 2 taps (sign up -> select photo)
- Install prompt appears at peak engagement (just logged a show)
- No competing CTAs on the auth screen
- Returning users are unaffected

