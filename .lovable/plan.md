

## Fix: Welcome Screen Tour Link + Add Flow Navigation

### Bug 1: Tour Link Not Visible

**Root cause**: The welcome screen content overflows the mobile viewport. The `flex-1 justify-center` layout centers content vertically but does not allow scrolling, so the "Take a quick tour first" link gets clipped below the fold.

**Fix in `WelcomeCarousel.tsx`**:
- Reduce vertical spacing: smaller `mt-6` gaps, reduce mockup container padding
- Add `overflow-y-auto` to the content area so it scrolls if needed
- Reduce the button height from `h-14` to `h-12` to save space
- Tighten the gap between the headline and subheadline

### Bug 2: "Log Your First Show" Opens Profile Instead of Add Flow

**Root cause**: When `setShowOnboarding(false)` fires, the WelcomeCarousel unmounts and the full Dashboard renders. However, React may batch or defer the `setShowUnifiedAdd(true)` state, causing the `BulkUploadFlow` dialog to not open reliably. Additionally, the Dashboard's auth `useEffect` runs on mount and may interfere with the transition.

**Fix in `Dashboard.tsx`**:
- Use a `useEffect` that watches for a flag (e.g. `pendingAddFlow`) to open the BulkUploadFlow after the dashboard has fully rendered post-onboarding
- This ensures the dialog opens after the dashboard layout has mounted, not during the unmount/remount transition

Alternatively (simpler approach):
- Use `setTimeout(() => setShowUnifiedAdd(true), 0)` to defer the add flow opening to the next tick, ensuring the dashboard has fully rendered first
- Or use `queueMicrotask` for the same effect

### Technical Details

**`src/components/onboarding/WelcomeCarousel.tsx`**:
- Change `flex-1 ... justify-center` to `flex-1 ... justify-center overflow-y-auto`
- Reduce `mt-6` after mockup to `mt-4`
- Reduce `mt-6` before button to `mt-4`
- Reduce button from `h-14` to `h-12`
- Reduce `mb-3` after headline to `mb-2`
- Add bottom padding (`pb-8`) to ensure tour link has breathing room

**`src/pages/Dashboard.tsx`**:
- In `handleOnboardingComplete`, wrap `setShowUnifiedAdd(true)` in a `setTimeout(..., 50)` to ensure it fires after the dashboard re-render completes
- This guarantees BulkUploadFlow's Dialog is mounted and ready to receive the `open={true}` prop

### Files Modified

| File | Change |
|------|--------|
| `src/components/onboarding/WelcomeCarousel.tsx` | Tighten spacing, add overflow scroll, ensure tour link is visible on mobile |
| `src/pages/Dashboard.tsx` | Defer `setShowUnifiedAdd(true)` to next tick to ensure reliable dialog opening |

