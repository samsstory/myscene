

# Email Notifications via Resend on Waitlist Approval

## Overview

When an admin approves a waitlist entry, a welcome email will automatically be sent to the user's new email address via Resend, informing them their account is ready.

## Setup

You'll need a **Resend API key** (free tier: 100 emails/day, no business entity required):
1. Sign up at [resend.com](https://resend.com)
2. Go to API Keys and create one
3. You'll be prompted to paste it into Lovable

## Changes

### 1. Add Secret
- `RESEND_API_KEY` -- stored securely, accessible from the backend function

### 2. Update `approve-waitlist` Edge Function

After the existing user creation and waitlist status update, the function will:
- Read `RESEND_API_KEY` from environment
- Send a welcome email via `POST https://api.resend.com/emails` with:
  - **From**: `onboarding@resend.dev` (Resend's free shared sender -- no domain verification needed to start)
  - **To**: the email provided during approval
  - **Subject**: "You're in! Your Scene beta access is ready"
  - **Body**: HTML email with login credentials and a link to the app
- Update `notified_at` on the waitlist row
- Include `{ notified: true/false }` in the response
- SMS/email failure is logged but does not block the approval

### 3. Update Admin UI

**WaitlistTab.tsx**:
- Add a "Notified" column showing a checkmark icon and timestamp when `notified_at` is present

**ApproveModal.tsx**:
- Update the success toast to mention that a welcome email was sent

### 4. No Database Migration Needed

The `notified_at` column already exists on the `waitlist` table.

