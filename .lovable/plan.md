
# Fix: OTP Flow — Code Instead of Magic Link + Correct Redirect Handling

## Problem Diagnosis

There are two distinct bugs causing the broken experience:

### Bug 1 — Wrong email type: Magic link instead of a numeric code
`supabase.auth.signInWithOtp({ email })` sends whichever template is configured in the auth backend. The default Supabase template for this call is the **"Magic Link"** template (a clickable login button), not the **"Email OTP"** template (a 6-digit code). To force a numeric code, the call must explicitly pass `type: 'email'` is not enough — the correct approach is to use `signInWithOtp` with the right options, specifically without a redirect URL (magic links need one; OTP codes do not use one). The fix is to remove any implicit redirect and ensure the Supabase auth config is sending the OTP token template.

The proper Supabase call for a numeric code is:
```ts
supabase.auth.signInWithOtp({
  email,
  options: {
    shouldCreateUser: true,
    // No emailRedirectTo = forces OTP code, not magic link
  }
})
```
However, the more reliable fix on the frontend side is to call `verifyOtp` with `type: "email"` (which is already done correctly), and ensure the auth backend is configured to send the token email, not the magic link email. Since we can control the `supabase/config.toml`, we need to check if `[auth.email]` is set to use OTP tokens.

### Bug 2 — No redirect handler: Magic link lands on `/` with no auth pickup
Even when it was a magic link, clicking "Log In" redirected to `/` (the landing page). The auth token hash (`#access_token=...`) was in the URL but nothing on the landing page or `IndexV2` handles it, so the user stays unauthenticated on the marketing page.

## The Fix Plan

### Part 1 — Force OTP token email (not magic link)
Update the `handleSendOtp` and `handleResend` calls in `ShowInviteHero.tsx` to pass `emailRedirectTo` pointing to `/auth/callback` — this matters because **without** a redirect URL, Supabase sends the OTP token (code) email. With one, it sends the magic link. We need to be explicit and NOT pass `emailRedirectTo` at all in these calls.

The current code already doesn't pass `emailRedirectTo`, which is correct. The real issue is that the Supabase project's auth email template is configured as "Magic Link" by default. The fix is to update `supabase/config.toml` to enable OTP email tokens.

### Part 2 — Add auth callback route to handle any magic link redirects gracefully
Whether a user arrives via code or link, we need an `/auth/callback` route in `App.tsx` + a simple `AuthCallback.tsx` page that:
1. Reads the `#access_token` fragment from the URL (which Supabase appends on magic link clicks)
2. Calls `supabase.auth.getSession()` to confirm the session
3. Reads any `invite_*` values from `sessionStorage`
4. Redirects to `/dashboard` (with invite params if present)

This is the safety net: even if the user clicks the email link instead of entering a code, they'll land correctly on the dashboard instead of the landing page.

### Part 3 — Update `supabase/config.toml` to enable OTP token emails
Add the following to the `[auth.email]` section to tell Supabase to send a numeric OTP code instead of a magic link:

```toml
[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = false
otp_length = 6
otp_expiry = 3600
```

## Files to Change

### 1. `supabase/config.toml`
Add `otp_length = 6` and `otp_expiry = 3600` under `[auth.email]` to explicitly configure OTP token delivery.

### 2. `src/pages/AuthCallback.tsx` (new file)
A minimal page that handles the Supabase auth redirect:
- On mount, call `supabase.auth.getSession()` — if there's a session (magic link was clicked), read `sessionStorage` for invite context and navigate to `/dashboard` with those params.
- If no session found, navigate to `/auth` as fallback.

### 3. `src/App.tsx`
Add `<Route path="/auth/callback" element={<AuthCallback />} />` above the catch-all route.

### 4. `src/components/landing/ShowInviteHero.tsx`
Two small updates:
- In `handleSendOtp`: Add an explicit `emailRedirectTo: \`${window.location.origin}/auth/callback\`` — this is counter-intuitive but: by providing a redirect URL that points to our new callback handler, the magic link fallback now works correctly AND Supabase's OTP template is still what gets sent when the project is configured for OTP mode. The callback page handles both cases.
- In `handleResend`: Same change for consistency.
- Update `handleVerifyOtp` to verify with `type: "email"` (already correct, keep it).

## Why the Redirect URL Matters Both Ways
- **OTP code mode** (after config fix): User gets 6-digit code, enters it in the app, `verifyOtp` is called directly. The `emailRedirectTo` in the send call is ignored since no link is clicked.
- **Magic link fallback** (safety net): If for any reason the old template fires or user clicks a link, `/auth/callback` picks it up, confirms the session, and routes correctly to `/dashboard`.

## Summary of Changes

| File | Change |
|---|---|
| `supabase/config.toml` | Add `otp_length = 6`, `otp_expiry = 3600` to `[auth.email]` |
| `src/pages/AuthCallback.tsx` | New page: reads session from hash, redirects to `/dashboard` |
| `src/App.tsx` | Add `/auth/callback` route |
| `src/components/landing/ShowInviteHero.tsx` | Add `emailRedirectTo` pointing to `/auth/callback` in OTP send calls |

## Technical Note on Config
The `supabase/config.toml` configuration controls the local dev behavior. For the deployed Lovable Cloud project, the auth settings may need to be aligned — however, updating `config.toml` is the correct mechanism for this project type and will take effect on the next deploy.
