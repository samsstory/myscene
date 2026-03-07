

## Root Cause

The tooltip uses `position: absolute` with `left: 50%` / `top: 50%` inside a `position: fixed` container. This *should* work, but the issue is the **SVG viewBox** is setting the coordinate space to `window.innerWidth x window.innerHeight`, and the outer `div` contains both the SVG and the absolutely-positioned tooltip. The SVG's `viewBox` + `preserveAspectRatio="none"` can cause the container to have unexpected intrinsic sizing behavior that shifts child elements.

More critically, the tooltip's parent `div` has `position: fixed; inset: 0` — so `position: absolute; left: 50%; top: 50%` on the tooltip should be relative to the viewport. But this relies on the fixed container not being affected by CSS transforms or other stacking context issues from parent elements in the Dashboard. If any ancestor has a `transform`, `filter`, or `will-change` property, `position: fixed` becomes relative to that ancestor instead of the viewport — breaking the centering.

**The fix**: Change the tooltip wrapper from `position: absolute` to `position: fixed` directly, removing its dependency on the parent container entirely. This guarantees viewport-center positioning regardless of ancestor transforms.

## Plan

**Single file edit: `src/components/onboarding/SpotlightTour.tsx`**

1. Change the center-screen tooltip `motion.div` (line 181-255) from `position: "absolute"` to `position: "fixed"` with `left: "50%"`, `top: "50%"`, `transform: "translate(-50%, -50%)"`, and `zIndex: 10002`.

2. Add `width: "100%"` and `display: "flex"`, `justifyContent: "center"`, `alignItems: "center"` as a fallback — or simpler: just use `position: fixed` directly on the tooltip `motion.div` so it's always viewport-relative.

3. Also add `pointerEvents: "none"` to the outer fixed container and `pointerEvents: "auto"` only on the tooltip card itself, so the overlay click-through behavior is correct.

This is a 1-line change (`absolute` → `fixed` on line 188) that fully resolves the issue.

