# Sprint 1: "Nothing fake, nothing broken" — Task Log

## Status: ✅ Complete

---

### Task 1: Remove DEMO_10_FRIENDS from WhatsNextStrip ✅
- **File:** `src/components/home/WhatsNextStrip.tsx`
- **Change:** Deleted the 29-line `DEMO_10_FRIENDS` constant and replaced `goingWith={idx === 0 ? DEMO_10_FRIENDS : ...}` with `goingWith={friendOverlapByShowId.get(show.id) ?? []}`
- **Test:** Navigate to Mine tab with upcoming shows → first chip shows real friend overlap only

### Task 2: Remove DUMMY_SHOWS from FriendsPanelView ✅
- **File:** `src/components/home/FriendsPanelView.tsx`
- **Change:** Deleted the `DUMMY_SHOWS` array (Fred again, Jamie xx, Mau P fake data), removed `isDummy`/`displayShows` logic, added proper empty state: "Follow friends to see who's going to shows this week"
- **Test:** Navigate to Friends pill with 0 friends → shows empty state message, not fake cards

### Task 3: Fix social proof number on Auth page ✅
- **File:** `src/pages/Auth.tsx`
- **Change:** `"Join 1,200+ music lovers"` → `"Join the beta"`
- **Test:** Visit `/auth` → footer text reads "Join the beta"

### Task 4: Update Auth tagline ✅
- **File:** `src/pages/Auth.tsx`
- **Change:** `"Capture every show, relive every moment"` → `"Track, rank, and share every concert"`
- **Test:** Visit `/auth` → subtext matches product positioning

### Task 5: Fix onboarding completion timing ✅
- **Files:** `src/pages/Dashboard.tsx`, `src/components/dashboard/DashboardSheets.tsx`
- **Change:** Removed premature `profiles.update({ onboarding_step: "completed" })` from `checkOnboarding`. Moved it to `WelcomeCarousel.onComplete` callback in DashboardSheets so it only fires after user engages.
- **Test:** Sign up new account → close app before tapping "Log My First Show" → reopen → carousel appears again

### Task 6: WelcomeCarousel opens AddShowFlow instead of BulkUploadFlow ✅
- **File:** `src/components/dashboard/DashboardSheets.tsx`
- **Change:** `setShowUnifiedAdd(true)` → `setShowAddDialog(true)` in carousel onComplete
- **Test:** Complete WelcomeCarousel → single-show AddShowFlow opens, not BulkUploadFlow
