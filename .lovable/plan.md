

# Sprint 1: "Nothing fake, nothing broken"

## Overview
Six targeted fixes to remove fake data, fix misleading copy, and correct onboarding timing. Each is isolated and testable independently.

---

## Task 1: Remove DEMO_10_FRIENDS from WhatsNextStrip

**File:** `src/components/home/WhatsNextStrip.tsx`

- Delete the `DEMO_10_FRIENDS` constant (lines 24-52)
- Replace line 322: `goingWith={idx === 0 ? DEMO_10_FRIENDS : (friendOverlapByShowId.get(show.id) ?? [])}` with `goingWith={friendOverlapByShowId.get(show.id) ?? []}`
- **Test:** Navigate to dashboard with upcoming shows on Mine tab. First chip should show real friend overlap only (likely empty for beta testers with no friends).

---

## Task 2: Remove DUMMY_SHOWS from FriendsPanelView

**File:** `src/components/home/FriendsPanelView.tsx`

- Delete the `DUMMY_SHOWS` array (lines 219-254)
- Replace the fallback logic (line 256): instead of `displayShows = weekShows.length > 0 ? weekShows : DUMMY_SHOWS`, show a proper empty state when `weekShows.length === 0`
- Empty state: a simple card with "Follow friends to see who's going to shows this week" + a CTA to switch to the Find tab
- Remove the `isDummy` variable and "Preview" badge logic
- **Test:** Navigate to Friends pill with 0 friends followed. Should show the empty state message, not fake Fred again / Jamie xx / Mau P cards.

---

## Task 3: Fix social proof number on Auth page

**File:** `src/pages/Auth.tsx`

- Change line ~297: `"Join 1,200+ music lovers"` to `"Join the beta"` or `"Be one of the first"`
- **Test:** Visit `/auth` and verify the footer text is honest.

---

## Task 4: Update Auth tagline

**File:** `src/pages/Auth.tsx`

- Change line ~184: `"Capture every show, relive every moment"` to `"Track, rank, and share every concert"` to match the WelcomeCarousel positioning
- **Test:** Visit `/auth` and verify subtext matches product messaging.

---

## Task 5: Fix onboarding completion timing

**File:** `src/pages/Dashboard.tsx`

- Move the `profiles.update({ onboarding_step: "completed", onboarding_completed_at: ... })` call (lines 202-205) out of `checkOnboarding`
- Instead, fire it when the WelcomeCarousel's `onComplete` callback runs — add it inside the `setShowWelcomeCarousel(false)` handler in `DashboardSheets.tsx` (or pass userId down and update there)
- This ensures if a user closes the app during the carousel, they'll see it again next login
- **Test:** Sign up a new account. Close app before tapping "Log My First Show." Reopen — carousel should appear again.

---

## Task 6: WelcomeCarousel opens AddShowFlow instead of BulkUploadFlow

**File:** `src/components/dashboard/DashboardSheets.tsx`

- Line 172: Change `setShowUnifiedAdd(true)` to `setShowAddDialog(true)`
- This opens the simpler single-show `AddShowFlow` instead of the overwhelming `BulkUploadFlow`
- **Test:** Complete the WelcomeCarousel. The single-show add flow should open, not the bulk upload.

---

## Deliverable

Create `.lovable/sprint-1-tasks.md` with the above 6 tasks, each with:
- Description of the change
- Exact file(s) and line references
- Specific test steps to verify

## Files modified (total: 4)
1. `src/components/home/WhatsNextStrip.tsx` — remove demo constant + usage
2. `src/components/home/FriendsPanelView.tsx` — remove dummy data, add empty state
3. `src/pages/Auth.tsx` — fix tagline + social proof text
4. `src/pages/Dashboard.tsx` + `src/components/dashboard/DashboardSheets.tsx` — fix onboarding timing + CTA target

