
## Fix: "Log Your First Show" Button Should Open Add Show Flow

### Problem
The "Log Your First Show" button in the WelcomeCarousel only dismisses the carousel overlay. It does not open the Add Show flow, leaving the user on the dashboard with no clear next action.

This affects the WelcomeCarousel accessible from **Profile > "Welcome to Scene"** card. (The Dashboard no longer shows the carousel on first login -- it auto-opens the add flow directly.)

### Root Cause
In `Profile.tsx`, the WelcomeCarousel's `onComplete` callback is:
```
onComplete={() => setShowWelcomeCarousel(false)}
```
This closes the overlay but doesn't trigger the add-show dialog.

### Solution

**1. Add a callback prop to Profile for triggering the add-show flow**

`Profile.tsx` already receives `onStartTour` from Dashboard. We'll add an `onAddShow` prop the same way.

- `Profile` component: Accept a new `onAddShow` prop
- Wire it so WelcomeCarousel's `onComplete` both closes the carousel AND calls `onAddShow`

**2. Pass the callback from Dashboard**

In `Dashboard.tsx`, where `<Profile>` is rendered, pass:
```
onAddShow={() => {
  setActiveTab("home");
  setShowUnifiedAdd(true);
}}
```

This navigates to the home tab and opens the unified add-show flow (the photo picker dialog).

### Files Changed
- `src/components/Profile.tsx` -- Add `onAddShow` prop, wire to WelcomeCarousel's `onComplete`
- `src/pages/Dashboard.tsx` -- Pass `onAddShow` callback to Profile component

### Result
Tapping "Log Your First Show" from the WelcomeCarousel (accessed via Profile) will close the carousel, switch to the Home tab, and immediately open the Add Show flow.
