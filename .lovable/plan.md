

## What's Happening

There are two issues with the current flow:

### Issue 1: "Enable Notifications" button goes straight to "denied" phase
When you click "Enable Notifications" on desktop/laptop in the Lovable preview iframe, `Notification.requestPermission()` either throws or returns `"denied"` immediately because the iframe sandbox doesn't support the Push API. The code in `handleEnable` (line 32-51) catches this and sets `phase = "denied"`, which shows the "No worries at all" / "Continue to my shows" screen. So the button appears broken but is actually working as designed — the browser just instantly denies the permission.

### Issue 2: "Maybe later" skips the denied screen
`handleSkip` (line 54-57) calls `markDone()` then immediately calls `onComplete()`, which closes the sheet and returns to the dashboard. The user never sees the friendly "No worries, you can enable later" confirmation. This is the bug you're reporting.

## Plan

**Single change in `PushNotificationInterstitial.tsx`:**

1. Change `handleSkip` to set `phase = "denied"` instead of calling `onComplete()` directly. This shows the "No worries at all" screen with the "Continue to my shows →" button, which then calls `onComplete()` when tapped.

```
const handleSkip = async () => {
  await markDone();
  setPhase("denied");  // was: onComplete()
};
```

That's it. One line change. The "denied" phase UI already has the friendly copy and a "Continue to my shows →" button wired to `onComplete`.

For the "Enable Notifications" button appearing to fail on desktop — this is expected browser behavior in the preview iframe. On a real PWA install it will work correctly. No code change needed there.

