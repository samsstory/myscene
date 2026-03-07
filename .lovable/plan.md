

## Root Cause

In `AddShowFlow.tsx` line 1252, the Drawer's `onOpenChange` is set to `resetAndClose`:

```tsx
<Drawer open={open} onOpenChange={resetAndClose} ...>
```

`resetAndClose` unconditionally calls `onOpenChange(false)` (line 909). Vaul's `onOpenChange` callback receives a boolean (`true` when opening, `false` when closing). Since `resetAndClose` ignores the boolean and always fires `onOpenChange(false)`, any internal vaul state change during mount immediately closes the drawer.

This is also why it worked before — when `AddShowFlow` used a Dialog, the Dialog's `onOpenChange` properly passed the boolean through. The Drawer conversion broke this contract.

The same pattern exists in `BulkUploadFlow.tsx` where `handleDialogOpenChange` correctly checks `nextOpen` — but AddShowFlow does not.

## Fix Plan

### 1. Fix AddShowFlow.tsx Drawer `onOpenChange` handler
Replace `onOpenChange={resetAndClose}` with a proper handler that:
- If vaul passes `true`, does nothing (parent controls open state)
- If vaul passes `false` (user swipe-dismisses), runs reset logic and calls `onOpenChange(false)`

```tsx
<Drawer open={open} onOpenChange={(nextOpen) => {
  if (!nextOpen) resetAndClose();
}} shouldScaleBackground={false}>
```

### 2. Ensure `resetAndClose` doesn't double-close
Update `resetAndClose` to only reset state without calling `onOpenChange(false)` — the parent already handles the state change. OR keep the `onOpenChange(false)` call but guard the Drawer's `onOpenChange` prop so it only runs cleanup on close.

The cleanest approach: split into `resetState()` (just resets form fields) and have the Drawer's `onOpenChange` call both `resetState()` and `onOpenChange(false)` only when closing.

### 3. Fix drawer-to-drawer timing for "Search manually"
In `BulkUploadFlow.tsx`, the `handleAddManually` uses a 400ms `setTimeout`. This may not be enough if the vaul close animation hasn't fully completed. Increase to 500ms or use vaul's `onAnimationEnd` / `onClose` callback to ensure the first drawer is fully unmounted before opening the second.

### Files to edit
- `src/components/AddShowFlow.tsx` — fix `onOpenChange` handler and `resetAndClose`
- `src/components/BulkUploadFlow.tsx` — verify/increase transition delay for `handleAddManually`

