

# Plan: Fix Password Reset Flow (2 Issues)

## Problem Analysis

### Issue 1: Reset button text in email is unreadable
The project uses **default auth emails** (no custom templates exist in `supabase/functions/_shared/email-templates/`). The default recovery email has a button with poor contrast — likely dark text on a dark button, or light text that blends into a light background. Since we don't control the default template, the fix is to **scaffold custom auth email templates** with proper branding (cyan-400 primary button with white text, matching the app's dark theme identity).

### Issue 2: "Set your new password" page never loads (stuck on "Loading recovery session...")
The `ResetPassword.tsx` page waits for a `PASSWORD_RECOVERY` auth event from `onAuthStateChange`. However, the auth logs show the recovery verify endpoint returned a **303 redirect** to `/reset-password` — this means the token was already exchanged server-side before the page loaded. By the time the React component mounts and subscribes to `onAuthStateChange`, the `PASSWORD_RECOVERY` event has already fired and been missed.

The fix: **Also check the current session on mount.** If a session already exists (meaning the recovery token was already exchanged), set `isRecovery = true` immediately instead of only relying on the event listener.

---

## Changes

### Fix 1: ResetPassword.tsx — Handle already-exchanged recovery token

**File:** `src/pages/ResetPassword.tsx`

In the `useEffect`, after subscribing to `onAuthStateChange`, also call `supabase.auth.getSession()`. If a session exists, set `isRecovery = true`. This handles the race condition where the redirect already exchanged the token before the component mounted.

Additionally, check the URL hash for `type=recovery` as a secondary signal.

Add a timeout fallback (e.g. 5 seconds) — if neither the event nor a session arrives, show a "Link may have expired" message with a link back to `/auth` to request a new one.

### Fix 2: Scaffold custom auth email templates with proper branding

Use the `scaffold_auth_email_templates` tool to create branded recovery email templates. Then style the recovery template button with:
- Button background: `hsl(183, 74%, 65%)` (cyan-400 primary)
- Button text: white, bold
- Button border-radius matching the app's `--radius`
- Body background: `#ffffff` (required for email clients)

Deploy via `auth-email-hook` edge function.

---

## Implementation Order

1. **Fix ResetPassword.tsx** (trivial, fixes the broken page immediately)
2. **Scaffold + brand email templates** (small, fixes the unreadable button)

