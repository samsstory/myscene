

# Remove Waitlist, Enable Direct Signup

## Overview
Replace all waitlist flows with direct email/password signup across the landing pages and auth page. Enable auto-confirm so users can sign in immediately.

## Changes

### 1. Enable Auto-Confirm for Email Signups
Use the configure-auth tool to enable auto-confirm so new users can sign in without email verification (since Resend/email delivery isn't ready yet).

### 2. Auth Page (`src/pages/Auth.tsx`)
- Remove the `WaitlistSignup` import and component
- Replace the "Sign Up" tab content with a proper email + password form (matching the existing Sign In form style)
- On successful signup, navigate directly to `/dashboard`

### 3. Landing Hero V2 (`src/components/landing/v2/LandingHeroV2.tsx`)
- Remove `WaitlistModal` import and state
- Change "Start Your Collection" button to navigate directly to `/auth` (sign-up tab)
- Update social proof text from waitlist language to something like "For people who live for live music" (already done)

### 4. Landing Hero V1 (`src/components/landing/LandingHero.tsx`)
- Remove `WaitlistModal` import and state
- Change "Request Beta Access" button to navigate to `/auth`

### 5. Landing CTA sections (`LandingCTA.tsx` and `v2/LandingCTAV2.tsx`)
- Replace `WaitlistSignup` component with a simple "Get Started" button that links to `/auth`

### 6. Landing CTA V2 Footer copy
- Keep footer as-is (Privacy, Terms, Contact links)

## Files Modified
- `src/pages/Auth.tsx` -- sign-up tab becomes email/password form
- `src/components/landing/v2/LandingHeroV2.tsx` -- button navigates to /auth
- `src/components/landing/LandingHero.tsx` -- button navigates to /auth
- `src/components/landing/LandingCTA.tsx` -- replace waitlist with CTA button
- `src/components/landing/v2/LandingCTAV2.tsx` -- replace waitlist with CTA button

## Files NOT deleted (kept for potential future use)
- Waitlist-related components (`WaitlistSignup`, `WaitlistEmailInput`, `WaitlistModal`, `WaitlistSuccess`, `WaitlistPhoneInput`, `WaitlistFollowUp`) -- left in codebase but no longer imported
- Admin waitlist tab and edge functions -- kept for managing existing waitlist entries

## Technical Notes
- Auth auto-confirm will be configured via the configure-auth tool
- The existing `handle_new_user` trigger already creates a profile row on signup, so no database changes needed
- Referral code capture logic in Auth.tsx will be preserved

