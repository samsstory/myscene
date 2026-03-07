

## Problem Analysis

Two bugs prevent the expected post-first-show flow:

### Bug 1: Profile setup never appears
The `SuccessStep` uses `localStorage.getItem("scene-first-show-logged")` to determine if this is the user's first show. This key was likely already set during previous testing/sessions, so `isFirstShow` is always `false` and `ProfileSetupSheet` never renders.

**Root cause**: Using localStorage (which persists across sessions) for a per-account check. Should use a database check instead — specifically whether the user's profile already has `full_name` and `home_city` set.

### Bug 2: "Log your first show" quest doesn't complete
In `DashboardSheets.tsx` line 107, the `onShowAdded` prop passed to `AddShowFlow` is `() => {}` — a no-op. After adding a show, the `useSetupQuests` hook is never refetched, so the quest card remains unchanged until the next page load.

---

## Fix Plan

### 1. Fix profile setup trigger (SuccessStep.tsx)
Replace the localStorage-based `isFirstShow` detection with a database check: query the user's profile to see if `full_name` and `home_city` are already set. If either is missing, show the `ProfileSetupSheet` when "Done" is tapped — regardless of whether it's technically the first show.

- Remove the `scene-first-show-logged` localStorage check for profile setup triggering (keep it for the PWA nudge if desired)
- Add a `useEffect` that fetches the user's profile (`full_name`, `home_city`) on mount
- Set `needsProfileSetup` to `true` if either field is null/empty
- `handleDone` shows `ProfileSetupSheet` when `needsProfileSetup` is true

### 2. Fix quest refetch after show added (DashboardSheets.tsx)
Pass a meaningful callback to `onShowAdded` that triggers `refetchQuests()`.

- In `DashboardSheets.tsx`, accept a `refetchQuests` callback (or equivalent) and call it inside `onShowAdded`
- Wire this from `SceneView.tsx` where `useSetupQuests` lives, passing `refetchQuests` down through the component tree to `DashboardSheets`

### 3. Also fix BulkSuccessStep.tsx
Apply the same database-based profile check (instead of localStorage) for consistency, since `BulkSuccessStep` has the same pattern.

