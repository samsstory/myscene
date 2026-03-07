

## Diagnosis: Drawer Content Not Visible

### Root Cause
The `DrawerContent` in `AddShowFlow.tsx` uses `max-h-[85vh]` and `overflow-hidden` but has no minimum height. Combined with `h-auto` from the base drawer class and `flex-1` on the inner scrollable div, the content area collapses to near-zero height. The overlay (black backdrop) renders at z-50 and is visible, but the drawer panel itself appears empty/collapsed behind it.

Additionally, vaul's `Drawer` component needs careful handling — the content must have enough intrinsic height for the drawer to snap open properly.

### Fix Plan

**File: `src/components/AddShowFlow.tsx` (line 1253)**

Update the `DrawerContent` className to add a minimum height and ensure proper sizing:
- Add `min-h-[50vh]` so the drawer always has visible height even before step content renders
- Keep `max-h-[85vh]` as the upper bound
- Ensure the inner scrollable div uses `flex-1 min-h-0` correctly

**File: `src/components/ui/drawer.tsx` (line 34)**

Ensure the base `DrawerContent` styles don't conflict:
- The base class already has `h-auto` which is fine, but confirm `z-50` on both overlay and content doesn't cause stacking issues
- Bump content to `z-[51]` or ensure DOM order guarantees content renders above overlay (it should, but worth confirming)

### Changes
1. **`AddShowFlow.tsx` line 1253**: Add `min-h-[50vh]` to `DrawerContent` className
2. **`drawer.tsx` line 34**: No change needed if DOM order is correct (content renders after overlay in DrawerPortal) — but if still hidden, bump content z-index above overlay

